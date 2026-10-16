import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { Activity, Stethoscope, User as UserIcon, Lock, Mail, AlertCircle, ArrowRight, UserPlus, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPortal = searchParams.get('portal')?.toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
  
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [role, setRole] = useState<UserRole>(initialPortal as UserRole);

  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form states (Patient only)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, registerPatient } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const portalParam = searchParams.get('portal');
    if (portalParam?.toUpperCase() === 'DOCTOR') {
      setRole('DOCTOR');
      setAuthMode('LOGIN'); // Doctors cannot publicly register
    } else if (portalParam?.toUpperCase() === 'PATIENT') {
      setRole('PATIENT');
    }
  }, [searchParams]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Client-side validations
    if (regName.trim().length < 2) {
      setError('Please provide your full legal or preferred name (at least 2 characters).');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long for account security.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerPatient(regName.trim(), regEmail.toLowerCase().trim(), regPassword, regConfirmPassword);
      setSuccessMsg('Account created successfully! Assigned to Dr. Sarah Chen, PT, DPT.');
      setTimeout(() => {
        navigate('/patient/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to create patient account. This email may already be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (targetRole: UserRole) => {
    setAuthMode('LOGIN');
    setRole(targetRole);
    setError(null);
    setSuccessMsg(null);
    if (targetRole === 'PATIENT') {
      setEmail('patient@iasyn.ai');
      setPassword('PatientPassword123!');
    } else {
      setEmail('doctor@iasyn.ai');
      setPassword('DoctorPassword123!');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#050509]">
      <div className="w-full max-w-md">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#171925] text-[#A78BFA] border border-white/10 shadow-lg shadow-[#A78BFA]/10 mb-3">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {authMode === 'LOGIN' ? 'Sign in to IASYN AI' : 'Create Patient Account'}
          </h2>
          <p className="text-xs text-[#85879C] mt-1">
            {authMode === 'LOGIN'
              ? 'Select your authorized healthcare portal below'
              : 'Register for AI-guided knee rehabilitation & clinician monitoring'}
          </p>
        </div>

        <div className="bg-[#11131D] rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {authMode === 'LOGIN' ? (
            <>
              {/* Portal Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 bg-[#0B0D16] border border-white/10 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setRole('PATIENT');
                    setError(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    role === 'PATIENT'
                      ? 'bg-[#171925] text-white border border-white/10 shadow-xs'
                      : 'text-[#85879C] hover:text-white'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-[#A78BFA]" />
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
                      ? 'bg-[#171925] text-white border border-white/10 shadow-xs'
                      : 'text-[#85879C] hover:text-white'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 text-[#7DE8F0]" />
                  Doctor Portal
                </button>
              </div>

              {/* Quick Demo Pre-fill helper buttons */}
              <div className="mb-6 p-3 rounded-xl bg-[#171925] border border-white/10">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#85879C] block mb-2">
                  1-Click Demo Credentials:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillDemo('PATIENT')}
                    className="flex-1 text-left px-2.5 py-1.5 rounded-lg bg-[#11131D] border border-white/10 hover:border-[#A78BFA]/40 text-[#B7B8C8] text-xs transition-colors"
                  >
                    <span className="font-semibold text-[#A78BFA] block">Alex Johnson</span>
                    <span className="text-[10px] text-[#85879C]">Patient Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillDemo('DOCTOR')}
                    className="flex-1 text-left px-2.5 py-1.5 rounded-lg bg-[#11131D] border border-white/10 hover:border-[#7DE8F0]/40 text-[#B7B8C8] text-xs transition-colors"
                  >
                    <span className="font-semibold text-[#7DE8F0] block">Dr. Sarah Chen</span>
                    <span className="text-[10px] text-[#85879C]">Doctor Demo</span>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/30 flex items-start gap-2.5 text-xs text-[#FB7185]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B7B8C8] mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#85879C]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={role === 'PATIENT' ? 'patient@iasyn.ai' : 'doctor@iasyn.ai'}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B0D16] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#85879C] focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B7B8C8] mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#85879C]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B0D16] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#85879C] focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-pill-primary w-full !py-3 flex items-center justify-center gap-2 disabled:opacity-50"
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

              {/* Create Patient Account Toggle */}
              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('REGISTER');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A78BFA] hover:text-[#c4b5fd] transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New patient? Create Patient Account</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Registration Notice */}
              <div className="mb-5 p-3 rounded-xl bg-[#171925] border border-white/10 text-xs text-[#B7B8C8] leading-relaxed">
                <span className="font-semibold text-white block mb-0.5">Assigned Clinician: Dr. Sarah Chen, PT, DPT</span>
                All newly registered patients are automatically assigned to our demonstration doctor for video review, movement tracking, and clinical feedback.
              </div>

              {/* Error / Success Messages */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/30 flex items-start gap-2.5 text-xs text-[#FB7185]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-[#34D399]/10 border border-[#34D399]/30 flex items-start gap-2.5 text-xs text-[#34D399]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#B7B8C8] mb-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#85879C]">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B0D16] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#85879C] focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B7B8C8] mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#85879C]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="patient.email@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B0D16] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#85879C] focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B7B8C8] mb-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#85879C]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B0D16] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#85879C] focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B7B8C8] mb-1">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#85879C]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#0B0D16] border border-white/10 rounded-xl text-sm text-white placeholder:text-[#85879C] focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-pill-primary w-full !py-3 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch back to Login */}
              <div className="mt-5 pt-4 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-semibold text-[#85879C] hover:text-white transition-colors"
                >
                  Already have an account? <span className="text-[#A78BFA] underline">Sign In</span>
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#85879C] mt-6">
          IASYN AI • AI-Assisted Knee Rehabilitation System
        </p>
      </div>
    </div>
  );
};
