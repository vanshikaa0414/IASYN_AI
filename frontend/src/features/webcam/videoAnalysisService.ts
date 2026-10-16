import { poseLandmarkerService, PoseFrameResult } from './poseLandmarkerService';
import { AngleCalculator } from './angleCalculator';
import { RepetitionCounter } from './repCounter';
import {
  analyzeSessionObservations,
  VideoAnalysisResult,
  TrajectoryPoint,
} from './observations';

export interface VideoAnalysisOptions {
  monitoredLeg?: 'auto' | 'right' | 'left';
  sampleFps?: number; // Default 15 fps (every 66ms)
  onProgress?: (progressPct: number, currentSec: number, totalSec: number, statusText: string) => void;
  signal?: AbortSignal;
}

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
  duration?: number;
  width?: number;
  height?: number;
}

// Global monotonic timestamp offset to guarantee detectForVideo never receives non-increasing timestamps
let globalMonotonicTimeCounter = 100000;

export class VideoAnalysisService {
  /**
   * Validates video file format, size, duration, and decodability.
   */
  async validateVideoFile(file: File): Promise<VideoValidationResult> {
    const validExtensions = ['.mp4', '.webm', '.mov'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt && !file.type.startsWith('video/')) {
      return {
        valid: false,
        error: `Unsupported file format "${file.name}". Supported formats: MP4, WebM, MOV.`,
      };
    }

    // Limit size to 120MB to prevent browser tab crashes
    const maxSizeBytes = 120 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed size (120 MB).`,
      };
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const metadata = await new Promise<{ duration: number; width: number; height: number }>(
        (resolve, reject) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.muted = true;
          video.playsInline = true;

          const timer = setTimeout(() => {
            reject(new Error('Video metadata loading timed out. The file may be corrupt or encoded with an unsupported codec.'));
          }, 8000);

          video.onloadedmetadata = () => {
            clearTimeout(timer);
            resolve({
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
            });
          };

          video.onerror = () => {
            clearTimeout(timer);
            reject(new Error('Browser failed to decode video file. Please check video codec.'));
          };

          video.src = objectUrl;
        }
      );

      if (metadata.duration <= 0.5) {
        return {
          valid: false,
          error: 'Video is too short (under 1 second). Please provide an exercise recording.',
        };
      }

      if (metadata.duration > 300) {
        return {
          valid: false,
          error: 'Video duration exceeds 5 minutes. Please trim the recording before uploading.',
        };
      }

      return {
        valid: true,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || 'Failed to decode video file.',
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Analyzes an uploaded video file asynchronously using MediaPipe Pose Landmarker.
   */
  async analyzeVideoFile(
    file: File,
    options: VideoAnalysisOptions = {}
  ): Promise<VideoAnalysisResult> {
    const sampleFps = options.sampleFps ?? 15;
    const stepSec = 1.0 / sampleFps;

    // 1. Ensure MediaPipe is loaded
    const landmarker = await poseLandmarkerService.initialize();
    if (!landmarker) {
      throw new Error('MediaPipe PoseLandmarker service could not be initialized.');
    }

    if (options.signal?.aborted) {
      throw new Error('Analysis was cancelled.');
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    try {
      // 2. Wait for video metadata
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('Could not load video element.'));
      });

      const totalDuration = video.duration;
      const angleCalc = new AngleCalculator();
      const repCounter = new RepetitionCounter();

      const trajectory: TrajectoryPoint[] = [];
      const confidenceScores: number[] = [];
      let detectedLeg: 'right' | 'left' = options.monitoredLeg !== 'auto' && options.monitoredLeg ? options.monitoredLeg : 'right';
      let legDetermined = options.monitoredLeg !== 'auto' && !!options.monitoredLeg;

      let currentTime = 0;
      let frameCount = 0;

      // Base timestamp for MediaPipe monotonic requirement
      globalMonotonicTimeCounter += 10000;
      const baseMonotonicTimestamp = globalMonotonicTimeCounter;

      options.onProgress?.(5, 0, totalDuration, 'Initializing video analysis pipeline...');

      while (currentTime <= totalDuration) {
        if (options.signal?.aborted) {
          throw new Error('Analysis was cancelled by user.');
        }

        // Seek video to currentTime
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = currentTime;
        });

        // Current monotonic timestamp for MediaPipe
        const frameTimestampMs = baseMonotonicTimestamp + Math.round(currentTime * 1000);
        const relativeTimestampMs = Math.round(currentTime * 1000);

        // Run Pose Detection
        const frameResult: PoseFrameResult | null = poseLandmarkerService.detect(video, frameTimestampMs);

        if (frameResult && frameResult.landmarks && frameResult.landmarks.length >= 29) {
          const lms = frameResult.landmarks;

          // If leg is not yet locked, lock it based on visibility of the first clear frame
          if (!legDetermined) {
            const rightVis = lms[26]?.visibility ?? 0;
            const leftVis = lms[25]?.visibility ?? 0;
            detectedLeg = rightVis >= leftVis ? 'right' : 'left';
            legDetermined = true;
          }

          const hipIdx = detectedLeg === 'right' ? 24 : 23;
          const kneeIdx = detectedLeg === 'right' ? 26 : 25;
          const ankleIdx = detectedLeg === 'right' ? 28 : 27;
          const shoulderIdx = detectedLeg === 'right' ? 12 : 11;

          const hip = lms[hipIdx];
          const knee = lms[kneeIdx];
          const ankle = lms[ankleIdx];
          const shoulder = lms[shoulderIdx];

          const conf = angleCalc.calculateConfidence(hip, knee, ankle);
          confidenceScores.push(conf);

          if (conf >= 0.40) {
            // Calculate interior knee angle with 1-Euro smoothing
            const smoothedTriplet = angleCalc.smoothLandmarkTriplet(hip, knee, ankle, relativeTimestampMs);
            const smoothedShoulder = angleCalc.smoothShoulder(shoulder, relativeTimestampMs);

            const angle = angleCalc.calculateKneeAngle(
              smoothedTriplet.hip,
              smoothedTriplet.knee,
              smoothedTriplet.ankle,
              relativeTimestampMs
            );
            const rawAngle = angleCalc.calculateRawKneeAngle(hip, knee, ankle);
            const trunkAngle = angleCalc.calculateTrunkAngle(smoothedShoulder, smoothedTriplet.hip);

            // Process repetition state machine
            const repState = repCounter.processFrame(angle, trunkAngle, conf, relativeTimestampMs);

            trajectory.push({
              timeSec: Math.round(currentTime * 100) / 100,
              angle,
              rawAngle,
              trunkAngle,
              phase: repState.phase,
              landmarks: lms.map((lm, idx) => {
                if (idx === hipIdx) return { x: smoothedTriplet.hip.x, y: smoothedTriplet.hip.y, visibility: lm.visibility };
                if (idx === kneeIdx) return { x: smoothedTriplet.knee.x, y: smoothedTriplet.knee.y, visibility: lm.visibility };
                if (idx === ankleIdx) return { x: smoothedTriplet.ankle.x, y: smoothedTriplet.ankle.y, visibility: lm.visibility };
                if (idx === shoulderIdx) return { x: smoothedShoulder.x, y: smoothedShoulder.y, visibility: lm.visibility };
                return { x: lm.x, y: lm.y, visibility: lm.visibility };
              }),
            });
          } else {
            // Low confidence frame
            trajectory.push({
              timeSec: Math.round(currentTime * 100) / 100,
              angle: trajectory.length > 0 ? trajectory[trajectory.length - 1].angle : 90.0,
              trunkAngle: 0,
              phase: 'WAITING',
            });
          }
        } else {
          // No landmark detected
          confidenceScores.push(0.0);
          trajectory.push({
            timeSec: Math.round(currentTime * 100) / 100,
            angle: trajectory.length > 0 ? trajectory[trajectory.length - 1].angle : 90.0,
            trunkAngle: 0,
            phase: 'WAITING',
          });
        }

        frameCount++;
        currentTime += stepSec;

        // Report progress every 3 frames to avoid overwhelming UI
        if (frameCount % 3 === 0 || currentTime > totalDuration) {
          const pct = Math.min(98, Math.round((currentTime / totalDuration) * 90) + 5);
          options.onProgress?.(
            pct,
            Math.min(totalDuration, currentTime),
            totalDuration,
            `Analyzing movement (${Math.round(currentTime)}s / ${Math.round(totalDuration)}s)...`
          );
          // Yield to main event loop briefly so browser doesn't freeze
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // Compute Session Observations and Final Metrics
      const avgConfidence =
        confidenceScores.length > 0
          ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
          : 0.0;

      const extrema = repCounter.getSessionExtrema();
      const validReps = repCounter.getCompletedReps();
      const incompleteAttempts = repCounter.getIncompleteAttempts();

      const summary = analyzeSessionObservations(
        validReps,
        avgConfidence,
        totalDuration,
        extrema,
        incompleteAttempts
      );

      const trackingQualityScore = Math.round(avgConfidence * 100) / 100;
      let trackingQualityText = 'Suboptimal (<40% Confidence)';
      if (avgConfidence >= 0.80) {
        trackingQualityText = `Optimal (${Math.round(avgConfidence * 100)}% Confidence)`;
      } else if (avgConfidence >= 0.60) {
        trackingQualityText = `Good (${Math.round(avgConfidence * 100)}% Confidence)`;
      } else if (avgConfidence >= 0.40) {
        trackingQualityText = `Fair (${Math.round(avgConfidence * 100)}% Confidence)`;
      }

      options.onProgress?.(100, totalDuration, totalDuration, 'Analysis complete.');

      return {
        videoName: file.name,
        durationSeconds: Math.round(totalDuration * 10) / 10,
        validReps,
        incompleteAttempts,
        minKneeAngle: summary.minKneeAngle,
        maxKneeAngle: summary.maxKneeAngle,
        rangeOfMotion: summary.rangeOfMotion,
        avgRepDuration: summary.avgRepDuration,
        avgHoldDuration: summary.avgHoldDuration,
        maxTrunkLean: summary.maxTrunkLean,
        trackingQualityScore,
        trackingQualityText,
        trajectory,
        assessmentStatus: summary.assessmentStatus,
        summary,
        monitoredLeg: detectedLeg,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    }
  }
}

export const videoAnalysisService = new VideoAnalysisService();
