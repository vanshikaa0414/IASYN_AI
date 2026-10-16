import React, { useState } from 'react';
import { Info, ExternalLink } from 'lucide-react';

interface ExerciseVideoPlayerProps {
  exerciseId: string;
  exerciseName: string;
  instructions: string[];
  youtubeId?: string;
  youtubeUrl?: string;
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({
  exerciseId,
  exerciseName,
  instructions,
  youtubeId,
  youtubeUrl,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [hasLocalVideo, setHasLocalVideo] = useState(false);

  const localVideoSrc = `/exercise-videos/${exerciseId}.mp4`;
  const defaultYoutubeId = youtubeId || (exerciseId === 'seated-knee-extension' ? 'h8UPMnv_BOA' : undefined);
  const finalYoutubeUrl = youtubeUrl || (defaultYoutubeId ? `https://www.youtube.com/watch?v=${defaultYoutubeId}` : undefined);

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
      {/* Video / Cue Display Area */}
      <div className="relative aspect-video w-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
        {defaultYoutubeId ? (
          /* Embedded YouTube Player without distracting top boxes */
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${defaultYoutubeId}?rel=0&modestbranding=1`}
            title={`${exerciseName} Demonstration Video`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : hasLocalVideo ? (
          /* Local MP4 Player */
          <video
            src={localVideoSrc}
            controls
            className="w-full h-full object-contain"
            onError={() => setHasLocalVideo(false)}
          />
        ) : (
          /* Step-by-Step Biomechanical Cueing for exercises without a video */
          <div className="relative z-10 max-w-lg w-full flex flex-col items-center p-6 text-center">
            <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 text-left shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                  Instructional Movement Phase {activeStep + 1} of {instructions.length}
                </span>
                <div className="flex gap-1.5">
                  {instructions.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveStep(idx)}
                      className={`h-2 rounded-full transition-all ${
                        activeStep === idx ? 'w-6 bg-teal-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                      }`}
                      title={`Step ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-slate-100 text-sm leading-relaxed min-h-[56px] py-1">
                {instructions[activeStep]}
              </p>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : instructions.length - 1))}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev < instructions.length - 1 ? prev + 1 : 0))}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Next Phase
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Banner */}
      <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-400 shrink-0" />
          {defaultYoutubeId ? (
            <span>
              Clinical Demonstration:{' '}
              <span className="text-slate-300 font-medium">{exerciseName.toUpperCase()} | Rehabilitation Exercise Guide</span>
            </span>
          ) : (
            <span>
              Local File Support:{' '}
              <code className="text-[11px] bg-slate-800 text-teal-300 px-1.5 py-0.5 rounded font-mono">
                frontend/public/exercise-videos/{exerciseId}.mp4
              </code>
            </span>
          )}
        </div>

        {finalYoutubeUrl && (
          <a
            href={finalYoutubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-teal-300 transition-colors flex items-center gap-1 font-medium"
          >
            <span>Open in YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
