/**
 * 1-Euro Filter & Kinematic Temporal Smoothing Utilities
 * Reference: Casiez, Roussel, Vogel (CHI 2012) - "1 € filter: a simple speed-based low-pass filter for noisy input in human-computer interaction"
 */

export interface SmootherConfig {
  minCutoff: number; // Minimum cutoff frequency in Hz (lower = less jitter when stationary)
  beta: number;      // Speed coefficient (higher = less lag during rapid movement)
  dCutoff: number;   // Cutoff frequency for derivative in Hz
}

export const DEFAULT_ANGLE_SMOOTHER_CONFIG: SmootherConfig = {
  minCutoff: 0.8,    // 0.8 Hz produces very stable stationary angles
  beta: 0.05,        // Adapts quickly when the leg extends
  dCutoff: 1.0,
};

export const DEFAULT_LANDMARK_SMOOTHER_CONFIG: SmootherConfig = {
  minCutoff: 1.2,
  beta: 0.04,
  dCutoff: 1.0,
};

/**
 * 1-Euro Filter for scalar time-series signals (e.g. joint angles, velocity).
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(config: Partial<SmootherConfig> = {}) {
    this.minCutoff = config.minCutoff ?? DEFAULT_ANGLE_SMOOTHER_CONFIG.minCutoff;
    this.beta = config.beta ?? DEFAULT_ANGLE_SMOOTHER_CONFIG.beta;
    this.dCutoff = config.dCutoff ?? DEFAULT_ANGLE_SMOOTHER_CONFIG.dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  /**
   * Filters input value x at timestamp t (in milliseconds or seconds).
   */
  filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = t;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }

    // Convert ms to seconds if timestamp is large
    let dt = (t - this.tPrev);
    if (dt > 10.0) {
      dt = dt / 1000.0; // Timestamp was in ms
    }

    // Guard against degenerate zero or negative intervals
    if (dt <= 0.0001) {
      return this.xPrev;
    }

    // Discrete derivative of input
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1.0 - aD) * this.dxPrev;

    // Adaptive cutoff frequency based on rate of change
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1.0 - a) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = t;

    return xHat;
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

/**
 * 2D Landmark Point filter applying dual 1-Euro filters to x and y coordinates.
 */
export class Point2DSmoother {
  private xFilter: OneEuroFilter;
  private yFilter: OneEuroFilter;

  constructor(config: Partial<SmootherConfig> = DEFAULT_LANDMARK_SMOOTHER_CONFIG) {
    this.xFilter = new OneEuroFilter(config);
    this.yFilter = new OneEuroFilter(config);
  }

  filter(x: number, y: number, t: number): { x: number; y: number } {
    return {
      x: this.xFilter.filter(x, t),
      y: this.yFilter.filter(y, t),
    };
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
  }
}

/**
 * Display Deadband filter:
 * Prevents minor visual number jitter on the UI display when stationary,
 * while instantly allowing genuine changes beyond the deadband threshold.
 */
export class DisplayDeadband {
  private displayVal: number | null = null;
  private readonly threshold: number;

  constructor(threshold: number = 0.8) {
    this.threshold = threshold; // Minimum angle change in degrees to trigger visual update
  }

  update(filteredVal: number): number {
    if (this.displayVal === null) {
      this.displayVal = Math.round(filteredVal * 10) / 10;
      return this.displayVal;
    }

    if (Math.abs(filteredVal - this.displayVal) >= this.threshold) {
      this.displayVal = Math.round(filteredVal * 10) / 10;
    }

    return this.displayVal;
  }

  reset() {
    this.displayVal = null;
  }
}
