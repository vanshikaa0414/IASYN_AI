import React from 'react';
import { Activity, ShieldCheck, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-5 px-4 sm:px-6 lg:px-8 bg-transparent transition-all">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl border border-white/10 bg-[#0B0D16]/80 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 hover:border-white/20 transition-all duration-300">
          {/* Brand & Platform Identity */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#7DE8F0]/10 border border-[#7DE8F0]/25 flex items-center justify-center text-[#7DE8F0] shadow-sm shadow-[#7DE8F0]/20">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <span className="font-bold text-white text-sm tracking-tight">IASYN AI</span>
            </div>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="text-[#85879C] text-xs font-mono">
              AI-Assisted Knee Rehabilitation Monitoring &amp; Physiotherapist Feedback System
            </span>
          </div>

          {/* Environment & ML Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/25 shadow-sm shadow-[#34D399]/10 backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Local Demonstration Environment</span>
            </span>

            <span className="text-white/20 hidden sm:inline">•</span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-[#B7B8C8] bg-white/5 border border-white/10 backdrop-blur-md">
              <Cpu className="w-3 h-3 text-[#B7B8C8]" />
              <span>KneE-PAD Supervised 1D-CNN</span>
            </span>

            <span className="text-white/20 hidden sm:inline">•</span>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono text-[#A78BFA] bg-[#A78BFA]/10 border border-[#A78BFA]/25 shadow-sm shadow-[#A78BFA]/10 backdrop-blur-md">
              MediaPipe Pose
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
