import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AngleCalculator, Point2D } from '../angleCalculator.ts';
import { RepetitionCounter } from '../repCounter.ts';
import {
  evaluateLivePosture,
  analyzeSessionObservations,
  compareVideoAnalyses,
  VideoAnalysisResult,
} from '../observations.ts';
import { OneEuroFilter, Point2DSmoother, DisplayDeadband } from '../smoothing.ts';

describe('AngleCalculator Vector Geometry & Smoothing Tests', () => {
  test('calculates 90 degree perpendicular knee angle accurately', () => {
    const calc = new AngleCalculator(1.0);
    const hip: Point2D = { x: 0, y: 1 };
    const knee: Point2D = { x: 0, y: 0 };
    const ankle: Point2D = { x: 1, y: 0 };

    const angle = calc.calculateRawKneeAngle(hip, knee, ankle);
    assert.equal(angle, 90.0);
  });

  test('calculates 180 degree straight line knee extension accurately', () => {
    const calc = new AngleCalculator(1.0);
    const hip: Point2D = { x: -1, y: 0 };
    const knee: Point2D = { x: 0, y: 0 };
    const ankle: Point2D = { x: 1, y: 0 };

    const angle = calc.calculateRawKneeAngle(hip, knee, ankle);
    assert.equal(angle, 180.0);
  });

  test('calculates 135 degree obtuse knee extension accurately', () => {
    const calc = new AngleCalculator(1.0);
    const hip: Point2D = { x: 0, y: 1 };
    const knee: Point2D = { x: 0, y: 0 };
    const ankle: Point2D = { x: 1, y: -1 };

    const angle = calc.calculateRawKneeAngle(hip, knee, ankle);
    assert.equal(angle, 135.0);
  });

  test('handles zero magnitude and degenerate vectors gracefully without NaN', () => {
    const calc = new AngleCalculator(1.0);
    const p: Point2D = { x: 0, y: 0 };
    const angle = calc.calculateRawKneeAngle(p, p, p);
    assert.equal(isNaN(angle), false);
    assert.equal(angle, 90.0);
  });

  test('validates landmark triplet visibility', () => {
    const calc = new AngleCalculator();
    const hip: Point2D = { x: 0.5, y: 0.6, visibility: 0.85 };
    const knee: Point2D = { x: 0.5, y: 0.75, visibility: 0.70 };
    const ankleLow: Point2D = { x: 0.5, y: 0.9, visibility: 0.20 };
    const ankleGood: Point2D = { x: 0.5, y: 0.9, visibility: 0.80 };

    assert.equal(calc.isValidTriplet(hip, knee, ankleLow, 0.40), false);
    assert.equal(calc.isValidTriplet(hip, knee, ankleGood, 0.40), true);
  });

  test('applies 1-Euro speed-adaptive filter to knee angle', () => {
    const calc = new AngleCalculator();
    const hip: Point2D = { x: 0, y: 1 };
    const knee: Point2D = { x: 0, y: 0 };
    const ankle90: Point2D = { x: 1, y: 0 }; // 90°
    const ankle180: Point2D = { x: 0, y: -1 }; // 180°

    const a1 = calc.calculateKneeAngle(hip, knee, ankle90, 1000);
    assert.equal(a1, 90.0);

    // After 33ms, sudden jump to 180° is smoothed by 1-Euro filter
    const a2 = calc.calculateKneeAngle(hip, knee, ankle180, 1033);
    assert.equal(a2 > 90.0 && a2 < 180.0, true);
  });

  test('computes trunk inclination angle relative to vertical', () => {
    const calc = new AngleCalculator();
    const shoulderUpright: Point2D = { x: 0, y: 2 };
    const hip: Point2D = { x: 0, y: 0 };
    const angleUpright = calc.calculateTrunkAngle(shoulderUpright, hip);
    assert.equal(angleUpright, 0.0);

    const shoulderLean: Point2D = { x: -0.5, y: 1.0 };
    const angleLean = calc.calculateTrunkAngle(shoulderLean, hip);
    assert.equal(angleLean, 26.6);
  });

  test('computes tracking confidence correctly', () => {
    const calc = new AngleCalculator();
    const hip: Point2D = { x: 0, y: 1, visibility: 0.95 };
    const knee: Point2D = { x: 0, y: 0, visibility: 0.88 };
    const ankle: Point2D = { x: 1, y: 0, visibility: 0.72 };

    const conf = calc.calculateConfidence(hip, knee, ankle);
    assert.equal(conf, 0.72);
  });
});

describe('Smoothing & Deadband Utilities Tests', () => {
  test('OneEuroFilter suppresses stationary jitter while tracking motion', () => {
    const filter = new OneEuroFilter({ minCutoff: 0.8, beta: 0.05 });
    
    // Stationary values with small ±0.2° jitter at 30 fps (33ms intervals)
    let val = filter.filter(90.0, 1000);
    assert.equal(Math.round(val), 90);

    val = filter.filter(90.2, 1033);
    assert.equal(Math.abs(val - 90.0) < 0.2, true);

    val = filter.filter(89.8, 1066);
    assert.equal(Math.abs(val - 90.0) < 0.2, true);

    // Fast movement kick: jumps to 150° over 150ms
    val = filter.filter(110.0, 1100);
    val = filter.filter(130.0, 1133);
    val = filter.filter(150.0, 1166);
    // Adapts to higher cutoff speed
    assert.equal(val > 140.0, true);
  });

  test('Point2DSmoother filters 2D landmark coordinates', () => {
    const smoother = new Point2DSmoother();
    const p1 = smoother.filter(0.5, 0.5, 1000);
    assert.equal(p1.x, 0.5);
    assert.equal(p1.y, 0.5);

    const p2 = smoother.filter(0.505, 0.495, 1033);
    assert.equal(Math.abs(p2.x - 0.5) < 0.005, true);
  });

  test('DisplayDeadband prevents visual number flickering below threshold', () => {
    const deadband = new DisplayDeadband(0.8);
    // Initial display value
    const v1 = deadband.update(90.1);
    assert.equal(v1, 90.1);

    // Minor fluctuation +0.3° is below 0.8° deadband threshold -> returns unchanged 90.1
    const v2 = deadband.update(90.4);
    assert.equal(v2, 90.1);

    // Fluctuation -0.4° is below threshold -> returns unchanged 90.1
    const v3 = deadband.update(89.8);
    assert.equal(v3, 90.1);

    // Genuine movement +1.5° exceeds deadband -> updates display value
    const v4 = deadband.update(91.6);
    assert.equal(v4, 91.6);
  });
});

describe('RepetitionCounter State Machine Tests', () => {
  test('initializes in WAITING phase with 0 repetitions', () => {
    const counter = new RepetitionCounter();
    assert.equal(counter.getPhase(), 'WAITING');
    assert.equal(counter.getRepCount(), 0);
    assert.equal(counter.getIncompleteCount(), 0);
  });

  test('stationary leg produces zero repetitions and stays stable', () => {
    const counter = new RepetitionCounter();
    for (let t = 1000; t <= 5000; t += 33) {
      counter.processFrame(90.2, 2.0, 0.95, t);
    }
    assert.equal(counter.getRepCount(), 0);
    assert.equal(counter.getIncompleteCount(), 0);
  });

  test('transitions smoothly from WAITING to KNEE BENT to EXTENDING to KNEE EXTENDED to RETURNING', () => {
    const counter = new RepetitionCounter();

    // 1. Initial resting frame at 90°
    let res = counter.processFrame(90, 0, 0.9, 1000);
    assert.equal(res.phase, 'KNEE BENT');
    assert.equal(res.repCount, 0);

    // 2. Begins kick extension (130°)
    res = counter.processFrame(130, 2, 0.9, 1400);
    assert.equal(res.phase, 'EXTENDING');

    // 3. Reaches extension threshold (170° >= 150°)
    res = counter.processFrame(170, 4, 0.9, 2000);
    assert.equal(res.phase, 'KNEE EXTENDED');

    // 4. Begins return descent (140° < 142°)
    res = counter.processFrame(140, 3, 0.9, 2500);
    assert.equal(res.phase, 'RETURNING');

    // 5. Completes return below rest threshold (100° <= 115°)
    res = counter.processFrame(100, 1, 0.9, 3200);
    assert.equal(res.repCount, 1);
    assert.equal(res.newRepCompleted, true);
    assert.equal(res.phase, 'KNEE BENT');

    // Verify logged repetition record
    const reps = counter.getCompletedReps();
    assert.equal(reps.length, 1);
    assert.equal(reps[0].repNumber, 1);
    assert.equal(reps[0].maxAngle, 170);
    assert.equal(reps[0].reachedFullExtension, true);
  });

  test('detects and logs incomplete repetition attempt when leg drops prematurely', () => {
    const counter = new RepetitionCounter();
    counter.processFrame(90, 0, 0.9, 1000); // KNEE BENT
    counter.processFrame(130, 0, 0.9, 1300); // EXTENDING
    counter.processFrame(144, 0, 0.9, 1600); // Partial kick (144° < 150°)
    const res = counter.processFrame(105, 0, 0.9, 2200); // Reverses back to rest

    assert.equal(counter.getRepCount(), 0);
    assert.equal(counter.getIncompleteCount(), 1);
    assert.equal(res.newIncompleteRecorded, true);

    const incomplete = counter.getIncompleteAttempts();
    assert.equal(incomplete.length, 1);
    assert.equal(incomplete[0].maxAngle, 144);
    assert.equal(incomplete[0].reason.includes('Incomplete extension'), true);
  });

  test('prevents false counts on high-frequency noise spikes (< min duration)', () => {
    const counter = new RepetitionCounter();
    counter.processFrame(90, 0, 0.9, 1000);
    counter.processFrame(130, 0, 0.9, 1050);
    counter.processFrame(165, 0, 0.9, 1100);
    counter.processFrame(140, 0, 0.9, 1150);
    counter.processFrame(100, 0, 0.9, 1200); // 200ms total elapsed (< 800ms threshold)

    assert.equal(counter.getRepCount(), 0);
  });

  test('handles multiple consecutive valid repetitions with dwell holds', () => {
    const counter = new RepetitionCounter();

    // Rep 1
    counter.processFrame(90, 0, 0.9, 1000);
    counter.processFrame(135, 2, 0.9, 1500);
    counter.processFrame(168, 3, 0.9, 2000);
    counter.processFrame(168, 3, 0.9, 2300); // Hold for 300ms
    counter.processFrame(140, 2, 0.9, 2700);
    counter.processFrame(105, 1, 0.9, 3200);
    assert.equal(counter.getRepCount(), 1);

    // Rep 2
    counter.processFrame(135, 2, 0.9, 4000);
    counter.processFrame(170, 4, 0.9, 4600);
    counter.processFrame(170, 4, 0.9, 4900); // Hold
    counter.processFrame(138, 2, 0.9, 5300);
    counter.processFrame(102, 1, 0.9, 5800);
    assert.equal(counter.getRepCount(), 2);
  });
});

describe('Movement Observation & Clinical Rules Tests', () => {
  test('flags incomplete extension when peak angle is below 168 degrees', () => {
    const reps = [
      {
        repNumber: 1,
        maxAngle: 154,
        minAngle: 92,
        durationSeconds: 2.1,
        holdDurationSeconds: 0.4,
        reachedFullExtension: false,
        trunkLeanMax: 5,
        timestampMs: 3000,
      },
    ];

    const summary = analyzeSessionObservations(reps, 0.92, 10);
    assert.equal(summary.repetitionCount, 1);
    assert.equal(summary.maxKneeAngle, 154);
    assert.equal(summary.assessmentStatus, 'Needs improvement');
    assert.equal(
      summary.observations.some((obs) => obs.includes('Observed knee extension reached moderate angles')),
      true
    );
  });

  test('flags excessive trunk movement when trunk lean exceeds 18 degrees', () => {
    const reps = [
      {
        repNumber: 1,
        maxAngle: 172,
        minAngle: 90,
        durationSeconds: 2.5,
        holdDurationSeconds: 0.5,
        reachedFullExtension: true,
        trunkLeanMax: 24, // Excessive tilt
        timestampMs: 4000,
      },
    ];

    const summary = analyzeSessionObservations(reps, 0.95, 12);
    assert.equal(
      summary.observations.some((obs) => obs.includes('Excessive trunk movement was observed')),
      true
    );
    assert.equal(summary.assessmentStatus, 'Needs improvement');
  });

  test('approves assessment status when movement meets configured criteria', () => {
    const reps = [
      {
        repNumber: 1,
        maxAngle: 170,
        minAngle: 91,
        durationSeconds: 2.4,
        holdDurationSeconds: 0.4,
        reachedFullExtension: true,
        trunkLeanMax: 6,
        timestampMs: 3000,
      },
      {
        repNumber: 2,
        maxAngle: 172,
        minAngle: 90,
        durationSeconds: 2.6,
        holdDurationSeconds: 0.5,
        reachedFullExtension: true,
        trunkLeanMax: 5,
        timestampMs: 6000,
      },
    ];

    const summary = analyzeSessionObservations(reps, 0.94, 20);
    assert.equal(summary.assessmentStatus, 'Meets configured criteria');
  });

  test('handles poor tracking gracefully with Unable to assess status', () => {
    const summary = analyzeSessionObservations([], 0.32, 15);
    assert.equal(summary.assessmentStatus, 'Unable to assess');
    assert.equal(
      summary.observations.some((obs) => obs.includes('Tracking quality was insufficient')),
      true
    );
  });

  test('live posture evaluation provides real-time warnings', () => {
    const warning = evaluateLivePosture(150, 22, 0.9); // Excessive trunk lean
    assert.equal(warning.trunkStable, false);
    assert.equal(warning.liveFeedback.includes('Excessive trunk lean'), true);

    const good = evaluateLivePosture(170, 5, 0.9); // Target extension
    assert.equal(good.trunkStable, true);
    assert.equal(good.extensionReached, true);
    assert.equal(good.liveFeedback.includes('Target extension achieved'), true);
  });
});

describe('Video Movement Comparison Tests', () => {
  test('compares reference and test video independent analysis outputs', () => {
    const referenceResult: VideoAnalysisResult = {
      videoName: 'reference_correct.mp4',
      durationSeconds: 10,
      validReps: [
        {
          repNumber: 1,
          maxAngle: 172,
          minAngle: 90,
          durationSeconds: 2.5,
          holdDurationSeconds: 0.5,
          reachedFullExtension: true,
          trunkLeanMax: 4,
          timestampMs: 3000,
        },
        {
          repNumber: 2,
          maxAngle: 170,
          minAngle: 91,
          durationSeconds: 2.4,
          holdDurationSeconds: 0.4,
          reachedFullExtension: true,
          trunkLeanMax: 5,
          timestampMs: 6500,
        },
      ],
      incompleteAttempts: [],
      minKneeAngle: 90,
      maxKneeAngle: 172,
      rangeOfMotion: 82,
      avgRepDuration: 2.5,
      avgHoldDuration: 0.5,
      maxTrunkLean: 5,
      trackingQualityScore: 0.92,
      trackingQualityText: 'Optimal (92% Confidence)',
      trajectory: [
        { timeSec: 0, angle: 90, trunkAngle: 4, phase: 'KNEE BENT' },
        { timeSec: 2.5, angle: 172, trunkAngle: 4, phase: 'KNEE EXTENDED' },
        { timeSec: 5.0, angle: 90, trunkAngle: 3, phase: 'KNEE BENT' },
      ],
      assessmentStatus: 'Meets configured criteria',
      summary: {
        repetitionCount: 2,
        incompleteAttemptsCount: 0,
        minKneeAngle: 90,
        maxKneeAngle: 172,
        rangeOfMotion: 82,
        avgRepDuration: 2.5,
        avgHoldDuration: 0.5,
        maxTrunkLean: 5,
        trackingQuality: 'Optimal (92% Confidence)',
        trackingConfidencePct: 92,
        observations: ['Target terminal knee extension achieved.'],
        deviations: [],
        assessmentStatus: 'Meets configured criteria',
        clinicalGuidance: 'The observed knee movement reached the configured extension.',
      },
      monitoredLeg: 'right',
    };

    const testResult: VideoAnalysisResult = {
      videoName: 'test_incorrect.mp4',
      durationSeconds: 10,
      validReps: [
        {
          repNumber: 1,
          maxAngle: 145, // Did not reach 168° target
          minAngle: 92,
          durationSeconds: 2.2,
          holdDurationSeconds: 0.2,
          reachedFullExtension: false,
          trunkLeanMax: 22, // Excessive trunk lean
          timestampMs: 3200,
        },
      ],
      incompleteAttempts: [
        {
          attemptNumber: 1,
          maxAngle: 135,
          minAngle: 92,
          durationSeconds: 1.5,
          reason: 'Incomplete extension: reached 135° (target ≥150°)',
          timestampMs: 7000,
        },
      ],
      minKneeAngle: 92,
      maxKneeAngle: 145,
      rangeOfMotion: 53,
      avgRepDuration: 2.2,
      avgHoldDuration: 0.2,
      maxTrunkLean: 22,
      trackingQualityScore: 0.88,
      trackingQualityText: 'Optimal (88% Confidence)',
      trajectory: [
        { timeSec: 0, angle: 92, trunkAngle: 5, phase: 'KNEE BENT' },
        { timeSec: 2.5, angle: 145, trunkAngle: 22, phase: 'KNEE EXTENDED' },
        { timeSec: 5.0, angle: 92, trunkAngle: 5, phase: 'KNEE BENT' },
      ],
      assessmentStatus: 'Needs improvement',
      summary: {
        repetitionCount: 1,
        incompleteAttemptsCount: 1,
        minKneeAngle: 92,
        maxKneeAngle: 145,
        rangeOfMotion: 53,
        avgRepDuration: 2.2,
        avgHoldDuration: 0.2,
        maxTrunkLean: 22,
        trackingQuality: 'Optimal (88% Confidence)',
        trackingConfidencePct: 88,
        observations: ['Observed knee extension reached moderate angles (peak: 145°).'],
        deviations: [
          {
            repNumber: 1,
            type: 'Incomplete Extension',
            description: 'During repetition 1, observed knee extension reached 145°, stopping below configured target (≥168°).',
            measuredValue: 145,
            threshold: 168,
          },
          {
            repNumber: 1,
            type: 'Excessive Trunk Lean',
            description: 'During repetition 1, trunk backward lean was 22° (threshold: 18°), indicating pelvic compensation.',
            measuredValue: 22,
            threshold: 18,
          },
        ],
        assessmentStatus: 'Needs improvement',
        clinicalGuidance: 'Review the starting position and extend the lower leg toward the physiotherapist-approved target without forcing the knee.',
      },
      monitoredLeg: 'right',
    };

    const comparison = compareVideoAnalyses(referenceResult, testResult);

    assert.equal(comparison.comparisonStatus, 'Needs improvement');
    assert.equal(comparison.isReferenceReliable, true);
    assert.equal(comparison.isTestReliable, true);
    assert.equal(comparison.observedDeviations.length >= 2, true);
    assert.equal(comparison.normalizedTrajectory.length, 51);
  });
});
