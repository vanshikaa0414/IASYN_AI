import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doctorService } from '../../services/doctorService';
import { assessmentService } from '../../services/assessmentService';
import { useToast } from '../../context/ToastContext';
import { WebcamAssessment, AttemptDetail } from '../../types/assessment';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { CustomGlassTooltip } from '../../components/common/CustomGlassTooltip';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Stethoscope, 
  Calendar, 
  AlertCircle, 
  Save, 
  Check, 
  Activity,
  User as UserIcon,
  ShieldCheck,
  Send,
  Video,
  Play,
  RotateCcw,
  Sliders,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronRight,
  Download
} from 'lucide-react';

export const AssessmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [assessment, setAssessment] = useState<WebcamAssessment | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAttemptIdx, setActiveAttemptIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    doctorService
      .getAssessmentDetail(parseInt(id, 10))
      .then((res) => {
        setAssessment(res);
        if (res.feedback) {
          setFeedbackText(res.feedback.feedback_text);
        }
      })
      .catch((err) => {
        console.error('Failed to load assessment detail:', err);
        setError('Failed to load the requested assessment.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !feedbackText.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const fb = await doctorService.submitFeedback(parseInt(id, 10), feedbackText.trim());
      setSuccessMessage(true);
      showToast('Feedback Saved & Reviewed', 'Clinical assessment saved and visible to the patient.', 'success');
      if (assessment) {
        setAssessment({
          ...assessment,
          review_status: 'Reviewed',
          feedback: fb,
        });
      }
      setTimeout(() => setSuccessMessage(false), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJumpToTime = (timestampSec: number, attemptIndex: number) => {
    setActiveAttemptIdx(attemptIndex);
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, timestampSec);
      videoRef.current.play().catch(() => {});
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400 text-xs">Loading assessment metrics and video stream...</div>;
  }

  if (!assessment) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h3 className="text-lg font-bold text-slate-800">Assessment not found</h3>
        <Link to="/doctor/assessments" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
          <ArrowLeft className="w-4 h-4" /> Back to Assessment List
        </Link>
      </div>
    );
  }

  const observations: string[] = (() => {
    try {
      return JSON.parse(assessment.observations_json);
    } catch {
      return [];
    }
  })();

  const parsedAttempts: AttemptDetail[] = (() => {
    try {
      if (assessment.attempts_json) {
        return JSON.parse(assessment.attempts_json);
      }
    } catch {}
    return [];
  })();

  const configuredCriteria: any = (() => {
    try {
      if (assessment.configured_criteria_json) {
        return JSON.parse(assessment.configured_criteria_json);
      }
    } catch {}
    return {
      terminal_threshold_deg: 155,
      flexion_threshold_deg: 105,
      min_rom_deg: 50,
      min_hold_time_sec: 1.0
    };
  })();

  // Prepare chart data from parsed attempts
  const chartData = parsedAttempts.map((att) => ({
    attempt: `Att #${att.attempt_number}`,
    minAngle: att.min_angle ?? att.min_knee_angle ?? 0,
    maxAngle: att.max_angle ?? att.max_knee_angle ?? 0,
    rom: att.rom ?? att.range_of_motion ?? 0,
    outcome: att.outcome,
  }));

  const videoStreamUrl = assessmentService.getVideoStreamUrl(assessment.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/doctor/assessments')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B7B8C8] hover:text-white bg-[#171925] border border-white/10 px-4 py-2 rounded-full shadow-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessments
        </button>

        <div className="flex items-center gap-2">
          {assessment.is_demo && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20">
              Demo Record
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            assessment.review_status === 'Reviewed'
              ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20'
              : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20'
          }`}>
            {assessment.review_status}
          </span>
        </div>
      </div>

      {/* Patient & Assessment Overview Card */}
      <div className="bg-[#11131D] rounded-2xl border border-white/10 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#85879C] mb-1">
              <UserIcon className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>Assigned Patient Clinical Record</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {assessment.patient_name || `Patient #${assessment.patient_id}`}
            </h1>
            <p className="text-xs text-[#A78BFA] font-bold mt-0.5">
              {assessment.exercise_name} • Session Recorded {new Date(assessment.created_at).toLocaleString()}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#85879C] block">Assessment Status</span>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold ${
              assessment.assessment_status === 'Meets configured criteria'
                ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                : 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
            }`}>
              {assessment.assessment_status}
            </span>
          </div>
        </div>

        {/* Video Player Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7B8C8] flex items-center gap-2">
              <Video className="w-4 h-4 text-[#A78BFA]" />
              <span>Recorded Session Video &amp; Attempt Timeline</span>
            </h3>
            {assessment.has_video && (
              <span className="text-[11px] text-[#85879C]">
                Format: {assessment.video_mime_type || 'WebM/MP4'} • Size: {Math.round((assessment.video_file_size || 0) / 1024)} KB
              </span>
            )}
          </div>

          {assessment.has_video ? (
            <div className="bg-[#050509] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                src={videoStreamUrl}
                className="w-full max-h-[420px] object-contain mx-auto bg-black"
              >
                Your browser does not support authenticated video streaming.
              </video>
              <div className="p-3 bg-[#0B0D16] border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-[#85879C] gap-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                  <span>Authenticated Private Storage Stream</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#85879C] italic hidden sm:inline">
                    Click any attempt chip below to jump playback.
                  </span>
                  {videoStreamUrl && (
                    <a
                      href={videoStreamUrl}
                      download={`IASYN_Patient_${assessment.patient_id}_Assessment_${assessment.id}.webm`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A78BFA] hover:bg-[#7C6CF5] text-[#050509] hover:text-white font-bold text-xs transition-colors"
                      title="Download recorded video to your device"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Video</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : assessment.is_demo ? (
            <div className="p-8 rounded-2xl bg-[#0B0D16] border border-dashed border-white/10 text-center space-y-2">
              <Video className="w-8 h-8 text-[#85879C] mx-auto" />
              <p className="font-semibold text-white text-sm">No recording — demonstration data.</p>
              <p className="text-xs text-[#85879C] max-w-md mx-auto">
                This record belongs to a pre-configured synthetic adherence demonstration. Simulated kinematic measurements are preserved for review.
              </p>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#0B0D16] border border-dashed border-white/10 text-center space-y-2">
              <Video className="w-8 h-8 text-[#85879C] mx-auto" />
              <p className="font-semibold text-white text-sm">Video unavailable — metrics-only assessment.</p>
              <p className="text-xs text-[#85879C] max-w-md mx-auto">
                The patient opted not to store recorded camera frames, or camera recording was declined. Kinematic data and repetition metrics remain verified.
              </p>
            </div>
          )}
        </div>

        {/* Attempt-Level Performance Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7B8C8] mb-3 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#7DE8F0]" />
            <span>Attempt-Level Exercise Performance &amp; Pass Rate</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#0B0D16] p-3.5 rounded-xl border border-white/5">
              <span className="text-[#85879C] text-xs block">Total Attempts</span>
              <span className="text-2xl font-black text-white">
                {assessment.total_attempts ?? assessment.repetition_count}
              </span>
              <span className="text-[10px] text-[#85879C] block mt-0.5">Detected movements</span>
            </div>
            <div className="bg-[#0B0D16] p-3.5 rounded-xl border border-[#34D399]/20">
              <span className="text-[#34D399] text-xs font-medium block">Passed Attempts</span>
              <span className="text-2xl font-black text-[#34D399]">
                {assessment.passed_attempts ?? assessment.repetition_count}
              </span>
              <span className="text-[10px] text-[#34D399]/80 block mt-0.5">Criteria satisfied</span>
            </div>
            <div className="bg-[#0B0D16] p-3.5 rounded-xl border border-[#FB7185]/20">
              <span className="text-[#FB7185] text-xs font-medium block">Failed Attempts</span>
              <span className="text-2xl font-black text-[#FB7185]">
                {assessment.failed_attempts ?? 0}
              </span>
              <span className="text-[10px] text-[#FB7185]/80 block mt-0.5">Deviation observed</span>
            </div>
            <div className="bg-[#0B0D16] p-3.5 rounded-xl border border-[#FBBF24]/20">
              <span className="text-[#FBBF24] text-xs font-medium block">Unable to Assess</span>
              <span className="text-2xl font-black text-[#FBBF24]">
                {assessment.unassessable_attempts ?? 0}
              </span>
              <span className="text-[10px] text-[#FBBF24]/80 block mt-0.5">Tracking insufficient</span>
            </div>
            <div className="bg-[#0B0D16] p-3.5 rounded-xl border border-[#7DE8F0]/20">
              <span className="text-[#7DE8F0] text-xs font-medium block">Movement Pass Rate</span>
              <span className="text-2xl font-black text-[#7DE8F0]">
                {assessment.movement_pass_rate !== null && assessment.movement_pass_rate !== undefined
                  ? `${Math.round(assessment.movement_pass_rate)}%`
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-[#7DE8F0]/80 block mt-0.5">Passed / Assessable</span>
            </div>
          </div>
        </div>

        {/* Kinematic Measurements Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#85879C] mb-3">
            Kinematic Measurements (MediaPipe Pose)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0B0D16] p-4 rounded-xl border border-white/5">
              <span className="text-[#85879C] text-xs block">Valid Repetitions</span>
              <span className="text-2xl font-black text-white">{assessment.repetition_count}</span>
            </div>
            <div className="bg-[#0B0D16] p-4 rounded-xl border border-white/5">
              <span className="text-[#85879C] text-xs block">Range of Motion</span>
              <span className="text-2xl font-black text-[#A78BFA]">{assessment.range_of_motion}°</span>
            </div>
            <div className="bg-[#0B0D16] p-4 rounded-xl border border-white/5">
              <span className="text-[#85879C] text-xs block">Terminal Extension</span>
              <span className="text-2xl font-black text-white">{assessment.max_knee_angle}°</span>
            </div>
            <div className="bg-[#0B0D16] p-4 rounded-xl border border-white/5">
              <span className="text-[#85879C] text-xs block">Resting Flexion</span>
              <span className="text-2xl font-black text-white">{assessment.min_knee_angle}°</span>
            </div>
          </div>
        </div>

        {/* Knee Angle Progression Chart */}
        {chartData.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7B8C8] mb-2 flex items-center justify-between">
              <span>Attempt Angle Progression &amp; Extension Quality</span>
              <span className="text-[10px] font-bold text-[#A78BFA] bg-[#A78BFA]/10 px-2.5 py-0.5 rounded-full border border-[#A78BFA]/20">
                Kinematic Trend
              </span>
            </h3>
            <div className="glass-card p-5 space-y-3 shadow-xl">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="detailMaxGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#7DE8F0" />
                        <stop offset="100%" stopColor="#22D3EE" />
                      </linearGradient>
                      <linearGradient id="detailRomGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#A78BFA" />
                        <stop offset="100%" stopColor="#C4B5FD" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="attempt" tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis domain={[60, 180]} tick={{ fontSize: 11, fill: '#85879C' }} unit="°" stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CustomGlassTooltip unit="°" />} />
                    <ReferenceLine 
                      y={configuredCriteria.terminal_threshold_deg || 155} 
                      stroke="#34D399" 
                      strokeDasharray="4 4" 
                      label={{ value: `Pass Target (${configuredCriteria.terminal_threshold_deg || 155}°)`, fill: '#34D399', fontSize: 10, position: 'insideTopLeft' }} 
                    />
                    <Line
                      type="monotone"
                      dataKey="maxAngle"
                      name="Max Extension Angle (°)"
                      stroke="url(#detailMaxGrad)"
                      strokeWidth={2.8}
                      dot={{ r: 4, fill: '#7DE8F0', stroke: '#050509', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#7DE8F0', stroke: '#FFFFFF', strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="minAngle"
                      name="Starting Flexion Angle (°)"
                      stroke="#85879C"
                      strokeWidth={1.5}
                      dot={{ r: 3, fill: '#85879C', stroke: '#050509', strokeWidth: 1 }}
                      isAnimationActive={true}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="rom"
                      name="Range of Motion (°)"
                      stroke="url(#detailRomGrad)"
                      strokeWidth={2.2}
                      strokeDasharray="3 3"
                      dot={{ r: 3.5, fill: '#A78BFA', stroke: '#050509', strokeWidth: 1 }}
                      activeDot={{ r: 6, fill: '#A78BFA', stroke: '#FFFFFF', strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-[#85879C] mt-2 text-center italic">
                Green dashed line indicates configured clinical pass threshold ({configuredCriteria.terminal_threshold_deg || 155}°).
              </p>
            </div>
          </div>
        )}

        {/* Attempt Timeline & Jump Controls */}
        {parsedAttempts.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B7B8C8] mb-3 flex items-center justify-between">
              <span>Attempt Breakdown &amp; Video Markers</span>
              <span className="text-[11px] text-[#85879C] font-normal">
                {parsedAttempts.length} movements segmented
              </span>
            </h3>
            <div className="overflow-x-auto border border-white/10 rounded-xl bg-[#0B0D16]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#171925] text-[#85879C] font-semibold uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3">Attempt</th>
                    <th className="py-2.5 px-3">Timeline</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">Min / Max Angle</th>
                    <th className="py-2.5 px-3">ROM</th>
                    <th className="py-2.5 px-3">Observed Deviations</th>
                    <th className="py-2.5 px-3 text-right">Video</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {parsedAttempts.map((att, idx) => (
                    <tr 
                      key={att.attempt_number} 
                      className={`hover:bg-white/5 transition-colors ${activeAttemptIdx === idx ? 'bg-[#A78BFA]/10' : ''}`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white">
                        #{att.attempt_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#85879C]">
                        {att.start_time.toFixed(1)}s – {att.end_time.toFixed(1)}s
                      </td>
                      <td className="py-2.5 px-3">
                        {att.outcome === 'PASS' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
                            <CheckCircle className="w-3 h-3" /> PASS
                          </span>
                        )}
                        {att.outcome === 'FAIL' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FB7185]/15 text-[#FB7185] border border-[#FB7185]/30">
                            <XCircle className="w-3 h-3" /> FAIL
                          </span>
                        )}
                        {att.outcome === 'UNABLE_TO_ASSESS' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30">
                            <HelpCircle className="w-3 h-3" /> UNASSESSABLE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#B7B8C8]">
                        {Math.round(att.min_angle ?? att.min_knee_angle ?? 0)}° → <span className="font-bold text-white">{Math.round(att.max_angle ?? att.max_knee_angle ?? 0)}°</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#A78BFA]">
                        {Math.round(att.rom ?? att.range_of_motion ?? 0)}°
                      </td>
                      <td className="py-2.5 px-3 text-[#85879C]">
                        {att.deviations && att.deviations.length > 0 ? (
                          <span className="text-[#FB7185] font-medium">
                            {att.deviations.join('; ')}
                          </span>
                        ) : (
                          <span className="text-[#34D399] text-[11px]">No deviations</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {assessment.has_video ? (
                          <button
                            onClick={() => handleJumpToTime(att.start_time, idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#A78BFA]/10 text-[#A78BFA] hover:bg-[#A78BFA] hover:text-[#050509] font-semibold text-[11px] transition-colors"
                          >
                            <Play className="w-3 h-3" /> Jump
                          </button>
                        ) : (
                          <span className="text-[#85879C] text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tracking & Criteria Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0B0D16] p-4 rounded-xl border border-white/5 text-xs">
            <span className="font-bold text-white block mb-1">Tracking Quality &amp; Session Stats:</span>
            <p className="text-[#A78BFA] font-semibold">{assessment.tracking_quality}</p>
            <p className="text-[11px] text-[#85879C] mt-1">
              Active Session Duration: {assessment.duration_seconds} seconds
            </p>
            <div className="mt-2.5 pt-2.5 border-t border-white/10 text-[11px] text-[#85879C] space-y-0.5">
              <span className="font-bold block text-white">Configured Reference Thresholds:</span>
              <div>Terminal Extension Target: ≥ {configuredCriteria.terminal_threshold_deg || 155}°</div>
              <div>Resting Flexion Threshold: ≤ {configuredCriteria.flexion_threshold_deg || 105}°</div>
              <div>Min Range of Motion: ≥ {configuredCriteria.min_rom_deg || 50}°</div>
            </div>
          </div>

          <div className="bg-[#0B0D16] p-4 rounded-xl border border-white/5 text-xs">
            <span className="font-bold text-white block mb-2">Algorithm Movement Observations:</span>
            <ul className="space-y-1 text-[#85879C]">
              {observations.map((obs, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-[#7DE8F0] font-bold">•</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Written Feedback Form */}
      <div className="bg-[#11131D] rounded-2xl border border-white/10 p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA] flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Physiotherapist Written Feedback</h3>
            <p className="text-xs text-[#85879C]">
              This clinical advice is saved directly into the database and shown to the patient.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/20 text-[#34D399] text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
            <span>Feedback saved successfully! Assessment marked as Reviewed.</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/20 text-[#FB7185] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#85879C] mb-1.5">
              Clinical Assessment &amp; Exercise Recommendations:
            </label>
            <textarea
              required
              rows={5}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Enter specific clinical guidance (e.g., 'Great extension on attempts #1 through #4. On attempt #5 and #6, terminal hold was released too quickly. Focus on pausing at top extension for 1 full second...')"
              className="w-full p-4 bg-[#0B0D16] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder:text-[#85879C] focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-[#A78BFA] transition-all leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-[#85879C] italic">
              Authentic doctor feedback is saved directly to SQLite without AI generation.
            </p>

            <button
              type="submit"
              disabled={isSubmitting || !feedbackText.trim()}
              className="px-6 py-2.5 rounded-full bg-[#A78BFA] hover:bg-[#7C6CF5] text-[#050509] hover:text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#A78BFA]/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Feedback & Mark Reviewed'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

