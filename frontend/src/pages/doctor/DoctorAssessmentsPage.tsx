import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doctorService } from '../../services/doctorService';
import { WebcamAssessment } from '../../types/assessment';
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Filter,
  User as UserIcon,
  Activity
} from 'lucide-react';

export const DoctorAssessmentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patient_id');
  
  const [assessments, setAssessments] = useState<WebcamAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED'>('ALL');

  useEffect(() => {
    const pId = patientIdParam ? parseInt(patientIdParam, 10) : undefined;
    doctorService
      .getDoctorAssessments(pId)
      .then((res) => setAssessments(res))
      .catch((err) => console.error('Failed to load assessments:', err))
      .finally(() => setLoading(false));
  }, [patientIdParam]);

  const filtered = assessments.filter((a) => {
    if (statusFilter === 'PENDING') return a.review_status === 'Pending Review';
    if (statusFilter === 'REVIEWED') return a.review_status === 'Reviewed';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge-violet">Clinical Review Queue</span>
            <span className="text-white/20 text-xs">•</span>
            <span className="text-xs font-semibold text-[#B7B8C8]">Kinematic Inspection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Patient Assessment Reviews
          </h1>
          <p className="text-xs sm:text-sm text-[#85879C] mt-1">
            Kinematic data and repetition assessments awaiting clinical inspection and written feedback.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#0B0D16] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'ALL' ? 'bg-[#171925] text-white shadow-xs border border-white/10' : 'text-[#85879C] hover:text-white'
            }`}
          >
            All ({assessments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'PENDING' ? 'bg-[#171925] text-[#FBBF24] shadow-xs border border-white/10' : 'text-[#85879C] hover:text-white'
            }`}
          >
            Pending ({assessments.filter((a) => a.review_status === 'Pending Review').length})
          </button>
          <button
            onClick={() => setStatusFilter('REVIEWED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'REVIEWED' ? 'bg-[#171925] text-[#34D399] shadow-xs border border-white/10' : 'text-[#85879C] hover:text-white'
            }`}
          >
            Reviewed ({assessments.filter((a) => a.review_status === 'Reviewed').length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#85879C] text-xs">Loading patient assessments...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 card-surface rounded-2xl border border-dashed border-white/10 p-8">
          <ClipboardCheck className="w-10 h-10 text-[#85879C] mx-auto mb-3" />
          <h4 className="font-bold text-white text-sm">No assessments match criteria</h4>
          <p className="text-xs text-[#85879C] mt-1">
            Try switching filters or check back when patients complete new sessions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => {
            const observations: string[] = (() => {
              try {
                return JSON.parse(a.observations_json);
              } catch {
                return [];
              }
            })();

            return (
              <div
                key={a.id}
                className="card-surface p-6 hover:border-[#A78BFA]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold text-white text-base">{a.patient_name || 'Patient'}</span>
                    <span className="text-white/20">•</span>
                    <span className="text-xs font-semibold text-[#A78BFA]">{a.exercise_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      a.assessment_status === 'Meets configured criteria'
                        ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                        : 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30'
                    }`}>
                      {a.assessment_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs">
                    <div>
                      <span className="text-[#85879C] text-[10px] block">Reps</span>
                      <span className="font-bold text-white text-sm">{a.repetition_count}</span>
                    </div>
                    <div>
                      <span className="text-[#85879C] text-[10px] block">Range of Motion</span>
                      <span className="font-bold text-[#A78BFA] text-sm">{a.range_of_motion}°</span>
                    </div>
                    <div>
                      <span className="text-[#85879C] text-[10px] block">Terminal Extension</span>
                      <span className="font-semibold text-white">{a.max_knee_angle}°</span>
                    </div>
                    <div>
                      <span className="text-[#85879C] text-[10px] block">Session Date</span>
                      <span className="font-semibold text-white">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {observations.length > 0 && (
                    <p className="text-xs text-[#85879C] line-clamp-1 italic">
                      Observations: {observations.join(' • ')}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  {a.review_status === 'Reviewed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30">
                      <Clock className="w-3.5 h-3.5" /> Needs Review
                    </span>
                  )}

                  <Link
                    to={`/doctor/assessments/${a.id}`}
                    className="btn-pill-primary text-xs !py-2 !px-4 flex items-center gap-1.5"
                  >
                    <span>{a.review_status === 'Reviewed' ? 'Edit Feedback' : 'Review & Provide Feedback'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
