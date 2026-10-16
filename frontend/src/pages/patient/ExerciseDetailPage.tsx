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
        <h2 className="text-xl font-bold text-white mb-2">Exercise Not Found</h2>
        <p className="text-xs text-[#85879C] mb-6">The requested rehabilitation exercise could not be located.</p>
        <Link
          to="/patient/exercises"
          className="btn-pill-primary inline-flex items-center gap-2"
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B7B8C8] hover:text-white bg-[#171925] border border-white/10 px-4 py-2 rounded-full shadow-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Exercise Guide
        </button>

        {exercise.hasLiveAssessment && (
          <Link
            to="/patient/live-assessment"
            className="btn-pill-primary inline-flex items-center gap-2 text-xs"
          >
            <Camera className="w-4 h-4" />
            <span>Start Live Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Exercise Visual Hero Banner */}
      {exercise.imageUrl && (
        <div className="glass-card overflow-hidden relative h-64 sm:h-80 shadow-2xl border border-white/10 group">
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#11131D] via-black/25 to-black/40 pointer-events-none" />
          <div className="absolute bottom-4 left-4 sm:left-6 flex items-center gap-2 z-10">
            <span className="badge-violet px-3 py-1 text-xs font-bold shadow-md backdrop-blur-md">
              3D Biomechanical Reference
            </span>
          </div>
        </div>
      )}

      {/* Title & Metadata */}
      <div className="glass-card p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] block mb-1">
              {exercise.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {exercise.name}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-medium text-[#85879C] block">Recommended Dosage</span>
            <span className="text-sm font-extrabold text-white">{exercise.recommendedReps}</span>
          </div>
        </div>

        {/* Target Muscles */}
        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-white/10">
          <span className="text-xs font-semibold text-[#85879C] flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-[#A78BFA]" />
            Target Muscles:
          </span>
          {exercise.targetMuscles.map((muscle, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA] text-xs font-medium"
            >
              {muscle}
            </span>
          ))}
        </div>
      </div>

      {/* Video Demonstration Section */}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
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
      <div className="bg-[#11131D] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA] flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-base">Starting Position &amp; Setup</h3>
        </div>
        <p className="text-xs sm:text-sm text-[#B7B8C8] leading-relaxed bg-[#0B0D16] p-4 rounded-xl border border-white/5">
          {exercise.startingPosition}
        </p>
      </div>

      {/* Step-by-Step Instructions */}
      <div className="bg-[#11131D] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#7DE8F0]/10 text-[#7DE8F0] flex items-center justify-center">
            <ListOrdered className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-base">Step-by-Step Instructions</h3>
        </div>

        <ol className="space-y-3">
          {exercise.instructions.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-[#B7B8C8]">
              <span className="w-6 h-6 rounded-full bg-[#A78BFA] text-[#050509] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* General Precautions Card */}
      <div className="bg-[#11131D] rounded-2xl border border-[#FB7185]/30 p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#FB7185]/10 text-[#FB7185] flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white text-base">Clinical Precautions &amp; Safety Guidelines</h3>
        </div>

        <ul className="space-y-2">
          {exercise.precautions.map((precaution, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#FB7185] leading-relaxed">
              <span className="text-[#FB7185] font-bold shrink-0">•</span>
              <span>{precaution}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Live Assessment Action for Seated Knee Extension */}
      {exercise.hasLiveAssessment && (
        <div className="bg-gradient-to-r from-[#171925] to-[#11131D] border border-[#A78BFA]/30 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <h3 className="text-xl font-extrabold mb-1">Ready to Test Seated Knee Extension?</h3>
            <p className="text-xs text-[#B7B8C8] max-w-lg leading-relaxed">
              Position your webcam to capture your hip, knee, and ankle from a side profile view. Our computer-vision system will monitor your joint kinematics in real time.
            </p>
          </div>
          <Link
            to="/patient/live-assessment"
            className="btn-pill-primary inline-flex items-center gap-2 shrink-0 group text-xs sm:text-sm"
          >
            <Camera className="w-4 h-4" />
            <span>Launch Live Assessment</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
};
