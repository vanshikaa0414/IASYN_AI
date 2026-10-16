import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer group ${
        isDark
          ? 'bg-[#171925]/80 hover:bg-[#1f2233] border-white/10 hover:border-[#FBBF24]/40 text-[#B7B8C8] hover:text-[#FBBF24] shadow-sm'
          : 'bg-white/80 hover:bg-white border-slate-300/80 hover:border-[#6366F1]/50 text-slate-700 hover:text-[#6366F1] shadow-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label="Toggle theme"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-[#FBBF24] transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-[#6366F1] transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </div>

      {showLabel ? (
        <span className="text-xs font-semibold">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      ) : (
        <span className="text-[11px] font-mono tracking-tight uppercase opacity-80 group-hover:opacity-100 hidden sm:inline">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
