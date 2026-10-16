import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/doctorService';
import { DoctorDashboardData } from '../../types/assessment';
import { 
  Activity, 
  Users, 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Stethoscope, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorService
      .getDoctorDashboard()
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load doctor dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-[#11131D] rounded-3xl border border-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="h-32 bg-[#11131D] rounded-3xl border border-white/10" />
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
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#A78BFA]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel border border-white/10 text-[#A78BFA] text-xs font-bold uppercase tracking-wider">
            <Stethoscope className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>Physiotherapist Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {user?.name || 'Dr. Sarah Chen, PT, DPT'}
          </h1>
          <p className="text-[#85879C] text-xs sm:text-sm max-w-xl leading-relaxed">
            Review objective kinematics recorded from your assigned patients' seated knee extension assessments and provide structured clinical feedback.
          </p>
        </div>

        <Link
          to="/doctor/assessments"
          className="btn-pill-primary self-start sm:self-auto !py-3.5 !px-6 text-xs sm:text-sm flex items-center gap-2 group"
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Review All Assessments</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-panel text-[#7DE8F0] border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85879C] uppercase tracking-wider block">Assigned Patients</span>
            <span className="text-3xl font-black text-white tracking-tight">{data?.total_patients || 0}</span>
            <span className="text-[11px] text-[#7DE8F0] font-semibold block mt-0.5">Under Direct Care</span>
          </div>
        </div>

        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-panel text-[#A78BFA] border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
            <Activity className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85879C] uppercase tracking-wider block">Total Assessments</span>
            <span className="text-3xl font-black text-white tracking-tight">{data?.total_assessments || 0}</span>
            <span className="text-[11px] text-[#A78BFA] font-semibold block mt-0.5">Recorded Sessions</span>
          </div>
        </div>

        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-panel text-[#FBBF24] border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85879C] uppercase tracking-wider block">Pending Reviews</span>
            <span className="text-3xl font-black text-[#FBBF24] tracking-tight">{data?.pending_reviews || 0}</span>
            <span className="text-[11px] text-[#FBBF24] font-semibold block mt-0.5">Awaiting Feedback</span>
          </div>
        </div>

        <div className="glass-card glass-card-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl glass-panel text-[#34D399] border border-white/10 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85879C] uppercase tracking-wider block">Completed Reviews</span>
            <span className="text-3xl font-black text-[#34D399] tracking-tight">{data?.completed_reviews || 0}</span>
            <span className="text-[11px] text-[#34D399] font-semibold block mt-0.5">Feedback Provided</span>
          </div>
        </div>
      </div>

      {/* Priority Review Queue Card */}
      <div className="glass-card p-6 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Patient Assessment Review Queue</h3>
            <p className="text-xs text-[#85879C]">Assessments recorded by your assigned patients</p>
          </div>
          <Link
            to="/doctor/assessments"
            className="text-xs font-semibold text-[#A78BFA] hover:text-[#c4b5fd] flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {data?.recent_assessments && data.recent_assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0D16] text-[#85879C] font-bold uppercase tracking-wider border-y border-white/5">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reps</th>
                  <th className="py-3 px-4">Range of Motion</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Review State</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recent_assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#171925]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{a.patient_name}</td>
                    <td className="py-3.5 px-4 text-[#85879C]">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{a.repetition_count}</td>
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
                      {a.review_status === 'Reviewed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30">
                          <CheckCircle2 className="w-3 h-3" /> Reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30">
                          <Clock className="w-3 h-3" /> Needs Review
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/doctor/assessments/${a.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#171925] hover:bg-[#1f2233] border border-white/10 text-white font-semibold text-xs transition-colors"
                      >
                        <span>{a.review_status === 'Reviewed' ? 'Edit Feedback' : 'Review & Feedback'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-[#0B0D16] rounded-2xl border border-dashed border-white/10">
            <ClipboardCheck className="w-8 h-8 text-[#85879C] mx-auto mb-2" />
            <p className="text-xs font-bold text-white">No assessments to review</p>
            <p className="text-[11px] text-[#85879C] mt-0.5">Assigned patient sessions will appear here automatically</p>
          </div>
        )}
      </div>

      {/* Patient Adherence Summaries Section */}
      <div className="glass-card p-6 sm:p-7 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Patient Adherence &amp; Rehabilitation Progress</h3>
            <p className="text-xs text-[#85879C]">Longitudinal set completion and movement quality trajectories</p>
          </div>
          <Link
            to="/doctor/progress"
            className="text-xs font-semibold text-[#A78BFA] hover:text-[#c4b5fd] flex items-center gap-1 group"
          >
            <span>Open Progress Dashboard</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card glass-card-hover p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-sm">Alex Johnson</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30">
                  Increasing Adherence
                </span>
              </div>
              <p className="text-xs text-[#B7B8C8] mb-2 leading-relaxed">
                Completed sets: Day 1: 1 set, Day 2: 2 sets, Day 3: 3 sets.
              </p>
              <div className="text-[11px] text-[#85879C] font-medium">
                Pattern: Progressive compliance with rehabilitation schedule.
              </div>
            </div>
            <Link
              to="/doctor/progress?patient_id=2"
              className="mt-4 text-xs font-semibold text-[#A78BFA] hover:text-[#c4b5fd] inline-flex items-center gap-1 group"
            >
              <span>View Adherence Graphs</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="glass-card glass-card-hover p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-sm">Marcus Vance</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FB7185]/20 text-[#FB7185] border border-[#FB7185]/30">
                  Declining Adherence
                </span>
              </div>
              <p className="text-xs text-[#B7B8C8] mb-2 leading-relaxed">
                Completed sets: Day 1: 2 sets, Day 2: 1 set, Day 3: 0 sets.
              </p>
              <div className="text-[11px] text-[#85879C] font-medium">
                Pattern: Missed sessions flagged for physiotherapist follow-up.
              </div>
            </div>
            <Link
              to="/doctor/progress?patient_id=3"
              className="mt-4 text-xs font-semibold text-[#A78BFA] hover:text-[#c4b5fd] inline-flex items-center gap-1 group"
            >
              <span>View Adherence Graphs</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="glass-card glass-card-hover p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-sm">Elena Rostova</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7DE8F0]/20 text-[#7DE8F0] border border-[#7DE8F0]/30">
                  Consistent Adherence
                </span>
              </div>
              <p className="text-xs text-[#B7B8C8] mb-2 leading-relaxed">
                Completed sets: Day 1: 1 set, Day 2: 1 set, Day 3: 1 set.
              </p>
              <div className="text-[11px] text-[#85879C] font-medium">
                Pattern: Stable session adherence across all observation days.
              </div>
            </div>
            <Link
              to="/doctor/progress?patient_id=4"
              className="mt-4 text-xs font-semibold text-[#A78BFA] hover:text-[#c4b5fd] inline-flex items-center gap-1 group"
            >
              <span>View Adherence Graphs</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
