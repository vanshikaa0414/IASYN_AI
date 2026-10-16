import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
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
  Stethoscope,
  Scale,
  TrendingUp,
  Layers,
  Menu,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/#' + id);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const activeTabClass = "bg-[#A78BFA]/18 text-[#A78BFA] border border-[#A78BFA]/35 shadow-sm shadow-[#A78BFA]/15 backdrop-blur-md";
  const inactiveTabClass = "text-[#B7B8C8] hover:text-white hover:bg-white/5 border border-transparent backdrop-blur-sm";

  return (
    <header className="sticky top-0 z-50 glass-nav transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand with Violet Icon */}
          <Link
            to={isAuthenticated ? (user?.role === 'PATIENT' ? '/patient/dashboard' : '/doctor/dashboard') : '/'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#A78BFA] via-[#7C6CF5] to-[#7DE8F0] flex items-center justify-center text-[#050509] shadow-md shadow-[#7C6CF5]/25 group-hover:scale-105 transition-transform duration-300">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black tracking-tight text-white">IASYN</span>
                <span className="text-lg font-extrabold bg-gradient-to-r from-[#A78BFA] to-[#7DE8F0] bg-clip-text text-transparent">AI</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse ml-0.5" />
              </div>
              <p className="text-[10px] uppercase tracking-wider font-mono text-[#85879C] -mt-1">Intelligent Movement</p>
            </div>
          </Link>

          {/* Navigation Links for Authenticated Users */}
          {isAuthenticated && user && (
            <nav className="hidden lg:flex items-center space-x-1">
              {user.role === 'PATIENT' ? (
                <>
                  <Link
                    to="/patient/dashboard"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/patient/dashboard') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/patient/exercises"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/patient/exercises') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Exercise Guide</span>
                  </Link>
                  <Link
                    to="/patient/live-assessment"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/patient/live-assessment') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Live Assessment</span>
                  </Link>
                  <Link
                    to="/patient/video-comparison"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/patient/video-comparison') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Video Comparison</span>
                  </Link>
                  <Link
                    to="/patient/sensor-demo"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/patient/sensor-demo') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Sensor Demo</span>
                  </Link>
                  <Link
                    to="/patient/reports"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/patient/reports') && !location.search.includes('feedback')
                        ? activeTabClass
                        : inactiveTabClass
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>My Reports</span>
                  </Link>
                  <Link
                    to="/patient/reports?tab=feedback"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      location.search.includes('feedback') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Doctor Feedback</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/doctor/dashboard"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/doctor/dashboard') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/doctor/patients"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/doctor/patients') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>My Patients</span>
                  </Link>
                  <Link
                    to="/doctor/assessments"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/doctor/assessments') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Assessments</span>
                  </Link>
                  <Link
                    to="/doctor/progress"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/doctor/progress') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Patient Progress</span>
                  </Link>
                  <Link
                    to="/doctor/model-evaluation"
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isActive('/doctor/model-evaluation') ? activeTabClass : inactiveTabClass
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Model Evaluation</span>
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* Public Navigation Links (When unauthenticated) */}
          {!isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-6 text-xs font-medium text-[#B7B8C8]">
              <button 
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button 
                type="button"
                onClick={() => scrollToSection('exercises')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Exercises
              </button>
              <button 
                type="button"
                onClick={() => scrollToSection('technology')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Technology
              </button>
            </nav>
          )}

          {/* User Controls & CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white leading-tight">{user.name}</span>
                  <span className="text-[10px] font-mono text-[#85879C] flex items-center justify-end gap-1 mt-0.5">
                    {user.role === 'DOCTOR' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold badge-violet">
                        <Stethoscope className="w-2.5 h-2.5" /> Doctor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold badge-cyan">
                        <UserIcon className="w-2.5 h-2.5" /> Patient
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-[#85879C] hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login?portal=patient"
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#B7B8C8] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?portal=patient"
                  className="px-4 py-2 btn-pill-primary text-xs font-bold uppercase tracking-wider"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#B7B8C8] hover:text-white hover:bg-white/5"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0B0D16] border-b border-subtle px-4 pt-3 pb-5 space-y-2">
          {isAuthenticated && user ? (
            <div className="space-y-1">
              {user.role === 'PATIENT' ? (
                <>
                  <Link
                    to="/patient/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/patient/exercises"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5"
                  >
                    Exercise Guide
                  </Link>
                  <Link
                    to="/patient/live-assessment"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5"
                  >
                    Live Assessment
                  </Link>
                  <Link
                    to="/patient/reports"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5"
                  >
                    My Reports
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/doctor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5"
                  >
                    Doctor Dashboard
                  </Link>
                  <Link
                    to="/doctor/patients"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5"
                  >
                    My Patients
                  </Link>
                  <Link
                    to="/doctor/assessments"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5"
                  >
                    Review Queue
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login?portal=patient"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl bg-white/5 text-white text-xs font-semibold"
              >
                Sign In
              </Link>
              <Link
                to="/login?portal=patient"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 btn-pill-primary text-xs font-bold"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Theme Toggle */}
          <div className="pt-3 border-t border-subtle flex items-center justify-between px-1">
            <span className="text-xs font-medium text-[#85879C]">Theme Mode</span>
            <ThemeToggle showLabel />
          </div>
        </div>
      )}
    </header>
  );
};
