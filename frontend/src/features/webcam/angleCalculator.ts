export interface Point2D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export class AngleCalculator {
  private smoothedAngle: number | null = null;
  private readonly alpha: number;

  constructor(alpha: number = 0.35) {
    this.alpha = alpha; // Exponential smoothing factor (0 < alpha <= 1)
  }

  /**
   * Calculates the interior joint angle at the knee given points:
   * Hip (A), Knee (B), and Ankle (C).
   *
   * Formula:
   *   vectorA = Hip - Knee
   *   vectorB = Ankle - Knee
   *   cos(theta) = (vectorA · vectorB) / (|vectorA| * |vectorB|)
   *   theta = arccos(clamp(cos(theta), -1, 1))
   *
   * Returns knee angle in degrees [0, 180].
   */
  calculateKneeAngle(hip: Point2D, knee: Point2D, ankle: Point2D): number {
    const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
    const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 90.0;

    let cosine = dotProduct / (mag1 * mag2);
    // Clamp to [-1, 1] to avoid mathematical domain errors with arccos
    cosine = Math.max(-1.0, Math.min(1.0, cosine));
    const angleRad = Math.acos(cosine);
    const angleDeg = (angleRad * 180.0) / Math.PI;

    // Apply Exponential Moving Average (EMA) smoothing to reduce high-frequency landmark jitter
    if (this.smoothedAngle === null) {
      this.smoothedAngle = angleDeg;
    } else {
      this.smoothedAngle = this.alpha * angleDeg + (1 - this.alpha) * this.smoothedAngle;
    }

    return Math.round(this.smoothedAngle * 10) / 10;
  }

  /**
   * Calculates the raw knee angle without EMA smoothing (used for testing or instantaneous metrics).
   */
  calculateRawKneeAngle(hip: Point2D, knee: Point2D, ankle: Point2D): number {
    const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
    const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };

    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 90.0;

    let cosine = dotProduct / (mag1 * mag2);
    cosine = Math.max(-1.0, Math.min(1.0, cosine));
    const angleRad = Math.acos(cosine);
    return Math.round(((angleRad * 180.0) / Math.PI) * 10) / 10;
  }

  /**
   * Computes trunk inclination angle relative to the vertical axis given shoulder and hip points.
   * In upright sitting, dx ~ 0 so angle is near 0°.
   * If patient leans backward during extension to substitute trunk muscles, angle increases.
   */
  calculateTrunkAngle(shoulder: Point2D, hip: Point2D): number {
    const dx = shoulder.x - hip.x;
    const dy = shoulder.y - hip.y;
    const angleRad = Math.atan2(Math.abs(dx), Math.abs(dy));
    return Math.round(((angleRad * 180.0) / Math.PI) * 10) / 10;
  }

  /**
   * Calculates landmark tracking confidence for the triplet (hip, knee, ankle).
   */
  calculateConfidence(hip: Point2D, knee: Point2D, ankle: Point2D): number {
    const vHip = hip.visibility !== undefined ? hip.visibility : 1.0;
    const vKnee = knee.visibility !== undefined ? knee.visibility : 1.0;
    const vAnkle = ankle.visibility !== undefined ? ankle.visibility : 1.0;
    return Math.round(Math.min(vHip, vKnee, vAnkle) * 100) / 100;
  }

  reset() {
    this.smoothedAngle = null;
  }
}
