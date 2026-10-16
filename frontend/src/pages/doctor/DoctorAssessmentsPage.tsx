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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Patient Assessment Reviews
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kinematic data and repetition assessments awaiting clinical inspection and written feedback.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({assessments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({assessments.filter((a) => a.review_status === 'Pending Review').length})
          </button>
          <button
            onClick={() => setStatusFilter('REVIEWED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'REVIEWED' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reviewed ({assessments.filter((a) => a.review_status === 'Reviewed').length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading patient assessments...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <ClipboardCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="font-bold text-slate-800 text-sm">No assessments match criteria</h4>
          <p className="text-xs text-slate-500 mt-1">
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
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-extrabold text-slate-900 text-base">{a.patient_name || 'Patient'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-teal-700">{a.exercise_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      a.assessment_status === 'Meets configured criteria'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {a.assessment_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Reps</span>
                      <span className="font-bold text-slate-800 text-sm">{a.repetition_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Range of Motion</span>
                      <span className="font-bold text-teal-700 text-sm">{a.range_of_motion}°</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Terminal Extension</span>
                      <span className="font-semibold text-slate-800">{a.max_knee_angle}°</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Session Date</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {observations.length > 0 && (
                    <p className="text-xs text-slate-500 line-clamp-1 italic">
                      Observations: {observations.join(' • ')}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {a.review_status === 'Reviewed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      <Clock className="w-3.5 h-3.5" /> Needs Review
                    </span>
                  )}

                  <Link
                    to={`/doctor/assessments/${a.id}`}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
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
