import {
  OneEuroFilter,
  Point2DSmoother,
  DisplayDeadband,
  DEFAULT_ANGLE_SMOOTHER_CONFIG,
  DEFAULT_LANDMARK_SMOOTHER_CONFIG,
  SmootherConfig,
} from './smoothing';

export interface Point2D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export class AngleCalculator {
  private smoothedAngle: number | null = null;
  private readonly alpha: number;
  private oneEuroFilter: OneEuroFilter;
  private displayDeadband: DisplayDeadband;
  private hipSmoother: Point2DSmoother;
  private kneeSmoother: Point2DSmoother;
  private ankleSmoother: Point2DSmoother;
  private shoulderSmoother: Point2DSmoother;

  constructor(
    alpha: number = 0.35,
    filterConfig: Partial<SmootherConfig> = DEFAULT_ANGLE_SMOOTHER_CONFIG,
    deadbandDegrees: number = 0.8
  ) {
    this.alpha = alpha; // EMA fallback factor
    this.oneEuroFilter = new OneEuroFilter(filterConfig);
    this.displayDeadband = new DisplayDeadband(deadbandDegrees);

    this.hipSmoother = new Point2DSmoother(DEFAULT_LANDMARK_SMOOTHER_CONFIG);
    this.kneeSmoother = new Point2DSmoother(DEFAULT_LANDMARK_SMOOTHER_CONFIG);
    this.ankleSmoother = new Point2DSmoother(DEFAULT_LANDMARK_SMOOTHER_CONFIG);
    this.shoulderSmoother = new Point2DSmoother(DEFAULT_LANDMARK_SMOOTHER_CONFIG);
  }

  /**
   * Validates if a triplet of points has valid numerical coordinates and minimal visibility.
   */
  isValidTriplet(hip?: Point2D, knee?: Point2D, ankle?: Point2D, minConfidence: number = 0.40): boolean {
    if (!hip || !knee || !ankle) return false;
    if (
      isNaN(hip.x) || isNaN(hip.y) ||
      isNaN(knee.x) || isNaN(knee.y) ||
      isNaN(ankle.x) || isNaN(ankle.y)
    ) {
      return false;
    }
    const conf = this.calculateConfidence(hip, knee, ankle);
    return conf >= minConfidence;
  }

  /**
   * Smooths 2D landmark coordinates using speed-adaptive 1-Euro filters.
   * Eliminates stationary landmark flutter while maintaining responsiveness during motion.
   */
  smoothLandmarkTriplet(
    hip: Point2D,
    knee: Point2D,
    ankle: Point2D,
    timestampMs: number
  ): { hip: Point2D; knee: Point2D; ankle: Point2D } {
    const sHip = this.hipSmoother.filter(hip.x, hip.y, timestampMs);
    const sKnee = this.kneeSmoother.filter(knee.x, knee.y, timestampMs);
    const sAnkle = this.ankleSmoother.filter(ankle.x, ankle.y, timestampMs);

    return {
      hip: { x: sHip.x, y: sHip.y, z: hip.z, visibility: hip.visibility },
      knee: { x: sKnee.x, y: sKnee.y, z: knee.z, visibility: knee.visibility },
      ankle: { x: sAnkle.x, y: sAnkle.y, z: ankle.z, visibility: ankle.visibility },
    };
  }

  smoothShoulder(shoulder: Point2D, timestampMs: number): Point2D {
    const s = this.shoulderSmoother.filter(shoulder.x, shoulder.y, timestampMs);
    return { x: s.x, y: s.y, z: shoulder.z, visibility: shoulder.visibility };
  }

  /**
   * Calculates the raw interior joint angle at the knee using vector geometry:
   *   vectorA = Hip - Knee
   *   vectorB = Ankle - Knee
   *   cos(theta) = (vectorA · vectorB) / (|vectorA| * |vectorB|)
   *   theta = arccos(clamp(cos(theta), -1, 1))
   *
   * Clamped to [0, 180] degrees. Safe against degenerate vectors and domain errors.
   */
  calculateRawKneeAngle(hip: Point2D, knee: Point2D, ankle: Point2D): number {
    if (!hip || !knee || !ankle) return 90.0;

    const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
    const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0 || isNaN(mag1) || isNaN(mag2)) {
      return 90.0;
    }

    let cosine = dotProduct / (mag1 * mag2);
    // Guard against floating point imprecision beyond [-1.0, 1.0]
    cosine = Math.max(-1.0, Math.min(1.0, cosine));
    const angleRad = Math.acos(cosine);
    const angleDeg = (angleRad * 180.0) / Math.PI;

    if (isNaN(angleDeg) || !isFinite(angleDeg)) {
      return 90.0;
    }

    return Math.round(angleDeg * 10) / 10;
  }

  /**
   * Calculates the knee angle and applies temporal smoothing.
   * If timestampMs is provided, uses the 1-Euro speed-adaptive filter.
   * Otherwise falls back to exponential moving average (EMA).
   */
  calculateKneeAngle(hip: Point2D, knee: Point2D, ankle: Point2D, timestampMs?: number): number {
    const rawDeg = this.calculateRawKneeAngle(hip, knee, ankle);

    let filteredAngle: number;
    if (timestampMs !== undefined && timestampMs > 0) {
      filteredAngle = this.oneEuroFilter.filter(rawDeg, timestampMs);
    } else {
      // Fallback to EMA
      if (this.smoothedAngle === null) {
        this.smoothedAngle = rawDeg;
      } else {
        this.smoothedAngle = this.alpha * rawDeg + (1 - this.alpha) * this.smoothedAngle;
      }
      filteredAngle = this.smoothedAngle;
    }

    return Math.round(filteredAngle * 10) / 10;
  }

  /**
   * Returns a display-stabilized angle filtered by the display deadband.
   * Prevents visual flickering of decimal places when the patient is seated stationary.
   */
  getDisplayAngle(angle: number): number {
    return this.displayDeadband.update(angle);
  }

  /**
   * Computes trunk inclination angle relative to the vertical axis given shoulder and hip points.
   * In upright sitting, dx ~ 0 so angle is near 0°.
   * If patient leans backward during extension to substitute trunk muscles, angle increases.
   */
  calculateTrunkAngle(shoulder: Point2D, hip: Point2D): number {
    if (!shoulder || !hip) return 0.0;
    const dx = shoulder.x - hip.x;
    const dy = shoulder.y - hip.y;
    if (isNaN(dx) || isNaN(dy)) return 0.0;

    const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy));
    const angleDeg = (angleRad * 180.0) / Math.PI;
    if (isNaN(angleDeg) || !isFinite(angleDeg)) return 0.0;

    return Math.round(angleDeg * 10) / 10;
  }

  /**
   * Calculates landmark tracking confidence for the triplet (hip, knee, ankle).
   */
  calculateConfidence(hip: Point2D, knee: Point2D, ankle: Point2D): number {
    const vHip = hip && hip.visibility !== undefined ? hip.visibility : 1.0;
    const vKnee = knee && knee.visibility !== undefined ? knee.visibility : 1.0;
    const vAnkle = ankle && ankle.visibility !== undefined ? ankle.visibility : 1.0;
    return Math.round(Math.min(vHip, vKnee, vAnkle) * 100) / 100;
  }

  /**
   * Resets all internal filters and state history.
   */
  reset() {
    this.smoothedAngle = null;
    this.oneEuroFilter.reset();
    this.displayDeadband.reset();
    this.hipSmoother.reset();
    this.kneeSmoother.reset();
    this.ankleSmoother.reset();
    this.shoulderSmoother.reset();
  }
}
