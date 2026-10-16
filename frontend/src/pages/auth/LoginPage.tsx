import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { Activity, Stethoscope, User as UserIcon, Lock, Mail, AlertCircle, ArrowRight, Check } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPortal = searchParams.get('portal')?.toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
  
  const [role, setRole] = useState<UserRole>(initialPortal as UserRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const portalParam = searchParams.get('portal');
    if (portalParam?.toUpperCase() === 'DOCTOR') {
      setRole('DOCTOR');
    } else if (portalParam?.toUpperCase() === 'PATIENT') {
      setRole('PATIENT');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password, role);
      if (role === 'DOCTOR') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (targetRole: UserRole) => {
    setRole(targetRole);
    setError(null);
    if (targetRole === 'PATIENT') {
      setEmail('patient@iasyn.ai');
      setPassword('PatientPassword123!');
    } else {
      setEmail('doctor@iasyn.ai');
      setPassword('DoctorPassword123!');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20 mb-3">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to IASYN AI</h2>
          <p className="text-xs text-slate-500 mt-1">Select your authorized healthcare portal below</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('PATIENT');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                role === 'PATIENT'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Patient Portal
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('DOCTOR');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                role === 'DOCTOR'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Doctor Portal
            </button>
          </div>

          {/* Quick Demo Pre-fill helper buttons */}
          <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              1-Click Demo Credentials:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('PATIENT')}
                className="flex-1 text-left px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-700 text-xs transition-colors"
              >
                <span className="font-semibold text-teal-700 block">Alex Johnson</span>
                <span className="text-[10px] text-slate-500">Patient Demo</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('DOCTOR')}
                className="flex-1 text-left px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-xs transition-colors"
              >
                <span className="font-semibold text-blue-700 block">Dr. Sarah Chen</span>
                <span className="text-[10px] text-slate-500">Doctor Demo</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'PATIENT' ? 'patient@iasyn.ai' : 'doctor@iasyn.ai'}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                role === 'PATIENT'
                  ? 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 shadow-teal-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-blue-600/20'
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In as {role === 'PATIENT' ? 'Patient' : 'Doctor'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          IASYN AI • AI-Assisted Knee Rehabilitation System
        </p>
      </div>
    </div>
  );
};
