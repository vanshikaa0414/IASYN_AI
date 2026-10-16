import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { EXERCISES } from '../../features/exercises/exerciseData';
import { ExerciseVideoPlayer } from '../../components/video/ExerciseVideoPlayer';
import { 
  ArrowLeft, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  MapPin, 
  ListOrdered, 
  Activity,
  ArrowRight
} from 'lucide-react';

export const ExerciseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const exercise = EXERCISES.find((e) => e.id === id);

  if (!exercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Exercise Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">The requested rehabilitation exercise could not be located.</p>
        <Link
          to="/patient/exercises"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exercise Guide
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patient/exercises')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exercise Guide
        </button>

        {exercise.hasLiveAssessment && (
          <Link
            to="/patient/live-assessment"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Start Live Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block mb-1">
              {exercise.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {exercise.name}
            </h1>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-xs font-medium text-slate-500 block">Recommended Dosage</span>
            <span className="text-sm font-extrabold text-slate-800">{exercise.recommendedReps}</span>
          </div>
        </div>

        {/* Target Muscles */}
        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-teal-600" />
            Target Muscles:
          </span>
          {exercise.targetMuscles.map((muscle, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium"
            >
              {muscle}
            </span>
          ))}
        </div>
      </div>

      {/* Video Demonstration Section */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Demonstration Video &amp; Biomechanical Cueing
        </h3>
        <ExerciseVideoPlayer
          exerciseId={exercise.id}
          exerciseName={exercise.name}
          instructions={exercise.instructions}
          youtubeId={exercise.youtubeId}
          youtubeUrl={exercise.youtubeUrl}
        />
      </div>

      {/* Starting Position Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Starting Position &amp; Setup</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
          {exercise.startingPosition}
        </p>
      </div>

      {/* Step-by-Step Instructions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <ListOrdered className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Step-by-Step Instructions</h3>
        </div>

        <ol className="space-y-3">
          {exercise.instructions.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* General Precautions Card */}
      <div className="bg-rose-50/60 rounded-2xl border border-rose-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-rose-950 text-base">Clinical Precautions &amp; Safety Guidelines</h3>
        </div>

        <ul className="space-y-2">
          {exercise.precautions.map((precaution, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-rose-900 leading-relaxed">
              <span className="text-rose-500 font-bold shrink-0">•</span>
              <span>{precaution}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Live Assessment Action for Seated Knee Extension */}
      {exercise.hasLiveAssessment && (
        <div className="bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div>
            <h3 className="text-xl font-extrabold mb-1">Ready to Test Seated Knee Extension?</h3>
            <p className="text-xs text-teal-100 max-w-lg leading-relaxed">
              Position your webcam to capture your hip, knee, and ankle from a side profile view. Our computer-vision system will monitor your joint kinematics in real time.
            </p>
          </div>
          <Link
            to="/patient/live-assessment"
            className="px-6 py-3.5 rounded-xl bg-white text-teal-900 font-bold text-xs sm:text-sm shadow-md hover:bg-teal-50 transition-all flex items-center gap-2 shrink-0 group"
          >
            <Camera className="w-4 h-4 text-teal-600" />
            <span>Launch Live Assessment</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
};
