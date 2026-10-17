import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VideoAnalysisService,
  videoAnalysisService,
} from '../../features/webcam/videoAnalysisService';
import {
  VideoAnalysisResult,
  VideoComparisonResult,
  compareVideoAnalyses,
  MovementDeviation,
} from '../../features/webcam/observations';
import { assessmentService } from '../../services/assessmentService';
import {
  Upload,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Activity,
  FileVideo,
  Save,
  Check,
  Info,
  Scale,
  Sparkles,
  Link2,
  Unlink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CustomGlassTooltip } from '../../components/common/CustomGlassTooltip';

export const VideoComparisonPage: React.FC = () => {
  const navigate = useNavigate();

  // Video Files State
  const [refFile, setRefFile] = useState<File | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [refVideoUrl, setRefVideoUrl] = useState<string | null>(null);
  const [testVideoUrl, setTestVideoUrl] = useState<string | null>(null);

  // Validation States
  const [refError, setRefError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [refDuration, setRefDuration] = useState<number>(0);
  const [testDuration, setTestDuration] = useState<number>(0);

  // Analysis Progress
  const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);
  const [isAnalyzingTest, setIsAnalyzingTest] = useState(false);
  const [refProgress, setRefProgress] = useState<{ pct: number; text: string }>({ pct: 0, text: '' });
  const [testProgress, setTestProgress] = useState<{ pct: number; text: string }>({ pct: 0, text: '' });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Analysis Results
  const [refAnalysis, setRefAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [testAnalysis, setTestAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<VideoComparisonResult | null>(null);

  // Playback States
  const [isSyncPlayback, setIsSyncPlayback] = useState(true);
  const [isPlayingBoth, setIsPlayingBoth] = useState(false);
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [refCurrentTime, setRefCurrentTime] = useState(0);
  const [testCurrentTime, setTestCurrentTime] = useState(0);

  // Save to Backend State
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Video & Canvas DOM Refs
  const refVideoRef = useRef<HTMLVideoElement | null>(null);
  const testVideoRef = useRef<HTMLVideoElement | null>(null);
  const refCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup object URLs on unmount or file replacement
  useEffect(() => {
    return () => {
      if (refVideoUrl) URL.revokeObjectURL(refVideoUrl);
      if (testVideoUrl) URL.revokeObjectURL(testVideoUrl);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Handle Reference File Selection
  const handleRefFileChange = async (file: File) => {
    setRefError(null);
    setRefAnalysis(null);
    setComparisonResult(null);
    setSavedSuccess(false);

    if (refVideoUrl) URL.revokeObjectURL(refVideoUrl);

    const validation = await videoAnalysisService.validateVideoFile(file);
    if (!validation.valid) {
      setRefError(validation.error || 'Invalid video file.');
      return;
    }

    setRefFile(file);
    setRefDuration(validation.duration || 0);
    const url = URL.createObjectURL(file);
    setRefVideoUrl(url);
  };

  // Handle Test File Selection
  const handleTestFileChange = async (file: File) => {
    setTestError(null);
    setTestAnalysis(null);
    setComparisonResult(null);
    setSavedSuccess(false);

    if (testVideoUrl) URL.revokeObjectURL(testVideoUrl);

    const validation = await videoAnalysisService.validateVideoFile(file);
    if (!validation.valid) {
      setTestError(validation.error || 'Invalid video file.');
      return;
    }

    setTestFile(file);
    setTestDuration(validation.duration || 0);
    const url = URL.createObjectURL(file);
    setTestVideoUrl(url);
  };

  // Analyze Reference Video
  const analyzeReferenceVideo = async (): Promise<VideoAnalysisResult | null> => {
    if (!refFile) return null;
    setIsAnalyzingRef(true);
    setRefProgress({ pct: 5, text: 'Starting reference video analysis...' });

    try {
      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl;

      const result = await videoAnalysisService.analyzeVideoFile(refFile, {
        signal: abortCtrl.signal,
        onProgress: (pct, currentSec, totalSec, statusText) => {
          setRefProgress({ pct, text: statusText });
        },
      });

      setRefAnalysis(result);
      if (testAnalysis) {
        setComparisonResult(compareVideoAnalyses(result, testAnalysis));
      }
      return result;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setRefError(`Reference analysis error: ${err.message || 'Processing failed'}`);
      }
      return null;
    } finally {
      setIsAnalyzingRef(false);
    }
  };

  // Analyze Test Video
  const analyzeTestVideo = async (): Promise<VideoAnalysisResult | null> => {
    if (!testFile) return null;
    setIsAnalyzingTest(true);
    setTestProgress({ pct: 5, text: 'Starting test video analysis...' });

    try {
      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl;

      const result = await videoAnalysisService.analyzeVideoFile(testFile, {
        signal: abortCtrl.signal,
        onProgress: (pct, currentSec, totalSec, statusText) => {
          setTestProgress({ pct, text: statusText });
        },
      });

      setTestAnalysis(result);
      if (refAnalysis) {
        setComparisonResult(compareVideoAnalyses(refAnalysis, result));
      }
      return result;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setTestError(`Test analysis error: ${err.message || 'Processing failed'}`);
      }
      return null;
    } finally {
      setIsAnalyzingTest(false);
    }
  };

  // Analyze Both Videos Sequentially
  const analyzeBothVideos = async () => {
    if (!refFile || !testFile) {
      alert('Please upload both the Reference Video and Test Video before analyzing both.');
      return;
    }
    const refRes = await analyzeReferenceVideo();
    if (refRes) {
      const testRes = await analyzeTestVideo();
      if (testRes) {
        const comparison = compareVideoAnalyses(refRes, testRes);
        setComparisonResult(comparison);
      }
    }
  };

  // Cancel Running Analysis
  const cancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzingRef(false);
    setIsAnalyzingTest(false);
  };

  // Reset Everything
  const handleReset = () => {
    cancelAnalysis();
    if (refVideoUrl) URL.revokeObjectURL(refVideoUrl);
    if (testVideoUrl) URL.revokeObjectURL(testVideoUrl);
    setRefFile(null);
    setTestFile(null);
    setRefVideoUrl(null);
    setTestVideoUrl(null);
    setRefAnalysis(null);
    setTestAnalysis(null);
    setComparisonResult(null);
    setRefError(null);
    setTestError(null);
    setSavedSuccess(false);
  };

  // Skeleton Overlay Rendering Loop for Video Elements
  const drawVideoSkeleton = useCallback(
    (
      canvas: HTMLCanvasElement,
      video: HTMLVideoElement,
      analysis: VideoAnalysisResult | null
    ) => {
      const ctx = canvas.getContext('2d');
      if (!ctx || !video || video.readyState < 2) return;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!analysis || !analysis.trajectory || analysis.trajectory.length === 0) return;

      const currentTime = video.currentTime;
      // Find closest trajectory frame
      let closest = analysis.trajectory[0];
      let minDiff = Math.abs(closest.timeSec - currentTime);
      for (let i = 1; i < analysis.trajectory.length; i++) {
        const diff = Math.abs(analysis.trajectory[i].timeSec - currentTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = analysis.trajectory[i];
        }
      }

      if (!closest || !closest.landmarks || closest.landmarks.length < 29) return;

      const lms = closest.landmarks;
      const w = canvas.width;
      const h = canvas.height;
      const monitoredSide = analysis.monitoredLeg;

      const activeHipIdx = monitoredSide === 'right' ? 24 : 23;
      const activeKneeIdx = monitoredSide === 'right' ? 26 : 25;
      const activeAnkleIdx = monitoredSide === 'right' ? 28 : 27;

      const toPx = (lm: { x: number; y: number }) => ({ x: lm.x * w, y: lm.y * h });

      // Connections
      const connections: [number, number, string, number][] = [
        [activeHipIdx, activeKneeIdx, '#14b8a6', 4.5],
        [activeKneeIdx, activeAnkleIdx, '#14b8a6', 4.5],
        [11, 12, '#38bdf8', 2.5],
        [11, 23, '#38bdf8', 2.5],
        [12, 24, '#38bdf8', 2.5],
        [23, 24, '#38bdf8', 2.5],
        [monitoredSide === 'right' ? 23 : 24, monitoredSide === 'right' ? 25 : 26, '#64748b', 2],
        [monitoredSide === 'right' ? 25 : 26, monitoredSide === 'right' ? 27 : 28, '#64748b', 2],
      ];

      // Draw bones
      connections.forEach(([i, j, color, width]) => {
        const p1 = lms[i];
        const p2 = lms[j];
        if (p1 && p2 && (p1.visibility ?? 1) > 0.35 && (p2.visibility ?? 1) > 0.35) {
          const pt1 = toPx(p1);
          const pt2 = toPx(p2);
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      });

      // Draw joints
      lms.forEach((lm, idx) => {
        if ((lm.visibility ?? 1) > 0.35) {
          const pt = toPx(lm);
          const isKnee = idx === activeKneeIdx;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isKnee ? 8 : 4.5, 0, 2 * Math.PI);
          ctx.fillStyle = isKnee ? '#2dd4bf' : '#38bdf8';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          if (isKnee) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 14, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        }
      });

      // Draw knee angle badge
      const kneeLm = lms[activeKneeIdx];
      if (kneeLm) {
        const kneePt = toPx(kneeLm);
        const tagText = `${closest.angle.toFixed(1)}°`;
        ctx.font = 'bold 13px Inter, sans-serif';
        const textWidth = ctx.measureText(tagText).width;
        const tagX = kneePt.x + 14;
        const tagY = kneePt.y - 12;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#14b8a6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(tagX - 6, tagY - 14, textWidth + 12, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(tagText, tagX, tagY + 2);
      }
    },
    []
  );

  // Playback animation frame loop
  useEffect(() => {
    const loop = () => {
      if (refVideoRef.current && refCanvasRef.current) {
        setRefCurrentTime(refVideoRef.current.currentTime);
        drawVideoSkeleton(refCanvasRef.current, refVideoRef.current, refAnalysis);
      }
      if (testVideoRef.current && testCanvasRef.current) {
        setTestCurrentTime(testVideoRef.current.currentTime);
        drawVideoSkeleton(testCanvasRef.current, testVideoRef.current, testAnalysis);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [refAnalysis, testAnalysis, drawVideoSkeleton]);

  // Synchronized Play / Pause Controls
  const togglePlayBoth = () => {
    if (!refVideoRef.current || !testVideoRef.current) return;

    if (isPlayingBoth) {
      refVideoRef.current.pause();
      testVideoRef.current.pause();
      setIsPlayingBoth(false);
      setIsRefPlaying(false);
      setIsTestPlaying(false);
    } else {
      refVideoRef.current.play();
      testVideoRef.current.play();
      setIsPlayingBoth(true);
      setIsRefPlaying(true);
      setIsTestPlaying(true);
    }
  };

  const restartBoth = () => {
    if (refVideoRef.current) refVideoRef.current.currentTime = 0;
    if (testVideoRef.current) testVideoRef.current.currentTime = 0;
  };

  // Synchronized Progress Scrubber
  const handleSyncScrub = (progressPct: number) => {
    const fraction = progressPct / 100;
    if (refVideoRef.current && refDuration > 0) {
      refVideoRef.current.currentTime = fraction * refDuration;
    }
    if (testVideoRef.current && testDuration > 0) {
      testVideoRef.current.currentTime = fraction * testDuration;
    }
  };

  // Save Comparison Assessment to Database
  const handleSaveComparisonReport = async () => {
    if (!comparisonResult) return;
    setIsSaving(true);
    try {
      const observationsList = [
        `Video Comparison between Reference (${refFile?.name || 'Ref'}) and Test (${testFile?.name || 'Test'}).`,
        `Reference ROM: ${comparisonResult.referenceResult.rangeOfMotion}° | Test ROM: ${comparisonResult.testResult.rangeOfMotion}°.`,
        `Reference Reps: ${comparisonResult.referenceResult.validReps.length} | Test Reps: ${comparisonResult.testResult.validReps.length} (Incomplete: ${comparisonResult.testResult.incompleteAttempts.length}).`,
        ...comparisonResult.observedDeviations.map((d) => d.description),
        comparisonResult.clinicalGuidance,
      ];

      await assessmentService.createAssessment({
        exercise_name: 'Seated Knee Extension - Video Comparison',
        duration_seconds: comparisonResult.testResult.durationSeconds,
        repetition_count: comparisonResult.testResult.validReps.length,
        min_knee_angle: comparisonResult.testResult.minKneeAngle,
        max_knee_angle: comparisonResult.testResult.maxKneeAngle,
        range_of_motion: comparisonResult.testResult.rangeOfMotion,
        tracking_quality: comparisonResult.testResult.trackingQualityText,
        observations: observationsList,
        assessment_status: comparisonResult.comparisonStatus,
      });

      setSavedSuccess(true);
    } catch (err: any) {
      alert(`Failed to save comparison report: ${err?.message || 'Server error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const normalizedProgress =
    refDuration > 0 ? Math.min(100, Math.round((refCurrentTime / refDuration) * 100)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-page-enter">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge-violet">
              Computer Vision Kinematic Comparison
            </span>
            <span className="text-white/20 text-xs">•</span>
            <span className="text-xs font-semibold text-[#B7B8C8]">Seated Knee Extension</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Exercise Video Comparison
          </h1>
          <p className="text-xs sm:text-sm text-[#85879C] mt-1">
            Upload a reference recording and patient test video to assess kinematic posture, repetition consistency, and knee-angle trajectories.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-full border border-white/10 bg-[#171925] hover:bg-[#1f2233] text-[#B7B8C8] font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-[#85879C]" />
            <span>Reset</span>
          </button>

          {isAnalyzingRef || isAnalyzingTest ? (
            <button
              type="button"
              onClick={cancelAnalysis}
              className="px-4 py-2.5 rounded-full bg-[#FB7185] hover:bg-[#f4536d] text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>Cancel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={analyzeBothVideos}
              disabled={!refFile || !testFile}
              className="btn-pill-primary text-xs !py-2.5 !px-5 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Analyze Both Videos</span>
            </button>
          )}
        </div>
      </div>

      {/* DUAL UPLOAD PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT PANEL: Reference Video */}
        <div className="card-surface p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A78BFA]">
                Panel A
              </span>
              <h2 className="text-base font-bold text-white">Correct Reference Video</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#171925] border border-white/10 text-[#85879C] font-mono">
              MP4, WebM, MOV
            </span>
          </div>

          {!refFile ? (
            <label className="border-2 border-dashed border-white/10 hover:border-[#A78BFA]/50 bg-[#0B0D16] hover:bg-[#171925]/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
              <Upload className="w-8 h-8 text-[#85879C] mb-2" />
              <span className="text-xs font-bold text-white block mb-1">
                Upload Correct Reference Video
              </span>
              <span className="text-[11px] text-[#85879C]">
                Drag & drop or click to browse (Max 120MB)
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleRefFileChange(e.target.files[0]);
                  }
                }}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#171925] border border-white/10 text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  <FileVideo className="w-5 h-5 text-[#A78BFA] shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-white block truncate">{refFile.name}</span>
                    <span className="text-[11px] text-[#85879C]">
                      {(refFile.size / (1024 * 1024)).toFixed(1)} MB • {formatSec(refDuration)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRefFile(null);
                    setRefVideoUrl(null);
                    setRefAnalysis(null);
                  }}
                  className="text-xs text-[#FB7185] hover:underline font-semibold shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              {/* Progress bar if analyzing */}
              {isAnalyzingRef && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-[#A78BFA] font-medium">
                    <span>{refProgress.text}</span>
                    <span>{refProgress.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#A78BFA] transition-all duration-150"
                      style={{ width: `${refProgress.pct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={analyzeReferenceVideo}
                  disabled={isAnalyzingRef || isAnalyzingTest}
                  className="btn-pill-primary text-xs !py-2 !px-4 disabled:opacity-50"
                >
                  {isAnalyzingRef
                    ? 'Analyzing Reference...'
                    : isAnalyzingTest
                    ? 'Waiting for Test Video...'
                    : 'Analyze Reference Video'}
                </button>

                {refAnalysis && (
                  <span className="text-xs font-semibold text-[#34D399] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Analyzed ({refAnalysis.validReps.length} reps)</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {refError && (
            <div className="p-3 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/30 text-[#FB7185] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{refError}</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Test Execution Video */}
        <div className="card-surface p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7DE8F0]">
                Panel B
              </span>
              <h2 className="text-base font-bold text-white">Test / Patient Execution Video</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#171925] border border-white/10 text-[#85879C] font-mono">
              MP4, WebM, MOV
            </span>
          </div>

          {!testFile ? (
            <label className="border-2 border-dashed border-white/10 hover:border-[#7DE8F0]/50 bg-[#0B0D16] hover:bg-[#171925]/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
              <Upload className="w-8 h-8 text-[#85879C] mb-2" />
              <span className="text-xs font-bold text-white block mb-1">
                Upload Test / Execution Video
              </span>
              <span className="text-[11px] text-[#85879C]">
                Drag & drop or click to browse (Max 120MB)
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleTestFileChange(e.target.files[0]);
                  }
                }}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#171925] border border-white/10 text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  <FileVideo className="w-5 h-5 text-[#7DE8F0] shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-white block truncate">{testFile.name}</span>
                    <span className="text-[11px] text-[#85879C]">
                      {(testFile.size / (1024 * 1024)).toFixed(1)} MB • {formatSec(testDuration)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTestFile(null);
                    setTestVideoUrl(null);
                    setTestAnalysis(null);
                  }}
                  className="text-xs text-[#FB7185] hover:underline font-semibold shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              {/* Progress bar if analyzing */}
              {isAnalyzingTest && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-[#7DE8F0] font-medium">
                    <span>{testProgress.text}</span>
                    <span>{testProgress.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7DE8F0] transition-all duration-150"
                      style={{ width: `${testProgress.pct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={analyzeTestVideo}
                  disabled={isAnalyzingRef || isAnalyzingTest}
                  className="btn-pill-primary text-xs !py-2 !px-4 disabled:opacity-50"
                >
                  {isAnalyzingTest
                    ? 'Analyzing Test Video...'
                    : isAnalyzingRef
                    ? 'Waiting for Reference...'
                    : 'Analyze Test Video'}
                </button>

                {testAnalysis && (
                  <span className="text-xs font-semibold text-[#34D399] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Analyzed ({testAnalysis.validReps.length} reps)</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {testError && (
            <div className="p-3 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/30 text-[#FB7185] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{testError}</span>
            </div>
          )}
        </div>
      </div>

      {/* SIDE-BY-SIDE VIDEO PLAYBACK & CANVAS OVERLAYS */}
      {(refVideoUrl || testVideoUrl) && (
        <div className="bg-[#0B0D16] rounded-3xl p-5 sm:p-6 text-white space-y-5 border border-white/10 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] block mb-0.5">
                Side-by-Side Kinematic Visualizer
              </span>
              <h3 className="text-lg font-bold text-white">Synchronized Video Playback & Pose Tracking</h3>
            </div>

            {/* Synchronized Toolbar */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSyncPlayback((p) => !p)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isSyncPlayback
                    ? 'bg-[#A78BFA]/20 border-[#A78BFA]/40 text-[#A78BFA]'
                    : 'bg-[#171925] border-white/10 text-[#85879C] hover:text-white'
                }`}
              >
                {isSyncPlayback ? <Link2 className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
                <span>{isSyncPlayback ? 'Sync Progress: ON' : 'Independent'}</span>
              </button>

              <button
                type="button"
                onClick={togglePlayBoth}
                className="btn-pill-primary text-xs !py-1.5 !px-4 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {isPlayingBoth ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingBoth ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={restartBoth}
                className="p-2 rounded-full bg-[#171925] hover:bg-[#1f2233] border border-white/10 text-[#85879C] hover:text-white transition-colors"
                title="Restart playback from beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dual Video Screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Screen: Reference */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#85879C] font-semibold px-1">
                <span>Reference: {refFile?.name || 'No video'}</span>
                <span>{formatSec(refCurrentTime)} / {formatSec(refDuration)}</span>
              </div>

              <div className="relative aspect-video w-full bg-[#050509] rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                {refVideoUrl ? (
                  <>
                    <video
                      ref={refVideoRef}
                      src={refVideoUrl}
                      playsInline
                      muted
                      onPlay={() => setIsRefPlaying(true)}
                      onPause={() => setIsRefPlaying(false)}
                      className="w-full h-full object-contain"
                    />
                    <canvas
                      ref={refCanvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                    <div className="absolute top-3 left-3 bg-[#11131D]/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#A78BFA] border border-white/10">
                      REFERENCE
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-[#85879C]">Upload Reference Video to Preview</span>
                )}
              </div>
            </div>

            {/* Right Screen: Test */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#85879C] font-semibold px-1">
                <span>Test: {testFile?.name || 'No video'}</span>
                <span>{formatSec(testCurrentTime)} / {formatSec(testDuration)}</span>
              </div>

              <div className="relative aspect-video w-full bg-[#050509] rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                {testVideoUrl ? (
                  <>
                    <video
                      ref={testVideoRef}
                      src={testVideoUrl}
                      playsInline
                      muted
                      onPlay={() => setIsTestPlaying(true)}
                      onPause={() => setIsTestPlaying(false)}
                      className="w-full h-full object-contain"
                    />
                    <canvas
                      ref={testCanvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                    <div className="absolute top-3 left-3 bg-[#11131D]/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#7DE8F0] border border-white/10">
                      TEST EXECUTION
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-[#85879C]">Upload Test Video to Preview</span>
                )}
              </div>
            </div>
          </div>

          {/* Synchronized Progress Scrubber Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-[#85879C]">
              <span>Normalized Movement Progress</span>
              <span className="font-mono text-[#A78BFA] font-bold">{normalizedProgress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={normalizedProgress}
              onChange={(e) => handleSyncScrub(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#171925] rounded-lg appearance-none cursor-pointer accent-[#A78BFA]"
            />
          </div>
        </div>
      )}

      {/* COMPARISON RESULTS SECTION */}
      {comparisonResult && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Status Banner */}
          <div
            className={`p-6 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              comparisonResult.comparisonStatus === 'Meets configured criteria'
                ? 'bg-[#34D399]/10 border-[#34D399]/30 text-white'
                : comparisonResult.comparisonStatus === 'Needs improvement'
                ? 'bg-[#FBBF24]/10 border-[#FBBF24]/30 text-white'
                : 'bg-[#FB7185]/10 border-[#FB7185]/30 text-white'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#85879C]">
                  Assessment Outcome
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-black uppercase ${
                    comparisonResult.comparisonStatus === 'Meets configured criteria'
                      ? 'bg-[#34D399] text-[#050509]'
                      : comparisonResult.comparisonStatus === 'Needs improvement'
                      ? 'bg-[#FBBF24] text-[#050509]'
                      : 'bg-[#FB7185] text-white'
                  }`}
                >
                  {comparisonResult.comparisonStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium mt-1 max-w-3xl leading-relaxed text-[#B7B8C8]">
                {comparisonResult.clinicalGuidance}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {!savedSuccess ? (
                <button
                  type="button"
                  onClick={handleSaveComparisonReport}
                  disabled={isSaving}
                  className="btn-pill-primary text-xs !py-2.5 !px-5 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Comparison Report'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/patient/reports')}
                  className="px-5 py-2.5 rounded-full bg-[#34D399] text-[#050509] font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Saved! View Reports</span>
                </button>
              )}
            </div>
          </div>

          {/* OVERLAID KNEE ANGLE TRAJECTORY CHART */}
          <div className="glass-card p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A78BFA] block mb-0.5">
                  Kinematic Trajectory
                </span>
                <h3 className="text-lg font-bold text-white">
                  Overlaid Knee-Angle Movement Trajectories
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 glass-panel px-2.5 py-1 rounded-full border border-white/8">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA] shadow-xs shadow-[#A78BFA]/50" />
                  <span className="text-[#B7B8C8]">Reference Video</span>
                </div>
                <div className="flex items-center gap-1.5 glass-panel px-2.5 py-1 rounded-full border border-white/8">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7DE8F0] shadow-xs shadow-[#7DE8F0]/50" />
                  <span className="text-[#B7B8C8]">Test Video</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={comparisonResult.normalizedTrajectory}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="refLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#A78BFA" />
                      <stop offset="100%" stopColor="#C4B5FD" />
                    </linearGradient>
                    <linearGradient id="testLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7DE8F0" />
                      <stop offset="100%" stopColor="#22D3EE" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="progressPct"
                    unit="%"
                    tick={{ fontSize: 11, fill: '#85879C' }}
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <YAxis
                    domain={[60, 180]}
                    unit="°"
                    tick={{ fontSize: 11, fill: '#85879C' }}
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <Tooltip content={<CustomGlassTooltip unit="°" titlePrefix="Movement Cycle:" />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#B7B8C8', paddingTop: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="referenceAngle"
                    name="Reference Trajectory"
                    stroke="url(#refLineGrad)"
                    strokeWidth={2.8}
                    dot={false}
                    activeDot={{ r: 6, fill: '#A78BFA', stroke: '#FFFFFF', strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="testAngle"
                    name="Test Trajectory"
                    stroke="url(#testLineGrad)"
                    strokeWidth={2.8}
                    strokeDasharray="4 2"
                    dot={false}
                    activeDot={{ r: 6, fill: '#7DE8F0', stroke: '#FFFFFF', strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* COMPARISON METRICS TABLE */}
          <div className="card-surface overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A78BFA] block mb-0.5">
                  Kinematic Metrics
                </span>
                <h3 className="text-lg font-bold text-white">
                  Quantitative Biomechanical Comparison
                </h3>
              </div>
              <Scale className="w-5 h-5 text-[#A78BFA]" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0D16] text-[#85879C] font-bold border-b border-white/10 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-5">Biomechanical Metric</th>
                    <th className="py-3 px-5">Reference Video</th>
                    <th className="py-3 px-5">Test Execution Video</th>
                    <th className="py-3 px-5">Observable Difference</th>
                    <th className="py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {comparisonResult.metricComparisons.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#171925]/40 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-white">{item.metric}</td>
                      <td className="py-3.5 px-5 text-[#A78BFA] font-semibold">{item.referenceValue}</td>
                      <td className="py-3.5 px-5 text-[#B7B8C8] font-semibold">{item.testValue}</td>
                      <td className="py-3.5 px-5 text-[#85879C]">{item.differenceText}</td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.status === 'match'
                              ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                              : item.status === 'minor-diff'
                              ? 'bg-white/5 text-[#85879C] border border-white/10'
                              : 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30'
                          }`}
                        >
                          {item.status === 'match'
                            ? 'Matches Criteria'
                            : item.status === 'minor-diff'
                            ? 'Minor Variance'
                            : 'Deviation'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* OBSERVABLE DEVIATIONS & CLINICAL GUIDANCE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Deviations List */}
            <div className="card-surface p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <AlertTriangle className="w-5 h-5 text-[#FBBF24]" />
                <h4 className="text-base font-bold text-white">Observable Movement Deviations</h4>
              </div>

              {comparisonResult.observedDeviations.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#34D399]/10 border border-[#34D399]/20 text-xs text-[#34D399] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    No significant movement deviations detected. Extension range, hold duration, and trunk stability all satisfied configured criteria.
                  </span>
                </div>
              ) : (
                <ul className="space-y-2.5 text-xs">
                  {comparisonResult.observedDeviations.map((dev: MovementDeviation, idx: number) => (
                    <li
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#171925] border border-white/10 text-white space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-[#FBBF24]">
                        <span>{dev.type}</span>
                        {dev.repNumber && <span>Repetition {dev.repNumber}</span>}
                      </div>
                      <p className="text-[#85879C]">{dev.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Right: Physiotherapy Guidance */}
            <div className="card-surface p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Activity className="w-5 h-5 text-[#A78BFA]" />
                <h4 className="text-base font-bold text-white">Physiotherapy Correction Guidance</h4>
              </div>

              <div className="space-y-3 text-xs text-[#85879C] leading-relaxed">
                <p>
                  <strong className="text-white">Terminal Knee Extension:</strong> Ensure the lower leg is extended fully to straight knee position (≥168°) while keeping the thigh resting comfortably on the seat.
                </p>
                <p>
                  <strong className="text-white">Controlled Eccentric Return:</strong> Lower the leg with control back to 90° resting flexion (≤115°) before beginning the next repetition.
                </p>
                <p>
                  <strong className="text-white">Avoid Trunk Substitution:</strong> Avoid leaning backward during the kick. Compensatory trunk extension indicates quadriceps fatigue or hip flexor recruitment.
                </p>

                <div className="p-3.5 rounded-2xl bg-[#0B0D16] border border-white/10 text-[#85879C] text-[11px]">
                  <strong className="text-white">Methodological Notice:</strong> This experimental video comparison utilizes Google MediaPipe Tasks Vision Pose Landmarker for geometric angle measurement. It is intended for exercise monitoring and not as standalone medical diagnosis.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoComparisonPage;
