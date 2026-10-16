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
  ArrowRight
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-slate-200 rounded-2xl" />
            <div className="h-32 bg-slate-200 rounded-2xl" />
            <div className="h-32 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold uppercase tracking-wider mb-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Assigned Clinician: {data?.assigned_doctor || 'Dr. Sarah Chen, PT'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Patient'}
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-xl">
              Track your daily knee kinematics, perform guided seated knee extension assessments, and review clinical feedback.
            </p>
          </div>

          <Link
            to="/patient/live-assessment"
            className="self-start md:self-auto px-5 py-3 rounded-xl bg-white text-teal-800 font-bold text-xs sm:text-sm shadow-md hover:bg-teal-50 transition-all flex items-center gap-2 group"
          >
            <Camera className="w-4 h-4 text-teal-600" />
            <span>Start Live Assessment</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Assessments</span>
            <span className="text-2xl font-black text-slate-900">{data?.total_assessments || 0}</span>
            <span className="text-[11px] text-teal-600 font-medium block">Webcam Sessions</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 border border-cyan-100">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Repetitions</span>
            <span className="text-2xl font-black text-slate-900">{data?.total_reps || 0}</span>
            <span className="text-[11px] text-cyan-600 font-medium block">Knee Extensions</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Best Active ROM</span>
            <span className="text-2xl font-black text-slate-900">{data?.best_rom ? `${data.best_rom}°` : '82.7°'}</span>
            <span className="text-[11px] text-emerald-600 font-medium block">Range of Motion</span>
          </div>
        </div>
      </div>

      {/* Primary Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/patient/exercises"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Exercise Guide</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore step-by-step instructions, precautions, and demonstration video guides for all six knee exercises.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-teal-600 gap-1 group-hover:gap-2 transition-all">
            <span>View 6 Exercises</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/patient/live-assessment"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Live Assessment</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track live joint angles with MediaPipe Pose, count repetitions, and record kinematics in real-time.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-teal-600 gap-1 group-hover:gap-2 transition-all">
            <span>Open Webcam Tracker</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/patient/sensor-demo"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Sensor AI Demonstration</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Analyze recorded EMG &amp; IMU sensor signals from the KneE-PAD dataset using our trained 1D-CNN.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-sky-600 gap-1 group-hover:gap-2 transition-all">
            <span>Explore KneE-PAD AI</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Latest Doctor Feedback Highlight */}
      {data?.latest_feedback ? (
        <div className="bg-white rounded-2xl border border-teal-200 p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <span className="text-sm font-bold text-slate-900">
                  Latest Feedback from {data.latest_feedback.doctor_name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(data.latest_feedback.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 italic leading-relaxed">
                "{data.latest_feedback.feedback_text}"
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent Webcam Assessments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Assessments</h3>
            <p className="text-xs text-slate-500">Your latest webcam-recorded seated knee extension sessions</p>
          </div>
          <Link
            to="/patient/reports"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>View All Reports</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {data?.recent_assessments && data.recent_assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Exercise</th>
                  <th className="py-3 px-4">Reps</th>
                  <th className="py-3 px-4">Range of Motion</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Clinician Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent_assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{a.exercise_name}</td>
                    <td className="py-3.5 px-4 text-slate-900 font-bold">{a.repetition_count}</td>
                    <td className="py-3.5 px-4 text-teal-700 font-semibold">{a.range_of_motion}°</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        a.assessment_status === 'Meets configured criteria'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a.assessment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {a.has_feedback ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800">
                          <CheckCircle2 className="w-3 h-3" /> Reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No assessments recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Start your first live assessment to track your progress</p>
            <Link
              to="/patient/live-assessment"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold shadow-xs hover:bg-teal-700"
            >
              Start Live Assessment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
