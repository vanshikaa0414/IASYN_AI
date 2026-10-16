import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult, NormalizedLandmark, Landmark } from '@mediapipe/tasks-vision';

export interface PoseFrameResult {
  landmarks: NormalizedLandmark[];
  worldLandmarks: Landmark[];
  timestamp: number;
}

class PoseLandmarkerService {
  private landmarker: PoseLandmarker | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<PoseLandmarker | null> | null = null;

  /**
   * Initializes the MediaPipe PoseLandmarker.
   * Prioritizes local public assets (/wasm and /models) and falls back to Google/CDN if needed.
   */
  async initialize(): Promise<PoseLandmarker | null> {
    if (this.landmarker) return this.landmarker;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        // Try local wasm first, then CDN fallback
        let visionFileset;
        try {
          visionFileset = await FilesetResolver.forVisionTasks('/wasm');
        } catch (localWasmErr) {
          console.warn('Local WASM fileset failed, falling back to CDN:', localWasmErr);
          visionFileset = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );
        }

        // Try local model first, then Google Storage fallback
        let landmarkerInstance: PoseLandmarker | null = null;
        try {
          landmarkerInstance = await PoseLandmarker.createFromOptions(visionFileset, {
            baseOptions: {
              modelAssetPath: '/models/pose_landmarker_lite.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (gpuErr) {
          console.warn('GPU delegate failed or local model path failed, falling back to CPU / CDN model:', gpuErr);
          landmarkerInstance = await PoseLandmarker.createFromOptions(visionFileset, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        }

        this.landmarker = landmarkerInstance;
        return this.landmarker;
      } catch (err) {
        console.error('Failed to initialize MediaPipe PoseLandmarker:', err);
        return null;
      } finally {
        this.isInitializing = false;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Processes a video frame using detectForVideo.
   */
  detect(video: HTMLVideoElement, timestampMs: number): PoseFrameResult | null {
    if (!this.landmarker || video.readyState < 2) return null;

    try {
      const result: PoseLandmarkerResult = this.landmarker.detectForVideo(video, timestampMs);
      if (result && result.landmarks && result.landmarks.length > 0) {
        return {
          landmarks: result.landmarks[0],
          worldLandmarks: result.worldLandmarks && result.worldLandmarks.length > 0 ? result.worldLandmarks[0] : [],
          timestamp: timestampMs,
        };
      }
      return null;
    } catch (err) {
      console.warn('MediaPipe detection error on frame:', err);
      return null;
    }
  }

  isReady(): boolean {
    return this.landmarker !== null;
  }

  isLoading(): boolean {
    return this.isInitializing;
  }

  dispose() {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (e) {
        // ignore
      }
      this.landmarker = null;
    }
    this.isInitializing = false;
    this.initPromise = null;
  }
}

export const poseLandmarkerService = new PoseLandmarkerService();
