import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AngleCalculator } from '../../features/webcam/angleCalculator';
import { RepetitionCounter, ExercisePhase } from '../../features/webcam/repCounter';
import {
  analyzeSessionObservations,
  evaluateLivePosture,
  SessionAssessmentSummary,
  LivePostureCheck,
} from '../../features/webcam/observations';
import { poseLandmarkerService } from '../../features/webcam/poseLandmarkerService';
import { Live3DPoseVisualization } from '../../features/webcam/Live3DPoseVisualization';
import { LiveAngleTelemetryGraph } from '../../features/webcam/LiveAngleTelemetryGraph';
import { assessmentService } from '../../services/assessmentService';
import { useToast } from '../../context/ToastContext';
import { NormalizedLandmark, Landmark } from '@mediapipe/tasks-vision';
import {
  Camera,
  CameraOff,
  Play,
  Square,
  Save,
  AlertCircle,
  CheckCircle2,
  Activity,
  Info,
  Check,
  HelpCircle,
  FlipHorizontal,
  Download,
} from 'lucide-react';

export const LiveAssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Camera & Stream State
  const [cameraActive, setCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [selectedLeg, setSelectedLeg] = useState<'auto' | 'right' | 'left'>('auto');
  const [activeLegInUse, setActiveLegInUse] = useState<'right' | 'left'>('right');

  // Recording & Session State
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  // Real-time Kinematics Metrics
  const [currentAngle, setCurrentAngle] = useState(90.0);
  const [repCount, setRepCount] = useState(0);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [passedAttempts, setPassedAttempts] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [unassessableAttempts, setUnassessableAttempts] = useState(0);
  const [movementPassRate, setMovementPassRate] = useState<number | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ExercisePhase>('WAITING');
  const [extensionProgress, setExtensionProgress] = useState(0);
  const [trackingConfidence, setTrackingConfidence] = useState(0.0);
  const [isTrackingReliable, setIsTrackingReliable] = useState(false);
  const [livePosture, setLivePosture] = useState<LivePostureCheck>({
    trunkStable: true,
    trunkAngle: 0,
    extensionReached: false,
    returnReached: true,
    trackingReliable: false,
    liveFeedback: 'Camera offline. Click "Start Camera" to begin assessment.',
  });

  // 3D World Landmarks for separate Three.js visualization
  const [worldLandmarks, setWorldLandmarks] = useState<Landmark[] | null>(null);

  // Summary Report Modal State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryReport, setSummaryReport] = useState<SessionAssessmentSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Refs for Video, Canvas, and Streams
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  // Stability & Leg Locking Refs
  const lockedSideRef = useRef<'right' | 'left' | null>(null);
  const lastUiUpdateRef = useRef<number>(0);
  const currentDisplayAngleRef = useRef<number>(90.0);

  // MediaRecorder refs for private local video recording and authenticated upload
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Algorithmic processing instances with 1-Euro filter and display deadband
  const angleCalcRef = useRef(new AngleCalculator(0.35, { minCutoff: 0.8, beta: 0.05 }, 0.8));
  const repCounterRef = useRef(new RepetitionCounter());
  const timerIntervalRef = useRef<any>(null);

  // Format seconds to mm:ss
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      poseLandmarkerService.dispose();
    };
  }, []);

  // Stop Camera & Stream
  const stopCameraStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsTrackingReliable(false);
    setTrackingConfidence(0.0);
    setWorldLandmarks(null);
  }, []);

  // Stop Camera Button Handler
  const stopCamera = () => {
    if (isRecording) {
      endAssessment();
    }
    stopCameraStream();
    setLivePosture({
      trunkStable: true,
      trunkAngle: 0,
      extensionReached: false,
      returnReached: true,
      trackingReliable: false,
      liveFeedback: 'Camera turned off.',
    });
  };

  // Start Camera Button Handler
  const startCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);

    try {
      // 1. Initialize MediaPipe PoseLandmarker
      const landmarker = await poseLandmarkerService.initialize();
      if (!landmarker) {
        throw new Error('MediaPipe PoseLandmarker could not be initialized.');
      }

      // 2. Request user webcam via MediaDevices API
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      lastVideoTimeRef.current = -1;
      startDetectionLoop();
    } catch (err: any) {
      console.error('Camera or MediaPipe initialization failed:', err);
      let errorMsg = 'Unable to access webcam. Please verify device permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings to continue.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device was detected on your system. Please connect a webcam.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setCameraError(errorMsg);
      setCameraActive(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Continuous Landmark Detection & Canvas Rendering Loop
  const startDetectionLoop = () => {
    const renderFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      // Match canvas dimensions to video intrinsic resolution
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const now = performance.now();

      // Only perform landmark inference if the video frame timestamp has advanced
      let frameResult = null;
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        frameResult = poseLandmarkerService.detect(video, now);
      }

      // Clear previous canvas drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (frameResult && frameResult.landmarks && frameResult.landmarks.length >= 29) {
        const lms = frameResult.landmarks;
        const wLms = frameResult.worldLandmarks;

        // Stable camera-side leg selection: lock leg once detected or explicitly selected; do not flip-flop per frame
        let side: 'right' | 'left' = activeLegInUse;
        if (selectedLeg === 'auto') {
          if (!lockedSideRef.current) {
            const rightVis = lms[26]?.visibility ?? 0;
            const leftVis = lms[25]?.visibility ?? 0;
            if (rightVis > 0.35 || leftVis > 0.35) {
              side = rightVis >= leftVis ? 'right' : 'left';
              lockedSideRef.current = side;
              setActiveLegInUse(side);
            }
          } else {
            side = lockedSideRef.current;
          }
        } else {
          side = selectedLeg;
          lockedSideRef.current = side;
          if (activeLegInUse !== side) {
            setActiveLegInUse(side);
          }
        }

        // Extract landmark indices for selected side
        const hipIdx = side === 'right' ? 24 : 23;
        const kneeIdx = side === 'right' ? 26 : 25;
        const ankleIdx = side === 'right' ? 28 : 27;
        const shoulderIdx = side === 'right' ? 12 : 11;

        const rawHip = lms[hipIdx];
        const rawKnee = lms[kneeIdx];
        const rawAnkle = lms[ankleIdx];
        const rawShoulder = lms[shoulderIdx];

        // Calculate confidence
        const confidence = angleCalcRef.current.calculateConfidence(rawHip, rawKnee, rawAnkle);
        const reliable = confidence >= 0.40;

        // Clone landmarks array so we can smooth key joints for rock-solid 2D skeleton rendering
        const smoothedLms = [...lms];

        if (reliable) {
          // Smooth 2D landmarks with speed-adaptive 1-Euro filters to eliminate stationary jitter
          const smoothedTriplet = angleCalcRef.current.smoothLandmarkTriplet(rawHip, rawKnee, rawAnkle, now);
          const smoothedShoulder = angleCalcRef.current.smoothShoulder(rawShoulder, now);

          smoothedLms[hipIdx] = { ...rawHip, x: smoothedTriplet.hip.x, y: smoothedTriplet.hip.y };
          smoothedLms[kneeIdx] = { ...rawKnee, x: smoothedTriplet.knee.x, y: smoothedTriplet.knee.y };
          smoothedLms[ankleIdx] = { ...rawAnkle, x: smoothedTriplet.ankle.x, y: smoothedTriplet.ankle.y };
          smoothedLms[shoulderIdx] = { ...rawShoulder, x: smoothedShoulder.x, y: smoothedShoulder.y };

          // Calculate knee angle with vector geometry and 1-Euro temporal smoothing
          const filteredAngle = angleCalcRef.current.calculateKneeAngle(
            smoothedTriplet.hip,
            smoothedTriplet.knee,
            smoothedTriplet.ankle,
            now
          );

          // Apply display deadband (e.g. 0.8°) to prevent decimal place fluctuation when stationary
          const displayAngle = angleCalcRef.current.getDisplayAngle(filteredAngle);
          const trunkAngle = angleCalcRef.current.calculateTrunkAngle(smoothedShoulder, smoothedTriplet.hip);

          // Update repetition state machine
          const repResult = repCounterRef.current.processFrame(filteredAngle, trunkAngle, confidence, now);

          // Throttle UI React state updates (~20 Hz or on rep/incomplete event) to avoid excessive re-renders
          const shouldUpdateUi =
            now - lastUiUpdateRef.current >= 50 ||
            repResult.newRepCompleted ||
            repResult.newIncompleteRecorded;

          if (shouldUpdateUi) {
            lastUiUpdateRef.current = now;
            setTrackingConfidence(confidence);
            setIsTrackingReliable(true);

            if (Math.abs(displayAngle - currentDisplayAngleRef.current) >= 0.1) {
              currentDisplayAngleRef.current = displayAngle;
              setCurrentAngle(displayAngle);
            }

            setRepCount(repResult.repCount);
            setTotalAttempts(repResult.totalAttempts);
            setPassedAttempts(repResult.passedAttempts);
            setFailedAttempts(repResult.failedAttempts);
            setUnassessableAttempts(repResult.unassessableAttempts);
            setMovementPassRate(repResult.movementPassRate);
            setIncompleteCount(repResult.failedAttempts + repResult.unassessableAttempts);
            setCurrentPhase(repResult.phase);
            setExtensionProgress(repResult.extensionProgress);

            const postureEval = evaluateLivePosture(filteredAngle, trunkAngle, confidence);
            setLivePosture(postureEval);

            if (wLms && wLms.length >= 29) {
              setWorldLandmarks(wLms);
            }
          }
        } else {
          // Tracking quality insufficient
          const shouldUpdateUi = now - lastUiUpdateRef.current >= 200;
          if (shouldUpdateUi) {
            lastUiUpdateRef.current = now;
            setIsTrackingReliable(false);
            setTrackingConfidence(confidence);
            setLivePosture({
              trunkStable: true,
              trunkAngle: 0,
              extensionReached: false,
              returnReached: true,
              trackingReliable: false,
              liveFeedback: 'Tracking temporarily unavailable — reposition camera in side profile view.',
            });
          }
        }

        // Draw 2D Skeleton Overlay onto Canvas using smoothed landmarks
        drawPoseSkeleton(ctx, smoothedLms, canvas.width, canvas.height, side, reliable);
      } else {
        // No body detected
        const shouldUpdateUi = now - lastUiUpdateRef.current >= 250;
        if (shouldUpdateUi) {
          lastUiUpdateRef.current = now;
          setIsTrackingReliable(false);
          setTrackingConfidence(0.0);
          setWorldLandmarks(null);
          setLivePosture({
            trunkStable: true,
            trunkAngle: 0,
            extensionReached: false,
            returnReached: true,
            trackingReliable: false,
            liveFeedback: 'No person detected in frame. Step into camera view.',
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  };

  // Draw 2D Pose Skeleton Overlay on Video Canvas
  const drawPoseSkeleton = (
    ctx: CanvasRenderingContext2D,
    lms: NormalizedLandmark[],
    width: number,
    height: number,
    monitoredSide: 'right' | 'left',
    isReliable: boolean
  ) => {
    ctx.save();

    // If mirrored preview is enabled, mirror the canvas transform so coordinates align with video
    if (isMirrored) {
      ctx.scale(-1, 1);
      ctx.translate(-width, 0);
    }

    // Convert normalized [0, 1] landmark to canvas pixel coordinate
    const toPx = (lm: NormalizedLandmark) => ({
      x: lm.x * width,
      y: lm.y * height,
      vis: lm.visibility ?? 1,
    });

    const activeHipIdx = monitoredSide === 'right' ? 24 : 23;
    const activeKneeIdx = monitoredSide === 'right' ? 26 : 25;
    const activeAnkleIdx = monitoredSide === 'right' ? 28 : 27;

    // Bone connection definitions
    const connections: [number, number, string, number][] = [
      // Monitored Leg (Bright Teal, thick 4.5px line)
      [activeHipIdx, activeKneeIdx, '#14b8a6', 4.5],
      [activeKneeIdx, activeAnkleIdx, '#14b8a6', 4.5],
      // Torso / Pelvis
      [11, 12, '#38bdf8', 2.5],
      [11, 23, '#38bdf8', 2.5],
      [12, 24, '#38bdf8', 2.5],
      [23, 24, '#38bdf8', 2.5],
      // Arms
      [11, 13, '#64748b', 2],
      [13, 15, '#64748b', 2],
      [12, 14, '#64748b', 2],
      [14, 16, '#64748b', 2],
      // Non-monitored Leg (subtle slate/blue)
      [monitoredSide === 'right' ? 23 : 24, monitoredSide === 'right' ? 25 : 26, '#64748b', 2.5],
      [monitoredSide === 'right' ? 25 : 26, monitoredSide === 'right' ? 27 : 28, '#64748b', 2.5],
    ];

    // 1. Draw connecting bone lines
    connections.forEach(([i, j, color, lineWidth]) => {
      const p1 = lms[i];
      const p2 = lms[j];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.35 && (p2.visibility ?? 1) > 0.35) {
        const pt1 = toPx(p1);
        const pt2 = toPx(p2);

        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    });

    // 2. Draw anatomical landmark joints
    const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    jointIndices.forEach((idx) => {
      const lm = lms[idx];
      if (lm && (lm.visibility ?? 1) > 0.35) {
        const pt = toPx(lm);
        const isMonitoredKnee = idx === activeKneeIdx;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isMonitoredKnee ? 8 : 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = isMonitoredKnee ? '#2dd4bf' : '#38bdf8';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Outer glowing ring on monitored knee
        if (isMonitoredKnee) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 14, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }
    });

    // 3. Draw live angle annotation pill near the knee
    const kneeLm = lms[activeKneeIdx];
    if (kneeLm && (kneeLm.visibility ?? 1) > 0.4 && isReliable) {
      const kneePt = toPx(kneeLm);

      ctx.restore(); // Restore context to render non-mirrored text annotation
      ctx.save();

      // Account for mirrored coordinate when placing text tag
      const displayX = isMirrored ? width - kneePt.x : kneePt.x;
      const displayY = kneePt.y;

      const angleText = `${currentAngle.toFixed(1)}°`;
      ctx.font = 'bold 13px Inter, sans-serif';
      const textWidth = ctx.measureText(angleText).width;

      const tagX = displayX + 16;
      const tagY = displayY - 14;

      // Draw dark background pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tagX - 6, tagY - 14, textWidth + 12, 22, 6);
      ctx.fill();
      ctx.stroke();

      // Draw angle text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(angleText, tagX, tagY + 2);
    }

    ctx.restore();
  };

  // Monitored leg selection handler with filter reset
  const handleSelectLeg = (sideOption: 'auto' | 'right' | 'left') => {
    setSelectedLeg(sideOption);
    if (sideOption !== 'auto') {
      lockedSideRef.current = sideOption;
      setActiveLegInUse(sideOption);
    } else {
      lockedSideRef.current = null;
    }
    angleCalcRef.current.reset();
  };

  // Start Recording Session Button Handler
  const startRecording = () => {
    if (!cameraActive) {
      alert('Please start the camera first before recording.');
      return;
    }

    // Reset metrics and filters
    angleCalcRef.current.reset();
    repCounterRef.current.reset();
    if (selectedLeg === 'auto') {
      lockedSideRef.current = null;
    }
    setRepCount(0);
    setIncompleteCount(0);
    setTotalAttempts(0);
    setPassedAttempts(0);
    setFailedAttempts(0);
    setUnassessableAttempts(0);
    setMovementPassRate(null);
    setSessionTime(0);
    setIsRecording(true);
    setShowSummaryModal(false);
    setSavedSuccess(false);
    recordedBlobRef.current = null;
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl(null);

    // Initialize MediaRecorder using browser-supported video MIME type
    try {
      if (streamRef.current && typeof MediaRecorder !== 'undefined') {
        recordedChunksRef.current = [];
        const supportedMime = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4'
        ].find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

        const recorder = new MediaRecorder(streamRef.current, { mimeType: supportedMime });
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { type: supportedMime });
            recordedBlobRef.current = blob;
            const url = URL.createObjectURL(blob);
            setRecordedVideoUrl(url);
          }
        };
        recorder.start(500); // 500ms chunk intervals
        mediaRecorderRef.current = recorder;
      }
    } catch (recErr) {
      console.warn('MediaRecorder not available or failed to start:', recErr);
    }

    // Start Session Timer
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);
  };

  // End Assessment Button Handler
  const endAssessment = () => {
    setIsRecording(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
    }

    // Generate comprehensive clinical summary report with attempt-level classification
    const completedReps = repCounterRef.current.getCompletedReps();
    const incompleteAttempts = repCounterRef.current.getIncompleteAttempts();
    const attempts = repCounterRef.current.getAttempts();
    const extrema = repCounterRef.current.getSessionExtrema();
    const summary = analyzeSessionObservations(
      completedReps,
      trackingConfidence,
      sessionTime,
      extrema,
      incompleteAttempts,
      attempts,
      {
        min_extension_angle: repCounterRef.current.config.extensionThreshold,
        max_starting_angle: repCounterRef.current.config.restThreshold,
        min_hold_seconds: repCounterRef.current.config.minHoldDurationSeconds,
        max_trunk_compensation_deg: repCounterRef.current.config.maxTrunkLeanDeg
      }
    );

    setSummaryReport(summary);
    setShowSummaryModal(true);
  };

  // Save Assessment to SQLite Backend with explicit consent choice
  const handleSaveAssessment = async (saveVideo: boolean) => {
    if (!summaryReport) return;
    setIsSaving(true);
    try {
      const created = await assessmentService.createAssessment({
        exercise_name: 'Seated Knee Extension',
        duration_seconds: sessionTime,
        repetition_count: summaryReport.repetitionCount,
        min_knee_angle: summaryReport.minKneeAngle,
        max_knee_angle: summaryReport.maxKneeAngle,
        range_of_motion: summaryReport.rangeOfMotion,
        tracking_quality: summaryReport.trackingQuality,
        observations: summaryReport.observations,
        assessment_status: summaryReport.assessmentStatus,
        total_attempts: summaryReport.totalAttempts,
        passed_attempts: summaryReport.passedAttempts,
        failed_attempts: summaryReport.failedAttempts,
        unassessable_attempts: summaryReport.unassessableAttempts,
        movement_pass_rate: summaryReport.movementPassRate,
        attempts: summaryReport.attempts,
        configured_criteria: summaryReport.configuredCriteria,
      });

      // If user consents to video saving, upload recorded blob to private storage
      if (saveVideo && recordedBlobRef.current) {
        await assessmentService.uploadAssessmentVideo(created.id, recordedBlobRef.current);
      }

      setSavedSuccess(true);
      showToast('Report Saved Successfully!', 'Your kinematics and session data were securely recorded.', 'success');
    } catch (err: any) {
      alert(`Failed to save report: ${err?.message || 'Server connection error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Download recorded video directly to user's computer / Downloads folder
  const handleDownloadVideo = () => {
    if (!recordedBlobRef.current && !recordedVideoUrl) return;

    let extension = 'webm';
    if (recordedBlobRef.current?.type) {
      if (recordedBlobRef.current.type.includes('mp4')) {
        extension = 'mp4';
      } else if (recordedBlobRef.current.type.includes('webm')) {
        extension = 'webm';
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `IASYN_Knee_Extension_Assessment_${timestamp}.${extension}`;

    const url = recordedVideoUrl || (recordedBlobRef.current ? URL.createObjectURL(recordedBlobRef.current) : null);
    if (!url) return;

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast('Download Started', `Saving ${filename} to your Downloads folder.`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge-violet">
              Google MediaPipe Tasks Vision Pose Landmarker
            </span>
            <span className="text-white/20 text-xs">•</span>
            <span className="text-xs font-semibold text-[#B7B8C8]">Seated Knee Extension</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Live Knee Assessment
          </h1>
          <p className="text-xs text-[#85879C] mt-0.5">
            Real-time seated knee-extension analysis & 3D biomechanical tracking
          </p>
        </div>

        {/* Top Camera Controls */}
        <div className="flex items-center gap-2.5">
          {cameraActive ? (
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2.5 rounded-full bg-[#171925] hover:bg-[#1f2233] border border-white/10 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
            >
              <CameraOff className="w-4 h-4 text-[#FB7185]" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              disabled={isCameraLoading}
              className="btn-pill-primary text-xs !py-2.5 !px-5 flex items-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{isCameraLoading ? 'Initializing MediaPipe...' : 'Start Camera'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 7 & 11: MAIN 2-COLUMN EQUAL-SIZED WORKSPACE */}
      {/* Left = Live Camera (4:3) | Right = 3D Pose Visualization (4:3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* LEFT PANEL: Live Camera Feed & Skeleton Canvas */}
        <div className="relative aspect-[4/3] w-full bg-[#0B0D16] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
          {/* Real HTML Video Element */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-contain ${isMirrored ? 'scale-x-[-1]' : ''} ${
              !cameraActive ? 'hidden' : 'block'
            }`}
          />

          {/* Skeleton Overlay Canvas */}
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none ${
              !cameraActive ? 'hidden' : 'block'
            }`}
          />

          {/* Camera Offline Placeholder */}
          {!cameraActive && (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-md z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#11131D] border border-white/10 flex items-center justify-center text-[#A78BFA] mb-4 shadow-inner">
                <Camera className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Webcam Offline</h3>
              <p className="text-xs text-[#85879C] leading-relaxed mb-4">
                Position your camera 5 to 7 feet away showing your side profile (hip, knee, and ankle clearly visible).
              </p>

              {cameraError ? (
                <div className="p-3 mb-4 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/30 text-[#FB7185] text-xs text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={startCamera}
                disabled={isCameraLoading}
                className="btn-pill-primary text-xs !py-2.5 !px-6 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>{isCameraLoading ? 'Starting Device Camera...' : 'Turn On Camera'}</span>
              </button>
            </div>
          )}

          {/* Live Camera Overlays (when active) */}
          {cameraActive && (
            <>
              {/* Top-Left Live Status Badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <div className="bg-[#11131D]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white flex items-center gap-2 shadow-md">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isTrackingReliable ? 'bg-[#7DE8F0] animate-pulse' : 'bg-[#FBBF24]'
                    }`}
                  />
                  <span className="font-semibold text-[11px]">
                    {isTrackingReliable ? 'MediaPipe Tracking' : 'Searching for Joints'}
                  </span>
                  <span className="text-[#85879C] font-mono text-[11px]">
                    ({Math.round(trackingConfidence * 100)}%)
                  </span>
                </div>

                {isRecording && (
                  <div className="bg-[#FB7185]/20 border border-[#FB7185]/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-[#FB7185] flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-[#FB7185] animate-ping" />
                    <span className="font-bold">REC</span>
                    <span className="font-mono font-bold text-white">{formatTimer(sessionTime)}</span>
                  </div>
                )}
              </div>

              {/* Bottom-Center Feedback Banner */}
              <div className="absolute bottom-3 left-3 right-3 z-10">
                <div
                  className={`px-4 py-2 rounded-xl backdrop-blur-md border text-xs flex items-center justify-between shadow-lg ${
                    isTrackingReliable
                      ? livePosture.trunkStable
                        ? 'bg-[#11131D]/90 border-[#A78BFA]/30 text-white'
                        : 'bg-[#FBBF24]/15 border-[#FBBF24]/40 text-[#FBBF24]'
                      : 'bg-[#FB7185]/15 border-[#FB7185]/40 text-[#FB7185]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#A78BFA] shrink-0" />
                    <span className="font-medium text-[11px] sm:text-xs">{livePosture.liveFeedback}</span>
                  </div>

                  <span className="font-mono text-[11px] text-[#7DE8F0] font-bold shrink-0 ml-2">
                    SIDE: {activeLegInUse.toUpperCase()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL: 3D Pose Visualization (Equal 4:3 aspect ratio) */}
        <div className="relative aspect-[4/3] w-full glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
          <Live3DPoseVisualization
            worldLandmarks={worldLandmarks}
            monitoredSide={activeLegInUse}
            isTracking={isTrackingReliable}
          />
        </div>
      </div>

      {/* SECOND ROW: COMPACT METRIC CARDS (6-column responsive grid with frosted glass) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Live Joint Angle */}
        <div className="glass-card glass-card-hover p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#85879C]">Knee Angle</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                currentPhase === 'KNEE EXTENDED'
                  ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                  : currentPhase === 'EXTENDING'
                  ? 'bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30'
                  : currentPhase === 'RETURNING'
                  ? 'bg-[#7DE8F0]/20 text-[#7DE8F0] border border-[#7DE8F0]/30'
                  : 'bg-white/5 text-[#85879C]'
              }`}
            >
              {currentPhase === 'KNEE EXTENDED' ? 'EXTENDED' : currentPhase}
            </span>
          </div>
          <div className="my-1">
            <span className="text-3xl font-black text-white tracking-tight">{currentAngle.toFixed(1)}°</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[#85879C]">
              <span>ROM: <strong className="text-[#A78BFA]">{extensionProgress}%</strong></span>
              <span>≥168°</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-[#7C6CF5] to-[#A78BFA]"
                style={{ width: `${extensionProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Valid Repetitions */}
        <div className="glass-card glass-card-hover p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#85879C]">Valid Reps</span>
          <div className="my-1">
            <span className="text-3xl font-black text-[#A78BFA] tracking-tight">{repCount}</span>
          </div>
          <div className="text-[10px] text-[#85879C]">
            Target: 8–12 reps
          </div>
        </div>

        {/* Card 3: Passed Attempts */}
        <div className="glass-card glass-card-hover p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#85879C]">Passed</span>
            <span className="text-[9px] font-bold text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/30 px-1.5 py-0.5 rounded">PASS</span>
          </div>
          <div className="my-1">
            <span className="text-3xl font-black text-[#34D399] tracking-tight">{passedAttempts}</span>
          </div>
          <div className="text-[10px] text-[#85879C]">
            Rate: {movementPassRate !== null ? `${movementPassRate}%` : 'N/A'}
          </div>
        </div>

        {/* Card 4: Failed Attempts */}
        <div className="glass-card glass-card-hover p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#85879C]">Failed</span>
            <span className="text-[9px] font-bold text-[#FB7185] bg-[#FB7185]/15 border border-[#FB7185]/30 px-1.5 py-0.5 rounded">FAIL</span>
          </div>
          <div className="my-1">
            <span className="text-3xl font-black text-[#FB7185] tracking-tight">{failedAttempts}</span>
          </div>
          <div className="text-[10px] text-[#85879C]">
            Unassessable: {unassessableAttempts}
          </div>
        </div>

        {/* Card 5: Tracking Quality */}
        <div className="glass-card glass-card-hover p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#85879C]">Tracking</span>
          <div className="my-1">
            <span className="text-3xl font-black text-[#7DE8F0] tracking-tight">
              {Math.round(trackingConfidence * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                trackingConfidence >= 0.7
                  ? 'bg-[#34D399]'
                  : trackingConfidence >= 0.4
                  ? 'bg-[#FBBF24]'
                  : 'bg-[#FB7185]'
              }`}
              style={{ width: `${Math.round(trackingConfidence * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 6: Session Duration */}
        <div className="glass-card glass-card-hover p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#85879C]">Duration</span>
            {isRecording && (
              <span className="w-2 h-2 rounded-full bg-[#FB7185] animate-ping" />
            )}
          </div>
          <div className="my-1">
            <span className="text-3xl font-black text-white font-mono tracking-tight">
              {formatTimer(sessionTime)}
            </span>
          </div>
          <div className="text-[10px] text-[#85879C]">
            {isRecording ? 'Session Active' : 'Standby'}
          </div>
        </div>
      </div>

      {/* REAL-TIME KNEE ANGLE TELEMETRY GRAPH */}
      <LiveAngleTelemetryGraph
        currentAngle={currentAngle}
        isTracking={isTrackingReliable}
        activePhase={currentPhase}
        rom={repCounterRef.current ? repCounterRef.current.getSessionExtrema().rom : 0}
        maxAngle={repCounterRef.current ? repCounterRef.current.getSessionExtrema().max : 0}
        minAngle={repCounterRef.current ? repCounterRef.current.getSessionExtrema().min : 0}
        targetExtension={repCounterRef.current?.config?.extensionThreshold || 168}
        flexionThreshold={repCounterRef.current?.config?.restThreshold || 115}
      />

      {/* THIRD ROW: RECORDING ACTION BAR */}
      <div className="glass-elevated rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isRecording ? 'bg-[#FB7185] text-white animate-pulse' : 'bg-[#171925] border border-white/10 text-[#A78BFA]'
            }`}
          >
            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                {isRecording ? 'Assessment Session In Progress' : 'Ready to Record Assessment'}
              </span>
              {isRecording && (
                <span className="px-2 py-0.5 rounded-full bg-[#FB7185]/20 border border-[#FB7185]/40 text-[#FB7185] text-[10px] font-bold">
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-[#85879C]">
              {isRecording
                ? `Recording time: ${formatTimer(sessionTime)} • ${repCount} reps validated • ${passedAttempts} passed`
                : 'Click Start Recording when positioned. Repetitions and kinematics will be collected.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {!isRecording ? (
            <>
              {recordedVideoUrl && (
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="px-4 py-2.5 rounded-full glass-pill hover:bg-[#1f2233] text-[#7DE8F0] font-semibold text-xs border border-white/10 shadow-sm transition-all flex items-center justify-center gap-2"
                  title="Save captured exercise video directly to your Downloads folder"
                >
                  <Download className="w-4 h-4 text-[#7DE8F0]" />
                  <span>Download Video</span>
                </button>
              )}
              {summaryReport && (
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(true)}
                  className="px-4 py-2.5 rounded-full glass-pill hover:bg-[#1f2233] text-white font-semibold text-xs border border-white/10 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Activity className="w-4 h-4 text-[#A78BFA]" />
                  <span>Review Report</span>
                </button>
              )}
              <button
                type="button"
                onClick={startRecording}
                className="btn-pill-primary text-xs !py-2.5 !px-6 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{recordedVideoUrl ? 'Record New Session' : 'Start Recording'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={endAssessment}
              className="px-6 py-2.5 rounded-full bg-[#FB7185] hover:bg-[#f4536d] text-white font-bold text-xs shadow-lg shadow-[#FB7185]/20 transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>End Assessment & Review Report</span>
            </button>
          )}
        </div>
      </div>

      {/* FOURTH ROW: CONTROLS & BIOMECHANICAL STANDARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Toolbar & Side Selector */}
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#B7B8C8]">Monitored Leg:</span>
            <div className="flex rounded-xl bg-[#0B0D16] p-0.5 border border-white/10">
              {(['auto', 'right', 'left'] as const).map((sideOption) => (
                <button
                  key={sideOption}
                  type="button"
                  onClick={() => handleSelectLeg(sideOption)}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors capitalize ${
                    selectedLeg === sideOption
                      ? 'bg-[#A78BFA] text-[#050509] shadow-xs'
                      : 'text-[#85879C] hover:text-white'
                  }`}
                >
                  {sideOption}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMirrored((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isMirrored
                  ? 'bg-[#A78BFA]/20 border-[#A78BFA]/40 text-[#A78BFA]'
                  : 'bg-[#171925] border-white/10 text-[#85879C] hover:text-white'
              }`}
              title="Toggle horizontal mirror orientation"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>{isMirrored ? 'Mirrored (Selfie)' : 'Standard'}</span>
            </button>
          </div>
        </div>

        {/* Biomechanical Standards Summary */}
        <div className="glass-card p-4 flex items-start gap-3 text-xs">
          <HelpCircle className="w-4 h-4 text-[#A78BFA] shrink-0 mt-0.5" />
          <div className="space-y-1 text-[#85879C]">
            <span className="font-bold text-white block">Standard Biomechanical Criteria:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <span>Terminal Extension: <strong className="text-white">≥168°</strong></span>
              <span>Seated Return: <strong className="text-white">≤115°</strong></span>
              <span>Trunk Lean: <strong className="text-white">&lt;18° tilt</strong></span>
              <span>Camera Distance: <strong className="text-white">5–7 ft side-view</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL ASSESSMENT REPORT MODAL */}
      {showSummaryModal && summaryReport && (
        <div className="fixed inset-0 z-50 bg-[#050509]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-modal rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-white/15 space-y-5 my-8">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A78BFA] block mb-0.5">
                  Assessment Completed
                </span>
                <h3 className="text-2xl font-black text-white">Rehabilitation Report</h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  summaryReport.assessmentStatus === 'Meets configured criteria'
                    ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                    : 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30'
                }`}
              >
                {summaryReport.assessmentStatus}
              </span>
            </div>

            {/* Recorded Video Player with Interactive Attempt Seek & Direct Download */}
            {recordedVideoUrl ? (
              <div className="rounded-2xl overflow-hidden bg-[#0B0D16] border border-white/10 space-y-1">
                <video
                  ref={previewVideoRef}
                  src={recordedVideoUrl}
                  controls
                  className="w-full max-h-56 object-contain bg-[#050509]"
                />
                <div className="px-3 py-2 bg-[#171925] text-[11px] text-[#B7B8C8] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#A78BFA]">Captured Session Video</span>
                    <span className="text-[#85879C] hidden sm:inline">• Click attempts below to seek</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadVideo}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#A78BFA] hover:bg-[#906ef7] text-[#050509] font-bold text-xs shadow-xs transition-colors"
                    title="Download recorded exercise video to your local Downloads folder"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download to Device</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#171925] rounded-xl text-center text-xs text-[#85879C]">
                Video recording unavailable — metrics-only assessment.
              </div>
            )}

            {/* Attempt-Level Analysis & Pass Rate Card */}
            <div className="bg-[#171925] p-4 rounded-2xl border border-white/10 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Attempt-Level Exercise Analysis
                </span>
                <span className="font-bold text-[#A78BFA] bg-[#A78BFA]/20 px-2.5 py-0.5 rounded-full border border-[#A78BFA]/30">
                  Pass Rate: {summaryReport.movementPassRate !== null ? `${summaryReport.movementPassRate}%` : 'N/A'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#11131D] p-2 rounded-xl border border-white/5">
                  <span className="text-[#85879C] block text-[10px]">Total Attempts</span>
                  <span className="text-lg font-black text-white">{summaryReport.totalAttempts}</span>
                </div>
                <div className="bg-[#34D399]/10 p-2 rounded-xl border border-[#34D399]/20">
                  <span className="text-[#34D399] block text-[10px]">Passed</span>
                  <span className="text-lg font-black text-[#34D399]">{summaryReport.passedAttempts}</span>
                </div>
                <div className="bg-[#FB7185]/10 p-2 rounded-xl border border-[#FB7185]/20">
                  <span className="text-[#FB7185] block text-[10px]">Failed</span>
                  <span className="text-lg font-black text-[#FB7185]">{summaryReport.failedAttempts}</span>
                </div>
                <div className="bg-[#FBBF24]/10 p-2 rounded-xl border border-[#FBBF24]/20">
                  <span className="text-[#FBBF24] block text-[10px]">Unassessable</span>
                  <span className="text-lg font-black text-[#FBBF24]">{summaryReport.unassessableAttempts}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px]">
                <div>
                  <span className="text-[#85879C] block">Valid Repetitions:</span>
                  <strong className="text-[#A78BFA]">{summaryReport.repetitionCount}</strong>
                </div>
                <div>
                  <span className="text-[#85879C] block">Range of Motion:</span>
                  <strong className="text-[#A78BFA]">{summaryReport.rangeOfMotion}°</strong>
                </div>
                <div>
                  <span className="text-[#85879C] block">Min Knee Flexion:</span>
                  <strong className="text-white">{summaryReport.minKneeAngle}°</strong>
                </div>
                <div>
                  <span className="text-[#85879C] block">Max Extension:</span>
                  <strong className="text-white">{summaryReport.maxKneeAngle}°</strong>
                </div>
              </div>
            </div>

            {/* Interactive Attempt Breakdown List */}
            {summaryReport.attempts && summaryReport.attempts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#B7B8C8]">
                    Attempt Breakdown & Timeline
                  </h4>
                  <span className="text-[10px] text-[#85879C]">Click to jump in video</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {summaryReport.attempts.map((att) => (
                    <div
                      key={att.attempt_number}
                      onClick={() => {
                        if (previewVideoRef.current && att.start_time !== undefined) {
                          previewVideoRef.current.currentTime = att.start_time;
                          previewVideoRef.current.play();
                        }
                      }}
                      className="p-2.5 rounded-xl border bg-[#171925] hover:bg-[#1f2233] border-white/10 transition-colors cursor-pointer text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">Attempt #{att.attempt_number}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#11131D] text-[10px] font-mono text-[#85879C]">
                            {formatTimer(Math.floor(att.start_time))} - {formatTimer(Math.floor(att.end_time))}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            att.outcome === 'PASS'
                              ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                              : att.outcome === 'FAIL'
                              ? 'bg-[#FB7185]/20 text-[#FB7185] border border-[#FB7185]/30'
                              : 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30'
                          }`}
                        >
                          {att.outcome}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-[#B7B8C8]">
                        <span>Max Extension: <strong className="text-white">{att.max_knee_angle}°</strong></span>
                        <span>ROM: <strong className="text-white">{att.range_of_motion}°</strong></span>
                        {att.trunk_lean_max > 0 && (
                          <span>Trunk Lean: <strong className="text-white">{att.trunk_lean_max}°</strong></span>
                        )}
                      </div>

                      {att.deviations && att.deviations.length > 0 && (
                        <div className="text-[10px] text-[#FB7185] space-y-0.5 pt-0.5">
                          {att.deviations.map((dev, dIdx) => (
                            <div key={dIdx} className="flex items-center gap-1">
                              <span>•</span>
                              <span>{dev}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observations List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#B7B8C8] mb-1.5">
                Movement & Posture Observations
              </h4>
              <ul className="space-y-1.5 text-xs text-[#85879C]">
                {summaryReport.observations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-[#171925] p-2 rounded-xl border border-white/5">
                    <span className="text-[#A78BFA] font-bold shrink-0">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#171925] hover:bg-[#1f2233] text-[#B7B8C8] font-semibold text-xs transition-colors border border-white/10"
              >
                Cancel
              </button>

              {!savedSuccess ? (
                <>
                  {recordedVideoUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadVideo}
                      className="px-4 py-2.5 rounded-full bg-[#171925] hover:bg-[#1f2233] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                      title="Save video file directly to your local Downloads folder"
                    >
                      <Download className="w-4 h-4 text-[#7DE8F0]" />
                      <span>Download Video</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveAssessment(false)}
                    disabled={isSaving}
                    className="flex-1 w-full py-2.5 rounded-full bg-[#171925] hover:bg-[#1f2233] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 border border-white/10"
                  >
                    <span>Save Metrics Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveAssessment(true)}
                    disabled={isSaving || !recordedVideoUrl}
                    className="flex-1 w-full py-2.5 rounded-full btn-pill-primary text-xs !py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Uploading & Saving...' : 'Save Video and Report'}</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                  {recordedVideoUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadVideo}
                      className="px-4 py-2.5 rounded-full bg-[#171925] hover:bg-[#1f2233] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                      title="Save another copy to your local Downloads folder"
                    >
                      <Download className="w-4 h-4 text-[#7DE8F0]" />
                      <span>Download Video</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/patient/reports')}
                    className="flex-1 w-full py-2.5 rounded-full bg-[#34D399] hover:bg-[#2cb683] text-[#050509] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Report Saved! View in My Reports</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

