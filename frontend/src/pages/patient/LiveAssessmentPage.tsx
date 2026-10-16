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
import { assessmentService } from '../../services/assessmentService';
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
} from 'lucide-react';

export const LiveAssessmentPage: React.FC = () => {
  const navigate = useNavigate();

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

  // MediaRecorder refs for optional local in-browser video review
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Algorithmic processing instances
  const angleCalcRef = useRef(new AngleCalculator(0.35));
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

        // Auto-select monitored side based on visibility and position, or use chosen side
        let side: 'right' | 'left' = 'right';
        if (selectedLeg === 'auto') {
          // Compare visibility of right knee (26) vs left knee (25)
          const rightVis = lms[26]?.visibility ?? 0;
          const leftVis = lms[25]?.visibility ?? 0;
          side = rightVis >= leftVis ? 'right' : 'left';
        } else {
          side = selectedLeg;
        }
        setActiveLegInUse(side);

        // Extract landmark indices for selected side
        const hipIdx = side === 'right' ? 24 : 23;
        const kneeIdx = side === 'right' ? 26 : 25;
        const ankleIdx = side === 'right' ? 28 : 27;
        const shoulderIdx = side === 'right' ? 12 : 11;

        const hip = lms[hipIdx];
        const knee = lms[kneeIdx];
        const ankle = lms[ankleIdx];
        const shoulder = lms[shoulderIdx];

        // Calculate confidence
        const confidence = angleCalcRef.current.calculateConfidence(hip, knee, ankle);
        setTrackingConfidence(confidence);

        const reliable = confidence >= 0.40;
        setIsTrackingReliable(reliable);

        if (reliable) {
          // Calculate knee angle with vector geometry + EMA smoothing
          const angle = angleCalcRef.current.calculateKneeAngle(hip, knee, ankle);
          const trunkAngle = angleCalcRef.current.calculateTrunkAngle(shoulder, hip);

          setCurrentAngle(angle);

          // Update repetition state machine
          const repResult = repCounterRef.current.processFrame(angle, trunkAngle, confidence, now);
          setRepCount(repResult.repCount);
          setCurrentPhase(repResult.phase);
          setExtensionProgress(repResult.extensionProgress);

          // Evaluate real-time posture
          const postureEval = evaluateLivePosture(angle, trunkAngle, confidence);
          setLivePosture(postureEval);

          // Send 3D world landmarks to Three.js stick figure
          if (wLms && wLms.length >= 29) {
            setWorldLandmarks(wLms);
          }
        } else {
          setLivePosture((prev) => ({
            ...prev,
            trackingReliable: false,
            liveFeedback: 'Unable to assess — please reposition camera to show hip, knee & ankle clearly.',
          }));
        }

        // Draw 2D Skeleton Overlay onto Canvas
        drawPoseSkeleton(ctx, lms, canvas.width, canvas.height, side, reliable);
      } else {
        // No body detected
        setIsTrackingReliable(false);
        setTrackingConfidence(0.0);
        setWorldLandmarks(null);
        setLivePosture((prev) => ({
          ...prev,
          trackingReliable: false,
          liveFeedback: 'No person detected in frame. Step into camera view.',
        }));
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

  // Start Recording Session Button Handler
  const startRecording = () => {
    if (!cameraActive) {
      alert('Please start the camera first before recording.');
      return;
    }

    // Reset metrics
    angleCalcRef.current.reset();
    repCounterRef.current.reset();
    setRepCount(0);
    setSessionTime(0);
    setIsRecording(true);
    setShowSummaryModal(false);
    setSavedSuccess(false);
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl(null);

    // Initialize MediaRecorder for local in-memory preview
    try {
      if (streamRef.current && typeof MediaRecorder !== 'undefined') {
        recordedChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

        const recorder = new MediaRecorder(streamRef.current, { mimeType });
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
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

    // Generate comprehensive clinical summary report
    const completedReps = repCounterRef.current.getCompletedReps();
    const extrema = repCounterRef.current.getSessionExtrema();
    const summary = analyzeSessionObservations(
      completedReps,
      trackingConfidence,
      sessionTime,
      extrema
    );

    setSummaryReport(summary);
    setShowSummaryModal(true);
  };

  // Save Assessment to SQLite Backend
  const handleSaveAssessment = async () => {
    if (!summaryReport) return;
    setIsSaving(true);
    try {
      await assessmentService.createAssessment({
        exercise_name: 'Seated Knee Extension',
        duration_seconds: sessionTime,
        repetition_count: summaryReport.repetitionCount,
        min_knee_angle: summaryReport.minKneeAngle,
        max_knee_angle: summaryReport.maxKneeAngle,
        range_of_motion: summaryReport.rangeOfMotion,
        tracking_quality: summaryReport.trackingQuality,
        observations: summaryReport.observations,
        assessment_status: summaryReport.assessmentStatus,
      });
      setSavedSuccess(true);
    } catch (err: any) {
      alert(`Failed to save report: ${err?.message || 'Server connection error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
              Google MediaPipe Tasks Vision Pose Landmarker
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-600">Seated Knee Extension</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Live Webcam Assessment
          </h1>
        </div>

        {/* Top Camera Controls */}
        <div className="flex items-center gap-2.5">
          {cameraActive ? (
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs"
            >
              <CameraOff className="w-4 h-4 text-rose-400" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              disabled={isCameraLoading}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{isCameraLoading ? 'Initializing MediaPipe...' : 'Start Camera'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid: LEFT = Video Feed & Overlay | RIGHT = 3D Skeleton & Real-time Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Live Camera Feed & Skeleton Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center">
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
              <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 mb-4 shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-1">Webcam Offline</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Position your camera 5 to 7 feet away showing your side profile (hip, knee, and ankle clearly visible).
                </p>

                {cameraError ? (
                  <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs text-left flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isCameraLoading}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
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
                  <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-white flex items-center gap-2 shadow-md">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isTrackingReliable ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-semibold">
                      {isTrackingReliable ? 'MediaPipe Tracking' : 'Searching for Joints'}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      ({Math.round(trackingConfidence * 100)}%)
                    </span>
                  </div>

                  {isRecording && (
                    <div className="bg-rose-950/85 border border-rose-700/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-rose-200 flex items-center gap-1.5 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
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
                          ? 'bg-slate-900/85 border-teal-500/50 text-slate-100'
                          : 'bg-amber-950/90 border-amber-600/60 text-amber-100'
                        : 'bg-rose-950/90 border-rose-700/70 text-rose-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="font-medium">{livePosture.liveFeedback}</span>
                    </div>

                    <span className="font-mono text-[11px] text-teal-300 font-bold shrink-0 ml-2">
                      Side: {activeLegInUse.toUpperCase()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Camera Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Monitored Leg:</span>
              <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                {(['auto', 'right', 'left'] as const).map((sideOption) => (
                  <button
                    key={sideOption}
                    type="button"
                    onClick={() => setSelectedLeg(sideOption)}
                    className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors capitalize ${
                      selectedLeg === sideOption
                        ? 'bg-white text-teal-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
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
                    ? 'bg-teal-50 border-teal-200 text-teal-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Toggle horizontal mirror orientation"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{isMirrored ? 'Mirrored (Selfie)' : 'Standard'}</span>
              </button>
            </div>
          </div>

          {/* Setup Instructions Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-800 block">Biomechanical Setup Guide:</span>
              <p>
                1. Sit sideways to your webcam on a stable chair so your hip, knee, and ankle joints are visible.
              </p>
              <p>
                2. Wear contrasting or fitted clothing so joint contours can be detected accurately without occlusion.
              </p>
              <p>
                3. Keep your back supported against the chair to isolate quadriceps contraction without compensatory trunk leaning.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live 3D Pose Visualization & Real-time Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live 3D Pose Visualization Panel */}
          <div className="h-[270px]">
            <Live3DPoseVisualization
              worldLandmarks={worldLandmarks}
              monitoredSide={activeLegInUse}
              isTracking={isTrackingReliable}
            />
          </div>

          {/* Real-time Knee Angle & Extension Progress Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live Joint Angle
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  currentPhase === 'KNEE EXTENDED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : currentPhase === 'EXTENDING'
                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                    : currentPhase === 'RETURNING'
                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {currentPhase}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 tracking-tight">
                {currentAngle.toFixed(1)}°
              </span>
              <span className="text-xs font-medium text-slate-400">Interior Knee Flexion</span>
            </div>

            {/* Extension Progress Gauge */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-medium text-slate-500">
                <span>Extension Progress: <strong className="text-teal-700">{extensionProgress}%</strong></span>
                <span className="text-teal-700 font-bold">Target: ≥168°</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-teal-500 to-cyan-500"
                  style={{ width: `${extensionProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Repetition Counter Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Repetitions Completed
              </span>
              <Activity className="w-4 h-4 text-teal-600" />
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-black text-teal-700 tracking-tight">{repCount}</span>
              <span className="text-xs font-medium text-slate-400">Valid Extensions</span>
            </div>
            <p className="text-[11px] text-slate-500">
              State-machine hysteresis requires full cycle (&gt;150° extension, &lt;115° return).
            </p>
          </div>

          {/* Live Posture Observations & Tracking Quality Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">Tracking Confidence</span>
                <span className="font-bold text-teal-700">{Math.round(trackingConfidence * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    trackingConfidence >= 0.7
                      ? 'bg-teal-500'
                      : trackingConfidence >= 0.4
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.round(trackingConfidence * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 block mb-2">
                Active Assessment Criteria
              </span>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      currentAngle >= 165 ? 'text-teal-600' : 'text-slate-300'
                    }`}
                  />
                  <span>Terminal Extension Target: ≥168°</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      currentAngle <= 115 ? 'text-teal-600' : 'text-slate-300'
                    }`}
                  />
                  <span>Seated Return Threshold: ≤115°</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      livePosture.trunkStable ? 'text-teal-600' : 'text-amber-500'
                    }`}
                  />
                  <span>
                    Trunk Stability (Limit &lt;18° tilt):{' '}
                    <strong className={livePosture.trunkStable ? 'text-slate-800' : 'text-amber-700'}>
                      ~{Math.round(livePosture.trunkAngle)}°
                    </strong>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* BELOW: Recording Action Bar */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-teal-400'
            }`}
          >
            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {isRecording ? 'Assessment Session In Progress' : 'Ready to Record Assessment'}
              </span>
              {isRecording && (
                <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold">
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isRecording
                ? `Recording time: ${formatTimer(sessionTime)} • ${repCount} reps logged`
                : 'Click Start Recording when positioned. Repetitions and kinematics will be collected.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={endAssessment}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>End Assessment & Review Report</span>
            </button>
          )}
        </div>
      </div>

      {/* FINAL ASSESSMENT REPORT MODAL */}
      {showSummaryModal && summaryReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 block mb-0.5">
                  Assessment Completed
                </span>
                <h3 className="text-2xl font-black text-slate-900">Rehabilitation Report</h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  summaryReport.assessmentStatus === 'Meets configured criteria'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {summaryReport.assessmentStatus}
              </span>
            </div>

            {/* Optional Local Video Preview (in-browser only) */}
            {recordedVideoUrl && (
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                <video
                  src={recordedVideoUrl}
                  controls
                  className="w-full max-h-48 object-contain bg-slate-950"
                />
                <div className="px-3 py-1.5 bg-slate-900 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Local Video Review</span>
                  <span className="italic">Stored in browser memory only — not uploaded</span>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Exercise</span>
                <span className="font-bold text-slate-900">Seated Knee Extension</span>
              </div>
              <div>
                <span className="text-slate-500 block">Duration</span>
                <span className="font-bold text-slate-900">{formatTimer(sessionTime)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Repetitions</span>
                <span className="font-bold text-teal-700 text-sm">{summaryReport.repetitionCount}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Range of Motion</span>
                <span className="font-bold text-teal-700 text-sm">{summaryReport.rangeOfMotion}°</span>
              </div>
              <div>
                <span className="text-slate-500 block">Min / Max Knee Angle</span>
                <span className="font-semibold text-slate-800">
                  {summaryReport.minKneeAngle}° / {summaryReport.maxKneeAngle}°
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tracking Quality</span>
                <span className="font-semibold text-slate-800">{summaryReport.trackingQuality}</span>
              </div>
            </div>

            {/* Observations List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Movement & Posture Observations
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {summaryReport.observations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-teal-600 font-bold shrink-0">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Metadata Footer */}
            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100 text-[11px] text-teal-900 space-y-0.5">
              <span className="font-bold block">Methodology & Reference Targets:</span>
              <span>
                Assessment Method: MediaPipe Tasks Vision Pose Landmarker • Target Extension: ≥168° • Starting Flexion: ≤115° • Max Trunk Lean: &lt;18°
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Close
              </button>

              {!savedSuccess ? (
                <button
                  type="button"
                  onClick={handleSaveAssessment}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving to Database...' : 'Save Assessment to Doctor Portal'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/patient/reports')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Saved! View in My Reports</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
