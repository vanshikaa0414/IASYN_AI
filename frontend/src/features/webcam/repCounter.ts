import { AttemptDetail, AttemptOutcome } from '../../types/assessment';

export type ExercisePhase = 'WAITING' | 'KNEE BENT' | 'EXTENDING' | 'KNEE EXTENDED' | 'RETURNING';

export interface RepetitionRecord {
  repNumber: number;
  maxAngle: number;
  minAngle: number;
  durationSeconds: number;
  holdDurationSeconds: number;
  reachedFullExtension: boolean;
  trunkLeanMax: number;
  timestampMs: number;
}

export interface IncompleteAttemptRecord {
  attemptNumber: number;
  maxAngleAchieved?: number;
  maxAngle: number;
  minAngle?: number;
  durationSeconds?: number;
  reason: string;
  timestampMs: number;
}

export interface RepetitionCounterConfig {
  restThreshold: number;          // Angle in degrees below which knee is considered resting/bent (default 115°)
  initiateThreshold: number;      // Angle in degrees indicating movement initiation (default 125°)
  extensionThreshold: number;     // Minimal extension threshold to pass movement criterion (default 150°)
  fullExtensionTarget: number;    // Target optimal terminal extension (default 168°)
  returnHysteresis: number;       // Angle in degrees below which leg starts returning (default 142°)
  minHoldDurationSeconds: number; // Minimum hold duration at extension (default 0.25s)
  minRepDurationSeconds: number;  // Minimum total repetition duration (default 0.8s)
  maxRepDurationSeconds: number;  // Maximum plausible repetition duration (default 8.5s)
  maxTrunkLeanDeg: number;        // Maximum allowable trunk lean compensation (default 18°)
  minConfidence: number;          // Tracking confidence cutoff (default 0.40)
}

export const DEFAULT_REPETITION_CONFIG: RepetitionCounterConfig = {
  restThreshold: 115,
  initiateThreshold: 125,
  extensionThreshold: 150,
  fullExtensionTarget: 168,
  returnHysteresis: 142,
  minHoldDurationSeconds: 0.25,
  minRepDurationSeconds: 0.8,
  maxRepDurationSeconds: 8.5,
  maxTrunkLeanDeg: 18.0,
  minConfidence: 0.40,
};

export class RepetitionCounter {
  public readonly config: RepetitionCounterConfig;

  private phase: ExercisePhase = 'WAITING';
  private repCount: number = 0; // Valid completed repetitions (PASS)
  private currentRepMaxAngle: number = 0;
  private currentRepMinAngle: number = 180;
  private currentRepTrunkLeanMax: number = 0;
  private repStartTimeMs: number = 0;
  private extendedEnterTimeMs: number = 0;
  private sessionStartTimeMs: number = 0;

  // Attempt tracking collections
  private attempts: AttemptDetail[] = [];
  private passedAttempts: number = 0;
  private failedAttempts: number = 0;
  private unassessableAttempts: number = 0;

  // Tracking quality & interruptions
  private trackingInterruptionCount: number = 0;
  private lastValidTimestampMs: number = 0;
  private framesWithLowConfidenceInCurrentAttempt: number = 0;

  // Session extrema
  private sessionMinAngle: number = 180;
  private sessionMaxAngle: number = 0;

  constructor(customConfig: Partial<RepetitionCounterConfig> = {}) {
    this.config = { ...DEFAULT_REPETITION_CONFIG, ...customConfig };
    this.reset();
  }

  processFrame(
    angle: number,
    trunkAngle: number,
    confidence: number,
    timestampMs: number
  ): {
    phase: ExercisePhase;
    repCount: number;
    totalAttempts: number;
    passedAttempts: number;
    failedAttempts: number;
    unassessableAttempts: number;
    movementPassRate: number | null;
    newAttemptRecorded: boolean;
    newRepCompleted: boolean;
    newIncompleteRecorded: boolean;
    lastAttemptOutcome?: AttemptOutcome;
    currentRepMaxAngle: number;
    extensionProgress: number;
    sessionMinAngle: number;
    sessionMaxAngle: number;
    trackingInterruptions: number;
  } {
    if (this.sessionStartTimeMs === 0) {
      this.sessionStartTimeMs = timestampMs;
    }

    let newAttemptRecorded = false;
    let lastOutcome: AttemptOutcome | undefined;

    // Handle low confidence frame
    if (confidence < this.config.minConfidence || isNaN(angle)) {
      if (this.phase === 'EXTENDING' || this.phase === 'KNEE EXTENDED' || this.phase === 'RETURNING') {
        this.framesWithLowConfidenceInCurrentAttempt += 1;

        // If tracking lost for > 1.2s during active movement attempt, finalize as UNABLE_TO_ASSESS
        if (this.lastValidTimestampMs > 0 && timestampMs - this.lastValidTimestampMs > 1200) {
          this.trackingInterruptionCount += 1;
          const startSec = Math.max(0, (this.repStartTimeMs - this.sessionStartTimeMs) / 1000);
          const endSec = Math.max(startSec + 0.5, (timestampMs - this.sessionStartTimeMs) / 1000);
          
          this.recordAttempt({
            outcome: 'UNABLE_TO_ASSESS',
            start_time: round1(startSec),
            end_time: round1(endSec),
            min_knee_angle: round1(this.currentRepMinAngle === 180 ? 90.0 : this.currentRepMinAngle),
            max_knee_angle: round1(this.currentRepMaxAngle === 0 ? 90.0 : this.currentRepMaxAngle),
            range_of_motion: round1(Math.max(0, (this.currentRepMaxAngle || 90) - (this.currentRepMinAngle || 90))),
            extension_duration: round1(Math.max(0, (this.extendedEnterTimeMs ? (this.extendedEnterTimeMs - this.repStartTimeMs) : (timestampMs - this.repStartTimeMs)) / 1000)),
            return_duration: 0.0,
            dwell_duration: 0.0,
            trunk_lean_max: round1(this.currentRepTrunkLeanMax),
            tracking_quality: 'Insufficient Confidence (< 40%)',
            deviations: ['Severe tracking loss / occlusion during active movement cycle'],
          });

          newAttemptRecorded = true;
          lastOutcome = 'UNABLE_TO_ASSESS';
          this.phase = 'WAITING';
        }
      }

      return {
        phase: this.phase,
        repCount: this.repCount,
        totalAttempts: this.attempts.length,
        passedAttempts: this.passedAttempts,
        failedAttempts: this.failedAttempts,
        unassessableAttempts: this.unassessableAttempts,
        movementPassRate: this.getMovementPassRate(),
        newAttemptRecorded,
        newRepCompleted: newAttemptRecorded && lastOutcome === 'PASS',
        newIncompleteRecorded: newAttemptRecorded && lastOutcome === 'FAIL',
        lastAttemptOutcome: lastOutcome,
        currentRepMaxAngle: this.currentRepMaxAngle,
        extensionProgress: this.calculateExtensionProgress(angle),
        sessionMinAngle: this.sessionMinAngle === 180 ? 90.0 : this.sessionMinAngle,
        sessionMaxAngle: this.sessionMaxAngle === 0 ? 90.0 : this.sessionMaxAngle,
        trackingInterruptions: this.trackingInterruptionCount,
      };
    }

    this.lastValidTimestampMs = timestampMs;

    // Track overall session extrema
    if (angle > this.sessionMaxAngle) this.sessionMaxAngle = angle;
    if (angle < this.sessionMinAngle) this.sessionMinAngle = angle;

    // Track extrema within the active movement attempt
    if (angle > this.currentRepMaxAngle) this.currentRepMaxAngle = angle;
    if (angle < this.currentRepMinAngle) this.currentRepMinAngle = angle;
    if (trunkAngle > this.currentRepTrunkLeanMax) this.currentRepTrunkLeanMax = trunkAngle;

    // Finite-State Machine with Hysteresis
    switch (this.phase) {
      case 'WAITING':
        if (angle <= this.config.restThreshold) {
          this.phase = 'KNEE BENT';
        } else if (angle > this.config.initiateThreshold) {
          // Direct movement initiation
          this.initiateAttempt(angle, trunkAngle, timestampMs);
        }
        break;

      case 'KNEE BENT':
        if (angle > this.config.initiateThreshold) {
          this.initiateAttempt(angle, trunkAngle, timestampMs);
        }
        break;

      case 'EXTENDING':
        if (angle >= this.config.extensionThreshold) {
          this.phase = 'KNEE EXTENDED';
          this.extendedEnterTimeMs = timestampMs;
        } else if (angle <= this.config.restThreshold) {
          // Attempt dropped back before reaching extension threshold -> FAIL (Incomplete Extension)
          const startSec = Math.max(0, (this.repStartTimeMs - this.sessionStartTimeMs) / 1000);
          const endSec = Math.max(startSec + 0.3, (timestampMs - this.sessionStartTimeMs) / 1000);
          const extDur = (timestampMs - this.repStartTimeMs) / 1000;

          // Only record if it was an actual discernible attempt (> 0.4s and moved > 10°)
          if (extDur >= 0.4 && this.currentRepMaxAngle >= this.config.initiateThreshold) {
            const deviations = [
              `Incomplete extension: reached ${round1(this.currentRepMaxAngle)}° (target ≥${this.config.extensionThreshold}°)`
            ];
            if (this.currentRepTrunkLeanMax > this.config.maxTrunkLeanDeg) {
              deviations.push(`Excessive trunk lean compensation: ${round1(this.currentRepTrunkLeanMax)}° (limit <${this.config.maxTrunkLeanDeg}°)`);
            }

            this.recordAttempt({
              outcome: 'FAIL',
              start_time: round1(startSec),
              end_time: round1(endSec),
              min_knee_angle: round1(this.currentRepMinAngle),
              max_knee_angle: round1(this.currentRepMaxAngle),
              range_of_motion: round1(Math.max(0, this.currentRepMaxAngle - this.currentRepMinAngle)),
              extension_duration: round1(extDur),
              return_duration: 0.2,
              dwell_duration: 0.0,
              trunk_lean_max: round1(this.currentRepTrunkLeanMax),
              tracking_quality: 'Good',
              deviations,
            });

            newAttemptRecorded = true;
            lastOutcome = 'FAIL';
          }

          this.phase = 'KNEE BENT';
          this.resetAttemptVars(angle);
        }
        break;

      case 'KNEE EXTENDED':
        if (angle < this.config.returnHysteresis) {
          this.phase = 'RETURNING';
        }
        break;

      case 'RETURNING':
        if (angle <= this.config.restThreshold) {
          const totalDuration = Math.max(0.1, (timestampMs - this.repStartTimeMs) / 1000);
          const extDuration = Math.max(0.1, (this.extendedEnterTimeMs - this.repStartTimeMs) / 1000);
          const dwellDuration = Math.max(0.0, (timestampMs - this.extendedEnterTimeMs - (totalDuration - extDuration) * 1000) / 1000);
          const returnDuration = Math.max(0.1, totalDuration - extDuration);

          const startSec = Math.max(0, (this.repStartTimeMs - this.sessionStartTimeMs) / 1000);
          const endSec = Math.max(startSec + 0.5, (timestampMs - this.sessionStartTimeMs) / 1000);

          // Evaluate movement criteria
          const deviations: string[] = [];
          if (this.currentRepMaxAngle < this.config.extensionThreshold) {
            deviations.push(`Insufficient knee extension: ${round1(this.currentRepMaxAngle)}° < ${this.config.extensionThreshold}°`);
          }
          if (this.currentRepTrunkLeanMax > this.config.maxTrunkLeanDeg) {
            deviations.push(`Excessive trunk lean compensation: ${round1(this.currentRepTrunkLeanMax)}° > ${this.config.maxTrunkLeanDeg}°`);
          }
          if (totalDuration < this.config.minRepDurationSeconds) {
            deviations.push(`Velocity too rapid (${round1(totalDuration)}s < ${this.config.minRepDurationSeconds}s)`);
          }

          const outcome: AttemptOutcome = deviations.length === 0 ? 'PASS' : 'FAIL';

          if (outcome === 'PASS') {
            this.repCount += 1;
          }

          this.recordAttempt({
            outcome,
            start_time: round1(startSec),
            end_time: round1(endSec),
            min_knee_angle: round1(this.currentRepMinAngle),
            max_knee_angle: round1(this.currentRepMaxAngle),
            range_of_motion: round1(Math.max(0, this.currentRepMaxAngle - this.currentRepMinAngle)),
            extension_duration: round1(extDuration),
            return_duration: round1(returnDuration),
            dwell_duration: round1(dwellDuration),
            trunk_lean_max: round1(this.currentRepTrunkLeanMax),
            tracking_quality: 'Optimal',
            deviations,
          });

          newAttemptRecorded = true;
          lastOutcome = outcome;

          this.phase = 'KNEE BENT';
          this.resetAttemptVars(angle);
        } else if (angle >= this.config.extensionThreshold) {
          // Reversed upward before returning to rest
          this.phase = 'KNEE EXTENDED';
          this.extendedEnterTimeMs = timestampMs;
        }
        break;
    }

    return {
      phase: this.phase,
      repCount: this.repCount,
      totalAttempts: this.attempts.length,
      passedAttempts: this.passedAttempts,
      failedAttempts: this.failedAttempts,
      unassessableAttempts: this.unassessableAttempts,
      movementPassRate: this.getMovementPassRate(),
      newAttemptRecorded,
      newRepCompleted: newAttemptRecorded && lastOutcome === 'PASS',
      newIncompleteRecorded: newAttemptRecorded && lastOutcome === 'FAIL',
      lastAttemptOutcome: lastOutcome,
      currentRepMaxAngle: this.currentRepMaxAngle,
      extensionProgress: this.calculateExtensionProgress(angle),
      sessionMinAngle: this.sessionMinAngle === 180 ? 90.0 : round1(this.sessionMinAngle),
      sessionMaxAngle: this.sessionMaxAngle === 0 ? 90.0 : round1(this.sessionMaxAngle),
      trackingInterruptions: this.trackingInterruptionCount,
    };
  }

  private initiateAttempt(angle: number, trunkAngle: number, timestampMs: number) {
    this.phase = 'EXTENDING';
    this.repStartTimeMs = timestampMs;
    this.currentRepMaxAngle = angle;
    this.currentRepMinAngle = angle;
    this.currentRepTrunkLeanMax = trunkAngle;
    this.framesWithLowConfidenceInCurrentAttempt = 0;
  }

  private resetAttemptVars(angle: number) {
    this.currentRepMaxAngle = angle;
    this.currentRepMinAngle = angle;
    this.currentRepTrunkLeanMax = 0;
    this.extendedEnterTimeMs = 0;
    this.framesWithLowConfidenceInCurrentAttempt = 0;
  }

  private recordAttempt(att: Omit<AttemptDetail, 'attempt_number'>) {
    const attempt_number = this.attempts.length + 1;
    const fullAttempt: AttemptDetail = {
      attempt_number,
      ...att,
    };
    this.attempts.push(fullAttempt);

    if (att.outcome === 'PASS') {
      this.passedAttempts += 1;
    } else if (att.outcome === 'FAIL') {
      this.failedAttempts += 1;
    } else {
      this.unassessableAttempts += 1;
    }
  }

  /**
   * Movement Criteria Pass Rate = Passed Attempts / (Passed Attempts + Failed Attempts) * 100
   * Excludes unassessable attempts from the denominator.
   * If there are no assessable attempts, returns null (displayed as N/A).
   */
  getMovementPassRate(): number | null {
    const assessable = this.passedAttempts + this.failedAttempts;
    if (assessable === 0) return null;
    return round1((this.passedAttempts / assessable) * 100.0);
  }

  calculateExtensionProgress(angle: number): number {
    const minRef = 90.0;
    const targetRef = this.config.fullExtensionTarget;
    if (angle <= minRef) return 0;
    if (angle >= targetRef) return 100;
    return Math.min(100, Math.max(0, Math.round(((angle - minRef) / (targetRef - minRef)) * 100)));
  }

  getRepCount(): number {
    return this.repCount;
  }

  getAttempts(): AttemptDetail[] {
    return this.attempts;
  }

  getPassedAttempts(): number {
    return this.passedAttempts;
  }

  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  getUnassessableAttempts(): number {
    return this.unassessableAttempts;
  }

  getTotalAttempts(): number {
    return this.attempts.length;
  }

  getPhase(): ExercisePhase {
    return this.phase;
  }

  getTrackingInterruptions(): number {
    return this.trackingInterruptionCount;
  }

  getSessionExtrema(): { min: number; max: number; rom: number } {
    const min = this.sessionMinAngle === 180 ? 90.0 : round1(this.sessionMinAngle);
    const max = this.sessionMaxAngle === 0 ? 90.0 : round1(this.sessionMaxAngle);
    const rom = Math.max(0, round1(max - min));
    return { min, max, rom };
  }

  update(angle: number, timestampMs: number, confidence: number = 1.0, trunkAngle: number = 0) {
    return this.processFrame(angle, trunkAngle, confidence, timestampMs);
  }

  getCompletedReps(): RepetitionRecord[] {
    return this.attempts
      .filter((a) => a.outcome === 'PASS')
      .map((a, idx) => ({
        repNumber: idx + 1,
        maxAngle: a.max_knee_angle ?? a.max_angle ?? 0,
        minAngle: a.min_knee_angle ?? a.min_angle ?? 0,
        durationSeconds: (a.extension_duration || 0) + (a.return_duration || 0),
        holdDurationSeconds: a.dwell_duration || 0,
        reachedFullExtension: true,
        trunkLeanMax: a.trunk_lean_max || 0,
        timestampMs: (a.start_time || 0) * 1000,
      }));
  }

  getIncompleteAttempts(): IncompleteAttemptRecord[] {
    return this.attempts
      .filter((a) => a.outcome === 'FAIL')
      .map((a) => {
        const maxA = a.max_knee_angle ?? a.max_angle ?? 0;
        return {
          attemptNumber: a.attempt_number,
          maxAngleAchieved: maxA,
          maxAngle: maxA,
          minAngle: a.min_knee_angle ?? a.min_angle ?? 0,
          durationSeconds: (a.extension_duration || 0) + (a.return_duration || 0),
          reason: a.deviations && a.deviations.length > 0 ? a.deviations.join(', ') : 'Criteria not met',
          timestampMs: (a.start_time || 0) * 1000,
        };
      });
  }

  getIncompleteCount(): number {
    return this.failedAttempts;
  }

  reset() {
    this.phase = 'WAITING';
    this.repCount = 0;
    this.currentRepMaxAngle = 0;
    this.currentRepMinAngle = 180;
    this.currentRepTrunkLeanMax = 0;
    this.repStartTimeMs = 0;
    this.extendedEnterTimeMs = 0;
    this.sessionStartTimeMs = 0;
    this.attempts = [];
    this.passedAttempts = 0;
    this.failedAttempts = 0;
    this.unassessableAttempts = 0;
    this.trackingInterruptionCount = 0;
    this.lastValidTimestampMs = 0;
    this.framesWithLowConfidenceInCurrentAttempt = 0;
    this.sessionMinAngle = 180;
    this.sessionMaxAngle = 0;
  }
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}
