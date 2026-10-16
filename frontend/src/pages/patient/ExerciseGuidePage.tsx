import React from 'react';
import { Link } from 'react-router-dom';
import { EXERCISES } from '../../features/exercises/exerciseData';
import { Camera, ChevronRight, Activity, ArrowRight, ShieldCheck } from 'lucide-react';

export const ExerciseGuidePage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Knee Rehabilitation Exercise Guide
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Structured physical therapy exercises designed for postoperative knee recovery, ACL rehabilitation, and patellofemoral stability.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Follow your physician's weight-bearing precautions</span>
        </div>
      </div>

      {/* 6 Exercise Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXERCISES.map((exercise, idx) => (
          <div
            key={exercise.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
          >
            <div>
              {/* Card Banner */}
              <div className={`h-24 bg-gradient-to-r ${exercise.thumbnailPlaceholderColor} p-4 flex items-start justify-between text-white relative`}>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-full">
                  Exercise #{idx + 1}
                </span>

                {exercise.hasLiveAssessment && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-teal-800 px-2.5 py-1 rounded-full shadow-xs">
                    <Camera className="w-3.5 h-3.5 text-teal-600" />
                    AI Webcam Ready
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5">
                <span className="text-[11px] font-semibold text-teal-600 uppercase tracking-wider block mb-1">
                  {exercise.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">
                  {exercise.name}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                  {exercise.startingPosition}
                </p>

                {/* Target Muscle Pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {exercise.targetMuscles.map((muscle, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-600"
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="p-5 pt-0 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 py-2">
                <span>Prescription:</span>
                <span className="font-semibold text-slate-800">{exercise.recommendedReps}</span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/patient/exercises/${exercise.id}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs text-center transition-colors flex items-center justify-center gap-1"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                {exercise.hasLiveAssessment && (
                  <Link
                    to="/patient/live-assessment"
                    className="py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-xs"
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
