import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Camera, 
  Cpu, 
  ClipboardCheck, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Stethoscope, 
  User as UserIcon,
  Sparkles,
  BarChart3,
  Video
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-slate-50 pt-16 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              AI-Assisted Knee Rehabilitation System
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
              Precision Knee Monitoring &amp;{' '}
              <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Physiotherapist Feedback
              </span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-2xl mx-auto">
              Empowering patients with live computer-vision joint angle tracking, structured rehabilitation exercise guides, and direct physiotherapist clinical review.
            </p>

            {/* Portal Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login?portal=patient"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base shadow-md shadow-teal-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2.5 group"
              >
                <UserIcon className="w-5 h-5" />
                <span>Patient Portal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/login?portal=doctor"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-base border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2.5"
              >
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <span>Doctor Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Two AI Technologies Notice Banner */}
      <section className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Live Webcam Tracking: MediaPipe Pose</h4>
                <p className="text-xs text-slate-500">Live patient joint angles, repetition count &amp; observable movement deviations</p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-300 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Sensor Classification: KneE-PAD 1D-CNN</h4>
                <p className="text-xs text-slate-500">Supervised demonstration classifying recorded EMG &amp; IMU sensor signals</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rehabilitation Workflow Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              The Closed-Loop Rehabilitation Workflow
            </h2>
            <p className="text-slate-600 text-sm">
              Connecting evidence-based physical therapy with computer vision tracking and clinician feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg mb-4 border border-teal-100">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Exercise Instruction</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access medically cautious instructions and demonstration videos for six knee rehabilitation exercises.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-lg mb-4 border border-cyan-100">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Live Webcam Assessment</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Perform seated knee extension in front of your webcam. MediaPipe detects hip-knee-ankle geometry with real-time rep counting.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4 border border-blue-100">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Automated Report</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generates objective metrics: terminal extension angle, range of motion, and movement observations saved directly to SQLite.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-4 border border-emerald-100">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Doctor Feedback</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your assigned physiotherapist reviews measured kinematics and writes customized feedback visible in your patient portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-14 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-1">6 Rehabilitation Exercises</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Seated Knee Extension, Quadriceps Sets, Straight Leg Raise, Heel Slides, Standing Hamstring Curl, and Heel Raises.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-1">1D-CNN Sensor Classification</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Trained on 914 recorded trials from the KneE-PAD dataset (56 channels: EMG + IMU), evaluating full vs incomplete ROM.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 mb-1">Physiotherapist Portal</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Doctors inspect patient angles, repetitions, and tracking quality before saving written clinical recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
