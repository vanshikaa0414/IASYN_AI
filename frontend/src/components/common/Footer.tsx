import React from 'react';
import { Activity, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-white border-t border-slate-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Activity className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-slate-800 text-sm">IASYN AI</span>
            <span className="text-slate-400 text-xs">|</span>
            <span className="text-xs text-slate-500">AI-Assisted Knee Rehabilitation Monitoring & Physiotherapist Feedback System</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Local Demonstration Environment
            </span>
            <span>•</span>
            <span>KneE-PAD Supervised 1D-CNN</span>
            <span>•</span>
            <span>MediaPipe Pose</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
