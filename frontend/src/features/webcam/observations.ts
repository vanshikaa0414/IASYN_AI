import { RepetitionRecord, IncompleteAttemptRecord } from './repCounter';

export type AssessmentStatus = 'Meets configured criteria' | 'Needs improvement' | 'Unable to assess';

export interface MovementDeviation {
  repNumber?: number;
  type: 'Incomplete Extension' | 'Incomplete Return' | 'Excessive Trunk Lean' | 'Unstable Trajectory' | 'Insufficient Tracking';
  description: string;
  measuredValue: number;
  threshold: number;
}

import { AttemptDetail } from '../../types/assessment';

export interface SessionAssessmentSummary {
  repetitionCount: number;
  incompleteAttemptsCount: number;
  totalAttempts?: number;
  passedAttempts?: number;
  failedAttempts?: number;
  unassessableAttempts?: number;
  movementPassRate?: number | null;
  attempts?: AttemptDetail[];
  configuredCriteria?: Record<string, any>;
  minKneeAngle: number;
  maxKneeAngle: number;
  rangeOfMotion: number;
  avgRepDuration: number;
  avgHoldDuration: number;
  maxTrunkLean: number;
  trackingQuality: string;
  trackingConfidencePct: number;
  observations: string[];
  deviations: MovementDeviation[];
  assessmentStatus: AssessmentStatus;
  clinicalGuidance: string;
}

export interface LivePostureCheck {
  trunkStable: boolean;
  trunkAngle: number;
  extensionReached: boolean;
  returnReached: boolean;
  trackingReliable: boolean;
  liveFeedback: string;
}

export interface TrajectoryPoint {
  timeSec: number;
  angle: number;
  rawAngle?: number;
  trunkAngle: number;
  phase: string;
  landmarks?: { x: number; y: number; visibility?: number }[];
}

export interface VideoAnalysisResult {
  videoName: string;
  durationSeconds: number;
  validReps: RepetitionRecord[];
  incompleteAttempts: IncompleteAttemptRecord[];
  minKneeAngle: number;
  maxKneeAngle: number;
  rangeOfMotion: number;
  avgRepDuration: number;
  avgHoldDuration: number;
  maxTrunkLean: number;
  trackingQualityScore: number; // 0 to 1
  trackingQualityText: string;
  trajectory: TrajectoryPoint[];
  assessmentStatus: AssessmentStatus;
  summary: SessionAssessmentSummary;
  monitoredLeg: 'right' | 'left';
}

export interface MetricComparisonItem {
  metric: string;
  referenceValue: string | number;
  testValue: string | number;
  differenceText: string;
  status: 'match' | 'minor-diff' | 'deviation' | 'unassessed';
}

export interface VideoComparisonResult {
  referenceResult: VideoAnalysisResult;
  testResult: VideoAnalysisResult;
  comparisonStatus: AssessmentStatus;
  metricComparisons: MetricComparisonItem[];
  observedDeviations: MovementDeviation[];
  clinicalGuidance: string;
  normalizedTrajectory: {
    progressPct: number;
    referenceAngle: number | null;
    testAngle: number | null;
    angleDelta: number | null;
  }[];
  isReferenceReliable: boolean;
  isTestReliable: boolean;
}

/**
 * Real-time per-frame posture evaluator.
 */
export function evaluateLivePosture(
  kneeAngle: number,
  trunkAngle: number,
  confidence: number,
  targetExtension: number = 168,
  restThreshold: number = 115,
  maxTrunkLean: number = 18
): LivePostureCheck {
  const trackingReliable = confidence >= 0.40;
  const trunkStable = trunkAngle <= maxTrunkLean;
  const extensionReached = kneeAngle >= targetExtension;
  const returnReached = kneeAngle <= restThreshold;

  let liveFeedback = 'Tracking posture...';
  if (!trackingReliable) {
    liveFeedback = 'Tracking temporarily unavailable — reposition camera in side profile view.';
  } else if (!trunkStable) {
    liveFeedback = `Excessive trunk lean (~${Math.round(trunkAngle)}°). Maintain upright posture.`;
  } else if (kneeAngle > 155 && !extensionReached) {
    liveFeedback = `Approaching extension (${Math.round(kneeAngle)}°); aim for terminal squeeze (≥${targetExtension}°).`;
  } else if (extensionReached) {
    liveFeedback = `Target extension achieved (${Math.round(kneeAngle)}°)! Hold briefly and return smoothly.`;
  } else if (returnReached) {
    liveFeedback = 'Seated rest position. Ready for next extension repetition.';
  } else {
    liveFeedback = 'Smooth extension movement in progress.';
  }

  return {
    trunkStable,
    trunkAngle,
    extensionReached,
    returnReached,
    trackingReliable,
    liveFeedback,
  };
}

/**
 * Analyzes session movement metrics and determines clinical observations.
 */
export function analyzeSessionObservations(
  reps: RepetitionRecord[],
  overallTrackingConfidence: number,
  sessionDurationSeconds: number,
  fallbackAngleExtrema?: { min: number; max: number; rom?: number },
  incompleteAttempts: IncompleteAttemptRecord[] = [],
  attempts: AttemptDetail[] = [],
  configuredCriteria: Record<string, any> = {
    min_extension_angle: 150.0,
    max_starting_angle: 105.0,
    min_hold_seconds: 0.5,
    max_trunk_compensation_deg: 18.0
  }
): SessionAssessmentSummary {
  const observations: string[] = [];
  const deviations: MovementDeviation[] = [];
  const confidencePct = Math.round(overallTrackingConfidence * 100);

  // Attempt outcome breakdown
  const passedCount = attempts.filter((a) => a.outcome === 'PASS').length;
  const failedCount = attempts.filter((a) => a.outcome === 'FAIL').length;
  const unassessableCount = attempts.filter((a) => a.outcome === 'UNABLE_TO_ASSESS').length;
  const totalAttempts = attempts.length;
  const assessableCount = passedCount + failedCount;
  const movementPassRate = assessableCount > 0 ? Math.round((passedCount / assessableCount) * 1000) / 10 : null;

  // Case 1: Tracking quality insufficient
  if (overallTrackingConfidence < 0.40) {
    observations.push('Tracking quality was insufficient to reliably assess movement.');
    observations.push('Ensure the patient is in lateral profile view with visible hip, knee, and ankle joints in good lighting.');
    deviations.push({
      type: 'Insufficient Tracking',
      description: `Average tracking confidence was ${confidencePct}% (minimum required: 40%).`,
      measuredValue: confidencePct,
      threshold: 40,
    });

    return {
      repetitionCount: passedCount > 0 ? passedCount : reps.length,
      incompleteAttemptsCount: incompleteAttempts.length,
      totalAttempts,
      passedAttempts: passedCount,
      failedAttempts: failedCount,
      unassessableAttempts: unassessableCount,
      movementPassRate,
      attempts,
      configuredCriteria,
      minKneeAngle: fallbackAngleExtrema?.min || 90.0,
      maxKneeAngle: fallbackAngleExtrema?.max || 90.0,
      rangeOfMotion: fallbackAngleExtrema?.rom || 0,
      avgRepDuration: 0,
      avgHoldDuration: 0,
      maxTrunkLean: 0,
      trackingQuality: `Insufficient (${confidencePct}% Confidence)`,
      trackingConfidencePct: confidencePct,
      observations,
      deviations,
      assessmentStatus: 'Unable to assess',
      clinicalGuidance: 'Please position the camera at knee height perpendicular to your seated position and retry.',
    };
  }

  // Case 2: Zero valid repetitions completed
  if (reps.length === 0) {
    observations.push('No valid repetitions were completed during this assessment window.');
    if (incompleteAttempts.length > 0) {
      observations.push(`${incompleteAttempts.length} incomplete attempt(s) detected where movement reversed before reaching full extension.`);
      incompleteAttempts.forEach((att) => {
        observations.push(`Attempt ${att.attemptNumber}: Peak angle ${att.maxAngle}° (${att.reason}).`);
        deviations.push({
          type: 'Incomplete Extension',
          description: att.reason,
          measuredValue: att.maxAngle,
          threshold: 150,
        });
      });
    } else {
      observations.push('Ensure leg completes both the upward extension (≥150°) and return (≤115°) movement phases.');
    }

    const minAngle = fallbackAngleExtrema?.min || 90.0;
    const maxAngle = fallbackAngleExtrema?.max || 90.0;
    const rom = Math.max(0, Math.round((maxAngle - minAngle) * 10) / 10);

    return {
      repetitionCount: passedCount,
      incompleteAttemptsCount: incompleteAttempts.length,
      totalAttempts,
      passedAttempts: passedCount,
      failedAttempts: failedCount,
      unassessableAttempts: unassessableCount,
      movementPassRate,
      attempts,
      configuredCriteria,
      minKneeAngle: minAngle,
      maxKneeAngle: maxAngle,
      rangeOfMotion: rom,
      avgRepDuration: 0,
      avgHoldDuration: 0,
      maxTrunkLean: 0,
      trackingQuality: `${confidencePct}% Confidence`,
      trackingConfidencePct: confidencePct,
      observations,
      deviations,
      assessmentStatus: 'Needs improvement',
      clinicalGuidance: 'Review the starting position and extend the lower leg toward the physiotherapist-approved target without forcing the knee.',
    };
  }

  // Multi-rep session analysis
  const maxAngles = reps.map((r) => r.maxAngle);
  const minAngles = reps.map((r) => r.minAngle);
  const durations = reps.map((r) => r.durationSeconds);
  const holdDurations = reps.map((r) => r.holdDurationSeconds);
  const trunkLeans = reps.map((r) => r.trunkLeanMax);

  const overallMin = Math.min(...minAngles);
  const overallMax = Math.max(...maxAngles);
  const rom = Math.round((overallMax - overallMin) * 10) / 10;
  const avgDuration = Math.round((durations.reduce((a, b) => a + b, 0) / reps.length) * 10) / 10;
  const avgHold = Math.round((holdDurations.reduce((a, b) => a + b, 0) / reps.length) * 10) / 10;
  const peakTrunkLean = Math.max(...trunkLeans);

  const fullExtensionTarget = 168;
  const fullExtensionCount = reps.filter((r) => r.maxAngle >= fullExtensionTarget).length;
  const fullExtensionPct = Math.round((fullExtensionCount / reps.length) * 100);

  // Per-repetition detailed checks
  reps.forEach((rep) => {
    if (rep.maxAngle < 160) {
      deviations.push({
        repNumber: rep.repNumber,
        type: 'Incomplete Extension',
        description: `During repetition ${rep.repNumber}, observed knee extension reached ${rep.maxAngle}°, stopping below configured target (≥${fullExtensionTarget}°).`,
        measuredValue: rep.maxAngle,
        threshold: fullExtensionTarget,
      });
    }
    if (rep.minAngle > 115) {
      deviations.push({
        repNumber: rep.repNumber,
        type: 'Incomplete Return',
        description: `During repetition ${rep.repNumber}, knee did not return toward resting flexion (reached ${rep.minAngle}°, expected ≤115°).`,
        measuredValue: rep.minAngle,
        threshold: 115,
      });
    }
    if (rep.trunkLeanMax > 18) {
      deviations.push({
        repNumber: rep.repNumber,
        type: 'Excessive Trunk Lean',
        description: `During repetition ${rep.repNumber}, trunk backward lean was ${rep.trunkLeanMax}° (threshold: 18°), indicating pelvic compensation.`,
        measuredValue: rep.trunkLeanMax,
        threshold: 18,
      });
    }
  });

  // Also include incomplete attempts if any
  if (incompleteAttempts.length > 0) {
    observations.push(`${incompleteAttempts.length} incomplete attempt(s) were observed during the session.`);
    incompleteAttempts.forEach((att) => {
      deviations.push({
        type: 'Incomplete Extension',
        description: `Incomplete attempt: ${att.reason}`,
        measuredValue: att.maxAngle,
        threshold: 150,
      });
    });
  }

  // Summary observations
  if (fullExtensionPct >= 80) {
    observations.push(`Target terminal knee extension (≥${fullExtensionTarget}°) achieved on ${fullExtensionCount} of ${reps.length} repetitions (${fullExtensionPct}%).`);
  } else if (overallMax >= 150) {
    observations.push(`Observed knee extension reached moderate angles (peak: ${overallMax}°), but did not reach the configured reference angle (≥${fullExtensionTarget}°).`);
  } else {
    observations.push(`Observed knee extension did not reach the configured reference angle (peak: ${overallMax}°).`);
  }

  const avgMin = Math.round(minAngles.reduce((a, b) => a + b, 0) / reps.length);
  if (avgMin <= 112) {
    observations.push('Appropriate return movement to 90° seated flexion demonstrated between repetitions.');
  } else {
    observations.push(`Return movement did not fully reach the configured starting range (resting average: ${avgMin}°, expected ≤115°).`);
  }

  if (peakTrunkLean > 18) {
    observations.push(`Excessive trunk movement was observed during the exercise (peak tilt ~${peakTrunkLean}°, threshold: 18°).`);
  } else {
    observations.push('Upright seated spinal posture maintained with minimal compensatory trunk inclination.');
  }

  // Tracking quality label
  let trackingQuality = 'Optimal';
  if (overallTrackingConfidence >= 0.80) {
    trackingQuality = `Optimal (${confidencePct}% Confidence)`;
  } else if (overallTrackingConfidence >= 0.60) {
    trackingQuality = `Good (${confidencePct}% Confidence)`;
  } else {
    trackingQuality = `Fair (${confidencePct}% Confidence)`;
    observations.push('Minor landmark flutter observed; maintain stable profile camera view.');
  }

  // Final Assessment Status
  let assessmentStatus: AssessmentStatus = 'Meets configured criteria';
  let clinicalGuidance = 'The observed knee movement reached the configured extension and return ranges during the assessed repetitions.';

  if (deviations.length > 0 || fullExtensionPct < 60 || peakTrunkLean > 18 || rom < 55) {
    assessmentStatus = 'Needs improvement';
    clinicalGuidance = 'Review the starting position and extend the lower leg toward the physiotherapist-approved target without forcing the knee.';
  }

  return {
    repetitionCount: passedCount > 0 ? passedCount : reps.length,
    incompleteAttemptsCount: incompleteAttempts.length,
    totalAttempts,
    passedAttempts: passedCount,
    failedAttempts: failedCount,
    unassessableAttempts: unassessableCount,
    movementPassRate,
    attempts,
    configuredCriteria,
    minKneeAngle: overallMin,
    maxKneeAngle: overallMax,
    rangeOfMotion: rom,
    avgRepDuration: avgDuration,
    avgHoldDuration: avgHold,
    maxTrunkLean: peakTrunkLean,
    trackingQuality,
    trackingConfidencePct: confidencePct,
    observations,
    deviations,
    assessmentStatus,
    clinicalGuidance,
  };
}

/**
 * Compares two analyzed exercise videos (Reference vs Test).
 * Analyzes both videos independently first and then computes metric differences and clinical observations.
 */
export function compareVideoAnalyses(
  reference: VideoAnalysisResult,
  test: VideoAnalysisResult
): VideoComparisonResult {
  const isReferenceReliable = reference.trackingQualityScore >= 0.40;
  const isTestReliable = test.trackingQualityScore >= 0.40;

  const metricComparisons: MetricComparisonItem[] = [
    {
      metric: 'Valid Repetitions',
      referenceValue: reference.validReps.length,
      testValue: test.validReps.length,
      differenceText:
        test.validReps.length === reference.validReps.length
          ? 'Same count'
          : `${test.validReps.length - reference.validReps.length > 0 ? '+' : ''}${test.validReps.length - reference.validReps.length} reps`,
      status:
        test.validReps.length >= reference.validReps.length ? 'match' : 'deviation',
    },
    {
      metric: 'Incomplete Attempts',
      referenceValue: reference.incompleteAttempts.length,
      testValue: test.incompleteAttempts.length,
      differenceText:
        test.incompleteAttempts.length === 0
          ? 'None detected'
          : `${test.incompleteAttempts.length} incomplete attempt(s)`,
      status: test.incompleteAttempts.length === 0 ? 'match' : 'deviation',
    },
    {
      metric: 'Maximum Knee Angle (Extension)',
      referenceValue: `${reference.maxKneeAngle}°`,
      testValue: `${test.maxKneeAngle}°`,
      differenceText: `${Math.round((test.maxKneeAngle - reference.maxKneeAngle) * 10) / 10}°`,
      status:
        Math.abs(test.maxKneeAngle - reference.maxKneeAngle) <= 8
          ? 'match'
          : test.maxKneeAngle < reference.maxKneeAngle - 8
          ? 'deviation'
          : 'minor-diff',
    },
    {
      metric: 'Minimum Knee Angle (Resting)',
      referenceValue: `${reference.minKneeAngle}°`,
      testValue: `${test.minKneeAngle}°`,
      differenceText: `${Math.round((test.minKneeAngle - reference.minKneeAngle) * 10) / 10}°`,
      status: test.minKneeAngle <= 115 ? 'match' : 'deviation',
    },
    {
      metric: 'Active Range of Motion (ROM)',
      referenceValue: `${reference.rangeOfMotion}°`,
      testValue: `${test.rangeOfMotion}°`,
      differenceText: `${Math.round((test.rangeOfMotion - reference.rangeOfMotion) * 10) / 10}°`,
      status:
        Math.abs(test.rangeOfMotion - reference.rangeOfMotion) <= 10
          ? 'match'
          : test.rangeOfMotion < reference.rangeOfMotion
          ? 'deviation'
          : 'minor-diff',
    },
    {
      metric: 'Average Repetition Duration',
      referenceValue: `${reference.avgRepDuration}s`,
      testValue: `${test.avgRepDuration}s`,
      differenceText: `${Math.round((test.avgRepDuration - reference.avgRepDuration) * 10) / 10}s`,
      status:
        Math.abs(test.avgRepDuration - reference.avgRepDuration) <= 1.0
          ? 'match'
          : 'minor-diff',
    },
    {
      metric: 'Average Extension Hold Duration',
      referenceValue: `${reference.avgHoldDuration}s`,
      testValue: `${test.avgHoldDuration}s`,
      differenceText: `${Math.round((test.avgHoldDuration - reference.avgHoldDuration) * 10) / 10}s`,
      status:
        test.avgHoldDuration >= 0.25 || reference.avgHoldDuration === 0
          ? 'match'
          : 'minor-diff',
    },
    {
      metric: 'Peak Compensatory Trunk Lean',
      referenceValue: `${reference.maxTrunkLean}°`,
      testValue: `${test.maxTrunkLean}°`,
      differenceText: `${Math.round((test.maxTrunkLean - reference.maxTrunkLean) * 10) / 10}°`,
      status: test.maxTrunkLean <= 18 ? 'match' : 'deviation',
    },
    {
      metric: 'Tracking Quality',
      referenceValue: reference.trackingQualityText,
      testValue: test.trackingQualityText,
      differenceText: isTestReliable ? 'Reliable' : 'Suboptimal',
      status: isTestReliable ? 'match' : 'deviation',
    },
  ];

  // Compile observed deviations specific to the test video
  const observedDeviations = [...test.summary.deviations];

  // Determine comparison status
  let comparisonStatus: AssessmentStatus = 'Meets configured criteria';
  let clinicalGuidance =
    'The observed knee movement in the test recording reached the configured extension and return ranges with steady kinematic control.';

  if (!isTestReliable || !isReferenceReliable) {
    comparisonStatus = 'Unable to assess';
    clinicalGuidance =
      'Tracking quality on one or both recordings was insufficient to perform a reliable comparison. Ensure profile lateral view.';
  } else if (observedDeviations.length > 0 || test.summary.assessmentStatus === 'Needs improvement') {
    comparisonStatus = 'Needs improvement';
    clinicalGuidance =
      'Review the starting position and extend the lower leg toward the physiotherapist-approved target without forcing the knee.';
  }

  // Normalized time-series trajectory (0% to 100% of duration sampled at 50 points)
  const normalizedTrajectory = [];
  const sampleSteps = 50;

  for (let i = 0; i <= sampleSteps; i++) {
    const progressPct = i * 2;
    const refTime = (progressPct / 100) * reference.durationSeconds;
    const testTime = (progressPct / 100) * test.durationSeconds;

    const refPoint = findClosestTrajectoryPoint(reference.trajectory, refTime);
    const testPoint = findClosestTrajectoryPoint(test.trajectory, testTime);

    const refAngle = refPoint ? refPoint.angle : null;
    const testAngle = testPoint ? testPoint.angle : null;
    const delta =
      refAngle !== null && testAngle !== null
        ? Math.round((testAngle - refAngle) * 10) / 10
        : null;

    normalizedTrajectory.push({
      progressPct,
      referenceAngle: refAngle,
      testAngle: testAngle,
      angleDelta: delta,
    });
  }

  return {
    referenceResult: reference,
    testResult: test,
    comparisonStatus,
    metricComparisons,
    observedDeviations,
    clinicalGuidance,
    normalizedTrajectory,
    isReferenceReliable,
    isTestReliable,
  };
}

function findClosestTrajectoryPoint(
  trajectory: TrajectoryPoint[],
  targetTimeSec: number
): TrajectoryPoint | null {
  if (!trajectory || trajectory.length === 0) return null;
  let closest = trajectory[0];
  let minDiff = Math.abs(closest.timeSec - targetTimeSec);

  for (let i = 1; i < trajectory.length; i++) {
    const diff = Math.abs(trajectory[i].timeSec - targetTimeSec);
    if (diff < minDiff) {
      minDiff = diff;
      closest = trajectory[i];
    }
  }

  return closest;
}
