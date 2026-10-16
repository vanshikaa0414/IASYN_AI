import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, message?: string, type: ToastMessage['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* 3D Glassmorphic Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-xl animate-modal-3d transition-all flex items-start gap-3 ${
              toast.type === 'success'
                ? 'bg-slate-900/90 text-white border-teal-500/40 shadow-teal-950/40'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-100 border-amber-500/40 shadow-amber-950/40'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 border-rose-500/40 shadow-rose-950/40'
                : 'bg-slate-900/90 text-white border-sky-500/40 shadow-sky-950/40'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
              ) : toast.type === 'warning' ? (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <Info className="w-5 h-5 text-sky-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold tracking-tight">{toast.title}</h4>
              {toast.message && (
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
