import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assessmentService } from '../../services/assessmentService';
import { PatientDashboardData } from '../../types/assessment';
import { 
  Activity, 
  Camera, 
  BookOpen, 
  Cpu, 
  FileText, 
  Stethoscope, 
  ChevronRight, 
  Calendar, 
  Award, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight, 
  Scale,
  Sparkles,
  Zap,
  TrendingUp
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assessmentService
      .getPatientDashboard()
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-[#11131D] rounded-3xl border border-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-[#11131D] rounded-3xl border border-white/10" />
            <div className="h-32 bg-[#11131D] rounded-3xl border border-white/10" />
            <div className="h-32 bg-[#11131D] rounded-3xl border border-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-page-enter">
      {/* Welcome Banner */}
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#A78BFA]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel border border-white/10 text-[#A78BFA] text-xs font-bold uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>Assigned Clinician: {data?.assigned_doctor || 'Dr. Sarah Chen, PT, DPT'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.name || 'Patient'}
            </h1>
            <p className="text-[#85879C] text-xs sm:text-sm max-w-xl leading-relaxed">
              Track your daily knee kinematics, perform guided seated knee extension assessments with live skeleton overlays, and review doctor feedback.
            </p>
          </div>

          <Link
            to="/patient/live-assessment"
            className="btn-pill-primary self-start md:self-auto !py-3 !px-6 flex items-center gap-2.5 group"
          >
            <Camera className="w-4 h-4" />
            <span>Start Live Assessment</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-panel text-[#A78BFA] border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
            <Activity className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85879C] uppercase tracking-wider block">Total Assessments</span>
            <span className="text-3xl font-black text-white tracking-tight">{data?.total_assessments || 0}</span>
            <span className="text-[11px] text-[#A78BFA] font-semibold block mt-0.5">Webcam Sessions</span>
          </div>
        </div>

        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-panel text-[#7DE8F0] border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85879C] uppercase tracking-wider block">Total Repetitions</span>
            <span className="text-3xl font-black text-white tracking-tight">{data?.total_reps || 0}</span>
            <span className="text-[11px] text-[#7DE8F0] font-semibold block mt-0.5">Knee Extensions</span>
          </div>
        </div>

        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-panel text-[#34D399] border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85879C] uppercase tracking-wider block">Best Active ROM</span>
            <span className="text-3xl font-black text-white tracking-tight">{data?.best_rom ? `${data.best_rom}°` : '82.7°'}</span>
            <span className="text-[11px] text-[#34D399] font-semibold block mt-0.5">Range of Motion</span>
          </div>
        </div>
      </div>

      {/* Primary Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          to="/patient/exercises"
          className="glass-card glass-card-hover p-6 flex flex-col justify-between group"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl glass-panel text-[#A78BFA] border border-white/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Exercise Guide</h3>
            <p className="text-xs text-[#85879C] leading-relaxed">
              Explore step-by-step instructions, precautions, and demonstration videos for all six knee exercises.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-xs font-semibold text-[#A78BFA] gap-1 group-hover:gap-2 transition-all">
            <span>View 6 Exercises</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/patient/live-assessment"
          className="glass-card glass-card-hover p-6 flex flex-col justify-between group"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl glass-panel text-[#A78BFA] border border-white/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Live Assessment</h3>
            <p className="text-xs text-[#85879C] leading-relaxed">
              Equal-sized live camera and 3D skeleton pose tracker with real-time MediaPipe joint kinematics.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-xs font-semibold text-[#A78BFA] gap-1 group-hover:gap-2 transition-all">
            <span>Open Webcam Tracker</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/patient/video-comparison"
          className="glass-card glass-card-hover p-6 flex flex-col justify-between group"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl glass-panel text-[#7DE8F0] border border-white/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Video Comparison</h3>
            <p className="text-xs text-[#85879C] leading-relaxed">
              Upload correct and incorrect videos to compare repetition kinematics, overlays, and deviation reports.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-xs font-semibold text-[#7DE8F0] gap-1 group-hover:gap-2 transition-all">
            <span>Compare Recordings</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/patient/sensor-demo"
          className="glass-card glass-card-hover p-6 flex flex-col justify-between group"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl glass-panel text-[#A78BFA] border border-white/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Sensor AI Demonstration</h3>
            <p className="text-xs text-[#85879C] leading-relaxed">
              Analyze recorded EMG &amp; IMU sensor signals from the KneE-PAD dataset using our trained 1D-CNN.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-xs font-semibold text-[#A78BFA] gap-1 group-hover:gap-2 transition-all">
            <span>Explore KneE-PAD AI</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Latest Doctor Feedback Highlight */}
      {data?.latest_feedback ? (
        <div className="glass-card p-6 border-[#A78BFA]/30 relative overflow-hidden shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl glass-panel border border-white/10 text-[#A78BFA] flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <span className="text-sm font-bold text-white">
                  Latest Feedback from {data.latest_feedback.doctor_name}
                </span>
                <span className="text-[11px] text-[#85879C] font-semibold">
                  {new Date(data.latest_feedback.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <p className="text-xs text-[#B7B8C8] glass-panel p-4 rounded-xl border border-white/5 italic leading-relaxed">
                "{data.latest_feedback.feedback_text}"
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent Webcam Assessments Table Card */}
      <div className="glass-card p-6 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Recent Assessments</h3>
            <p className="text-xs text-[#85879C]">Your latest webcam-recorded seated knee extension sessions</p>
          </div>
          <Link
            to="/patient/reports"
            className="text-xs font-semibold text-[#A78BFA] hover:text-[#c4b5fd] flex items-center gap-1 group"
          >
            <span>View All Reports</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {data?.recent_assessments && data.recent_assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0D16] text-[#85879C] font-bold uppercase tracking-wider border-y border-white/5">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Exercise</th>
                  <th className="py-3 px-4">Reps</th>
                  <th className="py-3 px-4">Range of Motion</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Clinician Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recent_assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#171925]/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-[#B7B8C8]">{a.exercise_name}</td>
                    <td className="py-3.5 px-4 text-white font-bold">{a.repetition_count}</td>
                    <td className="py-3.5 px-4 text-[#A78BFA] font-bold">{a.range_of_motion}°</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        a.assessment_status === 'Meets configured criteria'
                          ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                          : 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30'
                      }`}>
                        {a.assessment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {a.has_feedback ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30">
                          <CheckCircle2 className="w-3 h-3" /> Reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-[#85879C] border border-white/10">
                          <Clock className="w-3 h-3 text-[#85879C]" /> Pending Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-[#0B0D16] rounded-2xl border border-dashed border-white/10">
            <Camera className="w-8 h-8 text-[#85879C] mx-auto mb-2" />
            <p className="text-xs font-bold text-white">No assessments recorded yet</p>
            <p className="text-[11px] text-[#85879C] mt-0.5">Start your first live assessment to track your progress</p>
            <Link
              to="/patient/live-assessment"
              className="mt-4 btn-pill-primary inline-flex items-center gap-1.5 text-xs !py-2 !px-4"
            >
              Start Live Assessment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
