import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doctorService } from '../../services/doctorService';
import { WebcamAssessment } from '../../types/assessment';
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
  Send
} from 'lucide-react';

export const AssessmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<WebcamAssessment | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Refresh assessment status
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

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400 text-xs">Loading assessment metrics...</div>;
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/doctor/assessments')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessments
        </button>

        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          assessment.review_status === 'Reviewed'
            ? 'bg-teal-100 text-teal-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {assessment.review_status}
        </span>
      </div>

      {/* Patient & Assessment Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <UserIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Assigned Patient Assessment</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {assessment.patient_name || `Patient #${assessment.patient_id}`}
            </h1>
            <p className="text-xs text-teal-700 font-bold mt-0.5">
              {assessment.exercise_name} • Session Recorded {new Date(assessment.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Status</span>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold ${
              assessment.assessment_status === 'Meets configured criteria'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {assessment.assessment_status}
            </span>
          </div>
        </div>

        {/* Kinematic Measurements Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Measured Joint Kinematics (MediaPipe Pose)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs block">Repetitions</span>
              <span className="text-2xl font-black text-slate-900">{assessment.repetition_count}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs block">Range of Motion</span>
              <span className="text-2xl font-black text-teal-700">{assessment.range_of_motion}°</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs block">Terminal Extension</span>
              <span className="text-2xl font-black text-slate-900">{assessment.max_knee_angle}°</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-xs block">Resting Flexion</span>
              <span className="text-2xl font-black text-slate-900">{assessment.min_knee_angle}°</span>
            </div>
          </div>
        </div>

        {/* Tracking & Observations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-1">Tracking Quality:</span>
            <p className="text-slate-800 font-semibold">{assessment.tracking_quality}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Active Session Duration: {assessment.duration_seconds} seconds
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-2">Algorithm Observations:</span>
            <ul className="space-y-1 text-slate-600">
              {observations.map((obs, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Written Feedback Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Physiotherapist Written Feedback</h3>
            <p className="text-xs text-slate-500">
              This clinical advice will be saved in SQLite and displayed directly on the patient's dashboard and reports.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Feedback saved successfully! Assessment marked as Reviewed.</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Clinical Assessment &amp; Exercise Recommendations:
            </label>
            <textarea
              required
              rows={5}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Enter specific clinical guidance (e.g., 'Great control on the first 6 repetitions. Focus on holding terminal extension for 2 seconds and avoiding trunk compensation as fatigue increases...')"
              className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-400 italic">
              Authentic doctor feedback is saved directly to the database without AI generation.
            </p>

            <button
              type="submit"
              disabled={isSubmitting || !feedbackText.trim()}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
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
