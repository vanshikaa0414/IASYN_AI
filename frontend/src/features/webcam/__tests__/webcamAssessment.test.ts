import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AngleCalculator, Point2D } from '../angleCalculator.ts';
import { RepetitionCounter } from '../repCounter.ts';
import { evaluateLivePosture, analyzeSessionObservations } from '../observations.ts';

describe('AngleCalculator Vector Geometry Tests', () => {
  test('calculates 90 degree perpendicular knee angle accurately', () => {
    const calc = new AngleCalculator(1.0); // No EMA delay for unit test
    // Hip directly above knee, ankle directly in front of knee
    const hip: Point2D = { x: 0, y: 1 };
    const knee: Point2D = { x: 0, y: 0 };
    const ankle: Point2D = { x: 1, y: 0 };

    const angle = calc.calculateRawKneeAngle(hip, knee, ankle);
    assert.equal(angle, 90.0);
  });

  test('calculates 180 degree straight line knee extension accurately', () => {
    const calc = new AngleCalculator(1.0);
    // Hip, knee, and ankle all in a straight horizontal line
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
    // 45 degrees below horizontal-right = 135 degrees from vertical-up
    const ankle: Point2D = { x: 1, y: -1 };

    const angle = calc.calculateRawKneeAngle(hip, knee, ankle);
    assert.equal(angle, 135.0);
  });

  test('handles zero magnitude vectors gracefully without NaN', () => {
    const calc = new AngleCalculator(1.0);
    const p: Point2D = { x: 0, y: 0 };
    const angle = calc.calculateRawKneeAngle(p, p, p);
    assert.equal(isNaN(angle), false);
    assert.equal(angle, 90.0);
  });

  test('applies exponential moving average (EMA) smoothing', () => {
    const calc = new AngleCalculator(0.5);
    const hip: Point2D = { x: 0, y: 1 };
    const knee: Point2D = { x: 0, y: 0 };
    const ankle90: Point2D = { x: 1, y: 0 }; // 90°
    const ankle180: Point2D = { x: 0, y: -1 }; // 180°

    const first = calc.calculateKneeAngle(hip, knee, ankle90);
    assert.equal(first, 90.0);

    // Sudden jump to 180° should be smoothed: 0.5 * 180 + 0.5 * 90 = 135°
    const second = calc.calculateKneeAngle(hip, knee, ankle180);
    assert.equal(second, 135.0);
  });

  test('computes trunk inclination angle relative to vertical', () => {
    const calc = new AngleCalculator();
    // Upright posture: shoulder directly above hip
    const shoulderUpright: Point2D = { x: 0, y: 2 };
    const hip: Point2D = { x: 0, y: 0 };
    const angleUpright = calc.calculateTrunkAngle(shoulderUpright, hip);
    assert.equal(angleUpright, 0.0);

    // Lean backward: dx = 0.5, dy = 1.0 -> atan2(0.5, 1.0) ~ 26.6°
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

describe('RepetitionCounter State Machine Tests', () => {
  test('initializes in WAITING phase with 0 repetitions', () => {
    const counter = new RepetitionCounter();
    assert.equal(counter.getPhase(), 'WAITING');
    assert.equal(counter.getRepCount(), 0);
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

    // 3. Reaches full extension (170° >= 150°)
    res = counter.processFrame(170, 4, 0.9, 2000);
    assert.equal(res.phase, 'KNEE EXTENDED');

    // 4. Begins return descent (140° < 142°)
    res = counter.processFrame(140, 3, 0.9, 2500);
    assert.equal(res.phase, 'RETURNING');

    // 5. Completes return below rest threshold (100° <= 115°) after >0.8s
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

  test('prevents false counts on incomplete kicks (did not reach extension threshold)', () => {
    const counter = new RepetitionCounter();
    counter.processFrame(90, 0, 0.9, 1000); // KNEE BENT
    counter.processFrame(130, 0, 0.9, 1200); // EXTENDING
    counter.processFrame(145, 0, 0.9, 1400); // Extends to only 145° (< 150°)
    counter.processFrame(100, 0, 0.9, 2200); // Returns back down

    assert.equal(counter.getRepCount(), 0);
  });

  test('prevents false counts on high-frequency noise spikes (< min duration)', () => {
    const counter = new RepetitionCounter();
    counter.processFrame(90, 0, 0.9, 1000);
    counter.processFrame(130, 0, 0.9, 1050);
    counter.processFrame(165, 0, 0.9, 1100); // 100ms later
    counter.processFrame(140, 0, 0.9, 1150);
    counter.processFrame(100, 0, 0.9, 1200); // Total elapsed = 150ms < 800ms threshold

    assert.equal(counter.getRepCount(), 0);
  });

  test('calculates extension progress percentage accurately', () => {
    const counter = new RepetitionCounter();
    assert.equal(counter.calculateExtensionProgress(90), 0);
    assert.equal(counter.calculateExtensionProgress(168), 100);
    assert.equal(counter.calculateExtensionProgress(129), 50); // halfway between 90 and 168
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
        reachedFullExtension: false,
        trunkLeanMax: 5,
      },
    ];

    const summary = analyzeSessionObservations(reps, 0.92, 10);
    assert.equal(summary.repetitionCount, 1);
    assert.equal(summary.maxKneeAngle, 154);
    assert.equal(summary.assessmentStatus, 'Needs review');
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
        reachedFullExtension: true,
        trunkLeanMax: 24, // Excessive tilt
      },
    ];

    const summary = analyzeSessionObservations(reps, 0.95, 12);
    assert.equal(
      summary.observations.some((obs) => obs.includes('Excessive trunk movement was observed')),
      true
    );
    assert.equal(summary.assessmentStatus, 'Needs review');
  });

  test('approves assessment status when movement meets configured criteria', () => {
    const reps = [
      {
        repNumber: 1,
        maxAngle: 170,
        minAngle: 91,
        durationSeconds: 2.4,
        reachedFullExtension: true,
        trunkLeanMax: 6,
      },
      {
        repNumber: 2,
        maxAngle: 172,
        minAngle: 90,
        durationSeconds: 2.6,
        reachedFullExtension: true,
        trunkLeanMax: 5,
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
    assert.equal(warning.trunkStable, false);
    assert.equal(good.extensionReached, true);
    assert.equal(good.liveFeedback.includes('Target extension reached'), true);
  });
});
