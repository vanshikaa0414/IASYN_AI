import { RepetitionRecord } from './repCounter';

export type AssessmentStatus = 'Meets configured criteria' | 'Needs review' | 'Unable to assess';

export interface SessionAssessmentSummary {
  repetitionCount: number;
  minKneeAngle: number;
  maxKneeAngle: number;
  rangeOfMotion: number;
  trackingQuality: string;
  observations: string[];
  assessmentStatus: AssessmentStatus;
}

export interface LivePostureCheck {
  trunkStable: boolean;
  trunkAngle: number;
  extensionReached: boolean;
  returnReached: boolean;
  trackingReliable: boolean;
  liveFeedback: string;
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
  const trackingReliable = confidence >= 0.45;
  const trunkStable = trunkAngle <= maxTrunkLean;
  const extensionReached = kneeAngle >= targetExtension;
  const returnReached = kneeAngle <= restThreshold;

  let liveFeedback = 'Tracking posture...';
  if (!trackingReliable) {
    liveFeedback = 'Unable to assess — please reposition camera to show hip, knee & ankle.';
  } else if (!trunkStable) {
    liveFeedback = `Excessive trunk lean (~${Math.round(trunkAngle)}°). Maintain upright posture.`;
  } else if (kneeAngle > 155 && !extensionReached) {
    liveFeedback = `Good extension (${Math.round(kneeAngle)}°); aim for terminal squeeze (≥${targetExtension}°).`;
  } else if (extensionReached) {
    liveFeedback = `Target extension reached (${Math.round(kneeAngle)}°)! Hold for 2-3s then lower smoothly.`;
  } else if (returnReached) {
    liveFeedback = 'Seated rest position. Ready for next extension repetition.';
  } else {
    liveFeedback = 'Slow, controlled movement in progress.';
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
 * End-of-session summary analyzer.
 */
export function analyzeSessionObservations(
  reps: RepetitionRecord[],
  overallTrackingConfidence: number,
  sessionDurationSeconds: number,
  fallbackAngleExtrema?: { min: number; max: number; rom?: number }
): SessionAssessmentSummary {
  const observations: string[] = [];

  // Case 1: Tracking quality insufficient
  if (overallTrackingConfidence < 0.45) {
    observations.push('Tracking quality was insufficient to assess this movement.');
    observations.push('Ensure the patient sits in profile view with adequate lighting and visible lower limbs.');
    return {
      repetitionCount: reps.length,
      minKneeAngle: fallbackAngleExtrema?.min || 90.0,
      maxKneeAngle: fallbackAngleExtrema?.max || 90.0,
      rangeOfMotion: fallbackAngleExtrema?.rom || 0,
      trackingQuality: 'Insufficient (< 45% tracking confidence)',
      observations,
      assessmentStatus: 'Unable to assess',
    };
  }

  // Case 2: No repetitions completed
  if (reps.length === 0) {
    observations.push('No complete repetitions were recorded during this assessment window.');
    observations.push('Ensure leg completes both the extension (>150°) and return (<115°) movement phases.');
    const minAngle = fallbackAngleExtrema?.min || 90.0;
    const maxAngle = fallbackAngleExtrema?.max || 90.0;
    const rom = Math.max(0, Math.round((maxAngle - minAngle) * 10) / 10);

    return {
      repetitionCount: 0,
      minKneeAngle: minAngle,
      maxKneeAngle: maxAngle,
      rangeOfMotion: rom,
      trackingQuality: `${Math.round(overallTrackingConfidence * 100)}% Average Confidence`,
      observations,
      assessmentStatus: 'Needs review',
    };
  }

  // Multi-rep session analysis
  const maxAngles = reps.map((r) => r.maxAngle);
  const minAngles = reps.map((r) => r.minAngle);
  const overallMin = Math.min(...minAngles);
  const overallMax = Math.max(...maxAngles);
  const rom = Math.round((overallMax - overallMin) * 10) / 10;

  const fullExtensionCount = reps.filter((r) => r.reachedFullExtension).length;
  const fullExtensionPct = Math.round((fullExtensionCount / reps.length) * 100);

  // A. Incomplete Knee Extension Check
  if (fullExtensionPct >= 80) {
    observations.push(`Target terminal extension (≥168°) achieved on ${fullExtensionCount} of ${reps.length} repetitions (${fullExtensionPct}%).`);
  } else if (overallMax >= 150) {
    observations.push(`Observed knee extension reached moderate angles (peak: ${overallMax}°), but did not reach the configured reference angle (≥168°).`);
  } else {
    observations.push(`Observed knee extension did not reach the configured reference angle (peak: ${overallMax}°).`);
  }

  // B. Incomplete Return Check
  const avgMin = Math.round(minAngles.reduce((a, b) => a + b, 0) / reps.length);
  if (avgMin <= 110) {
    observations.push('Appropriate return movement to 90° seated flexion demonstrated between repetitions.');
  } else {
    observations.push(`Return movement did not reach the configured starting range (resting average: ${avgMin}°, expected: ≤115°).`);
  }

  // C. Excessive Trunk Movement Check
  const trunkLeans = reps.map((r) => r.trunkLeanMax);
  const maxTrunkLean = Math.max(...trunkLeans);
  if (maxTrunkLean > 18) {
    observations.push(`Excessive trunk movement was observed during the exercise (peak tilt ~${maxTrunkLean}°, threshold: 18°).`);
  } else {
    observations.push('Upright seated spinal posture maintained with minimal compensatory trunk inclination.');
  }

  // D. Tracking Quality
  let trackingQuality = 'Optimal';
  if (overallTrackingConfidence >= 0.80) {
    trackingQuality = `Optimal (${Math.round(overallTrackingConfidence * 100)}% Confidence)`;
  } else if (overallTrackingConfidence >= 0.60) {
    trackingQuality = `Good (${Math.round(overallTrackingConfidence * 100)}% Confidence)`;
  } else {
    trackingQuality = `Fair (${Math.round(overallTrackingConfidence * 100)}% Confidence)`;
    observations.push('Minor tracking jitter observed during motion; keep camera positioned strictly lateral.');
  }

  // Overall status decision
  let assessmentStatus: AssessmentStatus = 'Meets configured criteria';
  if (fullExtensionPct < 60 || maxTrunkLean > 20 || rom < 55) {
    assessmentStatus = 'Needs review';
  }

  return {
    repetitionCount: reps.length,
    minKneeAngle: overallMin,
    maxKneeAngle: overallMax,
    rangeOfMotion: rom,
    trackingQuality,
    observations,
    assessmentStatus,
  };
}
