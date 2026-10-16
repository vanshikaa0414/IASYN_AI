import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Activity, 
  BookOpen, 
  Camera, 
  Cpu, 
  FileText, 
  Users, 
  ClipboardCheck, 
  LogOut, 
  User as UserIcon,
  Stethoscope
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <Link to={isAuthenticated ? (user?.role === 'PATIENT' ? '/patient/dashboard' : '/doctor/dashboard') : '/'} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900">IASYN</span>
                <span className="text-xl font-extrabold text-teal-600">AI</span>
              </div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 -mt-1">Knee Rehabilitation</p>
            </div>
          </Link>

          {/* Navigation Links */}
          {isAuthenticated && user && (
            <nav className="hidden md:flex items-center space-x-1">
              {user.role === 'PATIENT' ? (
                <>
                  <Link
                    to="/patient/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/patient/dashboard')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link
                    to="/patient/exercises"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/patient/exercises')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Exercise Guide
                  </Link>
                  <Link
                    to="/patient/live-assessment"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/patient/live-assessment')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    Live Assessment
                  </Link>
                  <Link
                    to="/patient/sensor-demo"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/patient/sensor-demo')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    Sensor AI Demo
                  </Link>
                  <Link
                    to="/patient/reports"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/patient/reports')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    My Reports
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/doctor/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/doctor/dashboard')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Doctor Dashboard
                  </Link>
                  <Link
                    to="/doctor/patients"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/doctor/patients')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Assigned Patients
                  </Link>
                  <Link
                    to="/doctor/assessments"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive('/doctor/assessments')
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Assessment Reviews
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</span>
                  <span className="text-[11px] font-medium text-slate-500 flex items-center justify-end gap-1">
                    {user.role === 'DOCTOR' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                        <Stethoscope className="w-3 h-3" /> Doctor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">
                        <UserIcon className="w-3 h-3" /> Patient
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login?portal=patient"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Patient Login
                </Link>
                <Link
                  to="/login?portal=doctor"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-colors"
                >
                  Doctor Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
