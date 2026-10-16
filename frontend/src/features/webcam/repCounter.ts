export type ExercisePhase = 'WAITING' | 'KNEE BENT' | 'EXTENDING' | 'KNEE EXTENDED' | 'RETURNING';

export interface RepetitionRecord {
  repNumber: number;
  maxAngle: number;
  minAngle: number;
  durationSeconds: number;
  reachedFullExtension: boolean;
  trunkLeanMax: number;
}

export class RepetitionCounter {
  // Configurable thresholds with hysteresis
  public readonly restThreshold: number = 115;      // Must return below 115° to complete a rep
  public readonly extensionThreshold: number = 150; // Must cross 150° to count as extended
  public readonly fullExtensionTarget: number = 168;// Target optimal terminal extension
  public readonly minRepDurationSeconds: number = 0.8; // Filter out rapid tremor/jitter spikes

  private phase: ExercisePhase = 'WAITING';
  private repCount: number = 0;
  private currentRepMaxAngle: number = 0;
  private currentRepMinAngle: number = 180;
  private currentRepTrunkLeanMax: number = 0;
  private repStartTime: number = 0;
  private completedReps: RepetitionRecord[] = [];

  // Overall session extrema
  private sessionMinAngle: number = 180;
  private sessionMaxAngle: number = 0;

  constructor() {
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
    newRepCompleted: boolean;
    currentRepMaxAngle: number;
    extensionProgress: number;
    sessionMinAngle: number;
    sessionMaxAngle: number;
  } {
    // Reject tracking frames if confidence is too low (< 0.40)
    if (confidence < 0.40) {
      return {
        phase: this.phase,
        repCount: this.repCount,
        newRepCompleted: false,
        currentRepMaxAngle: this.currentRepMaxAngle,
        extensionProgress: this.calculateExtensionProgress(angle),
        sessionMinAngle: this.sessionMinAngle === 180 ? 90.0 : this.sessionMinAngle,
        sessionMaxAngle: this.sessionMaxAngle === 0 ? 90.0 : this.sessionMaxAngle,
      };
    }

    let newRepCompleted = false;

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
        if (angle <= this.restThreshold) {
          this.phase = 'KNEE BENT';
        } else if (angle > 125) {
          // Started movement from resting position
          this.phase = 'EXTENDING';
          this.repStartTime = timestampMs;
          this.currentRepMaxAngle = angle;
          this.currentRepMinAngle = angle;
          this.currentRepTrunkLeanMax = trunkAngle;
        }
        break;

      case 'KNEE BENT':
        if (angle > 125) {
          this.phase = 'EXTENDING';
          this.repStartTime = timestampMs;
          this.currentRepMaxAngle = angle;
          this.currentRepMinAngle = angle;
          this.currentRepTrunkLeanMax = trunkAngle;
        }
        break;

      case 'EXTENDING':
        if (angle >= this.extensionThreshold) {
          this.phase = 'KNEE EXTENDED';
        } else if (angle <= this.restThreshold) {
          // Aborted kick without reaching extension threshold
          this.phase = 'KNEE BENT';
          this.currentRepMaxAngle = angle;
        }
        break;

      case 'KNEE EXTENDED':
        if (angle < 142) {
          // Began eccentric return descent
          this.phase = 'RETURNING';
        }
        break;

      case 'RETURNING':
        if (angle <= this.restThreshold) {
          const duration = Math.max(0.1, (timestampMs - this.repStartTime) / 1000);

          // Verify minimal duration to avoid single-frame tracking noise
          if (duration >= this.minRepDurationSeconds) {
            this.repCount += 1;
            newRepCompleted = true;

            this.completedReps.push({
              repNumber: this.repCount,
              maxAngle: Math.round(this.currentRepMaxAngle * 10) / 10,
              minAngle: Math.round(this.currentRepMinAngle * 10) / 10,
              durationSeconds: Math.round(duration * 10) / 10,
              reachedFullExtension: this.currentRepMaxAngle >= this.fullExtensionTarget,
              trunkLeanMax: Math.round(this.currentRepTrunkLeanMax * 10) / 10,
            });
          }

          // Reset for next repetition
          this.phase = 'KNEE BENT';
          this.currentRepMaxAngle = angle;
          this.currentRepMinAngle = angle;
          this.currentRepTrunkLeanMax = 0;
        } else if (angle >= this.extensionThreshold) {
          // Patient reversed movement back up before reaching rest
          this.phase = 'KNEE EXTENDED';
        }
        break;
    }

    return {
      phase: this.phase,
      repCount: this.repCount,
      newRepCompleted,
      currentRepMaxAngle: this.currentRepMaxAngle,
      extensionProgress: this.calculateExtensionProgress(angle),
      sessionMinAngle: this.sessionMinAngle === 180 ? 90.0 : Math.round(this.sessionMinAngle * 10) / 10,
      sessionMaxAngle: this.sessionMaxAngle === 0 ? 90.0 : Math.round(this.sessionMaxAngle * 10) / 10,
    };
  }

  /**
   * Calculates extension progress (0% to 100%) toward the target angle (168°),
   * benchmarked from 90° resting flexion.
   */
  calculateExtensionProgress(angle: number): number {
    const minRef = 90.0;
    const targetRef = this.fullExtensionTarget; // 168°
    if (angle <= minRef) return 0;
    if (angle >= targetRef) return 100;
    return Math.min(100, Math.max(0, Math.round(((angle - minRef) / (targetRef - minRef)) * 100)));
  }

  getRepCount(): number {
    return this.repCount;
  }

  getCompletedReps(): RepetitionRecord[] {
    return this.completedReps;
  }

  getPhase(): ExercisePhase {
    return this.phase;
  }

  getSessionExtrema(): { min: number; max: number; rom: number } {
    const min = this.sessionMinAngle === 180 ? 90.0 : Math.round(this.sessionMinAngle * 10) / 10;
    const max = this.sessionMaxAngle === 0 ? 90.0 : Math.round(this.sessionMaxAngle * 10) / 10;
    const rom = Math.max(0, Math.round((max - min) * 10) / 10);
    return { min, max, rom };
  }

  reset() {
    this.phase = 'WAITING';
    this.repCount = 0;
    this.currentRepMaxAngle = 0;
    this.currentRepMinAngle = 180;
    this.currentRepTrunkLeanMax = 0;
    this.repStartTime = 0;
    this.completedReps = [];
    this.sessionMinAngle = 180;
    this.sessionMaxAngle = 0;
  }
}
