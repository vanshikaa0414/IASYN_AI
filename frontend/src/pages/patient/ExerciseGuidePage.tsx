import React from 'react';
import { Link } from 'react-router-dom';
import { EXERCISES } from '../../features/exercises/exerciseData';
import { Camera, ChevronRight, Activity, ArrowRight, ShieldCheck } from 'lucide-react';

export const ExerciseGuidePage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="badge-violet">Rehabilitation Protocol</span>
            <span className="text-white/20 text-xs">•</span>
            <span className="text-xs font-semibold text-[#B7B8C8]">Clinical Movement Library</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Knee Rehabilitation Exercise Guide
          </h1>
          <p className="text-xs sm:text-sm text-[#85879C] mt-1">
            Structured physical therapy exercises designed for postoperative knee recovery, ACL rehabilitation, and patellofemoral stability.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#B7B8C8] bg-[#11131D] border border-white/10 px-3.5 py-2 rounded-full">
          <ShieldCheck className="w-4 h-4 text-[#A78BFA] shrink-0" />
          <span>Follow your physician's weight-bearing precautions</span>
        </div>
      </div>

      {/* 6 Exercise Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXERCISES.map((exercise, idx) => (
          <div
            key={exercise.id}
            className="glass-card glass-card-hover overflow-hidden flex flex-col justify-between group shadow-xl"
          >
            <div>
              {/* Card Picture & Banner */}
              <div className="h-44 sm:h-48 relative overflow-hidden bg-[#0B0D16] border-b border-white/10">
                {exercise.imageUrl ? (
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-[#171925] flex items-center justify-center">
                    <Activity className="w-8 h-8 text-[#85879C]" />
                  </div>
                )}
                {/* Vignette Gradient for badge readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#11131D] via-black/20 to-black/60 pointer-events-none" />

                {/* Badges Overlay */}
                <div className="absolute inset-x-0 top-0 p-3.5 flex items-start justify-between z-10 pointer-events-none">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#0B0D16]/80 backdrop-blur-md border border-white/15 text-[#B7B8C8] px-2.5 py-1 rounded-full shadow-md">
                    Exercise #{idx + 1}
                  </span>

                  {exercise.hasLiveAssessment && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#A78BFA] text-[#050509] px-2.5 py-1 rounded-full shadow-lg shadow-[#A78BFA]/30 backdrop-blur-md">
                      <Camera className="w-3.5 h-3.5" />
                      AI Webcam Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5">
                <span className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider block mb-1">
                  {exercise.category}
                </span>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#A78BFA] transition-colors">
                  {exercise.name}
                </h3>
                <p className="text-xs text-[#85879C] leading-relaxed mb-4 line-clamp-2">
                  {exercise.startingPosition}
                </p>

                {/* Target Muscle Pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {exercise.targetMuscles.map((muscle, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2 py-0.5 rounded-full bg-[#171925] border border-white/5 text-[10px] font-medium text-[#B7B8C8]"
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="p-5 pt-0 border-t border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-[#85879C] py-2">
                <span>Prescription:</span>
                <span className="font-semibold text-white">{exercise.recommendedReps}</span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/patient/exercises/${exercise.id}`}
                  className="flex-1 py-2 px-3 rounded-full bg-[#171925] hover:bg-[#1f2233] border border-white/10 text-white font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                {exercise.hasLiveAssessment && (
                  <Link
                    to="/patient/live-assessment"
                    className="btn-pill-primary text-xs !py-2 !px-3.5 flex items-center justify-center gap-1"
                    title="Launch Webcam Tracker"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Live Tracker</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
