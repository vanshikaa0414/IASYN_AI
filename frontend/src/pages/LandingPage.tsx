import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  Camera, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  ShieldCheck, 
  User as UserIcon, 
  Stethoscope,
  Layers,
  TrendingUp,
  FileText
} from 'lucide-react';
import { VioletDigitalGlobe } from '../components/common/VioletDigitalGlobe';

export const LandingPage: React.FC = () => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050509] text-white selection:bg-[#A78BFA] selection:text-[#050509] overflow-x-hidden">
      {/* =========================================================================
          HERO SECTION — CENTERED HEADLINE & ROTATING VIOLET DIGITAL GLOBE
          ========================================================================= */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-8 pb-16">
        {/* Subtle Ambient Radial Lighting */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124, 108, 245, 0.16) 0%, rgba(167, 139, 250, 0.04) 50%, transparent 70%)',
            filter: 'blur(60px)'
          }}
        />

        {/* 3D Rotating Violet Digital Globe */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-80 pointer-events-none">
          <VioletDigitalGlobe size={620} />
        </div>

        {/* Foreground Content (Masked & Layered over Globe) */}
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-6">
          {/* Subtle Technology Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-violet text-xs font-semibold tracking-wider uppercase backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>AI-Assisted Knee Rehabilitation System</span>
          </div>

          {/* Centered Large Typography */}
          <h1 
            className="font-extrabold tracking-tight leading-[0.98] text-white text-center max-w-3xl"
            style={{ fontSize: 'clamp(3rem, 6.5vw, 5.8rem)' }}
          >
            MOVEMENT.
            <br />
            <span className="bg-gradient-to-r from-white via-[#A78BFA] to-[#7DE8F0] bg-clip-text text-transparent">
              UNDERSTOOD.
            </span>
          </h1>

          {/* Short Supporting Description */}
          <p className="text-base sm:text-lg text-[#B7B8C8] leading-relaxed max-w-2xl font-normal text-center">
            AI-assisted knee rehabilitation with real-time movement analysis, exercise tracking, and connected physiotherapist monitoring.
          </p>

          {/* Pill-Shaped CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              to="/login?portal=patient"
              className="px-8 py-3.5 btn-pill-primary text-sm uppercase tracking-wider font-bold group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="px-7 py-3.5 btn-pill-secondary text-sm tracking-wide font-medium cursor-pointer"
            >
              <span>Explore IASYN AI</span>
            </button>
          </div>

          {/* Key Bullet Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-[#85879C] font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#7DE8F0]" />
              Equal 50/50 Camera &amp; 3D Pose
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#A78BFA]" />
              MediaPipe World Landmarks
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
              Doctor Feedback Persistence
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 1: HOW IT WORKS — CLOSED-LOOP CLINICAL WORKFLOW
          ========================================================================= */}
      <section id="how-it-works" className="py-20 border-t border-subtle bg-[#0B0D16]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] badge-violet px-3 py-1 inline-block">
              Continuous Care Protocol
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How IASYN AI Operates
            </h2>
            <p className="text-sm text-[#B7B8C8]">
              A closed feedback loop uniting computer vision motion capture with clinical oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-dark-card card-hover-violet space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/20 flex items-center justify-center text-[#A78BFA]">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">1. Real-time Movement Capture</h3>
              <p className="text-sm text-[#B7B8C8] leading-relaxed">
                Patients perform seated knee extensions in front of their browser webcam. 33 MediaPipe pose landmarks and joint angles are analyzed client-side with 0 delay.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-dark-card card-hover-violet space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#7DE8F0]/10 border border-[#7DE8F0]/20 flex items-center justify-center text-[#7DE8F0]">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">2. Equal 3D Biomechanical View</h3>
              <p className="text-sm text-[#B7B8C8] leading-relaxed">
                Live camera and 3D pose visualization render side by side in equal 50/50 proportion. Real-time repetition counting classifies attempts as PASS, FAIL, or UNABLE TO ASSESS.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-dark-card card-hover-violet space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#34D399]/10 border border-[#34D399]/20 flex items-center justify-center text-[#34D399]">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">3. Physiotherapist Review</h3>
              <p className="text-sm text-[#B7B8C8] leading-relaxed">
                Recorded session videos are saved securely with comprehensive movement reports. Assigned clinicians inspect kinematics, review videos, and issue longitudinal feedback.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: GUIDED EXERCISES PREVIEW
          ========================================================================= */}
      <section id="exercises" className="py-20 border-t border-subtle bg-[#050509]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#7DE8F0] badge-cyan px-3 py-1 inline-block mb-2">
                Rehabilitation Library
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Structured Knee Exercises
              </h2>
            </div>

            <Link
              to="/login?portal=patient"
              className="text-xs font-bold text-[#A78BFA] hover:text-[#7DE8F0] flex items-center gap-1 transition-colors"
            >
              <span>Explore All 6 Protocols</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                id: 'seated-knee-extension',
                title: 'Seated Knee Extension',
                target: 'Quadriceps isolation & terminal extension',
                live: true,
                desc: 'Active seated extension with 180° terminal extension threshold and posture monitoring.',
                imageUrl: '/images/exercises/seated-knee-extension.jpg',
              },
              {
                id: 'quadriceps-sets',
                title: 'Quadriceps Sets',
                target: 'Isometric vastus medialis strengthening',
                live: false,
                desc: 'Supine isometric quad contractions to preserve muscle tone without joint impact.',
                imageUrl: '/images/exercises/quadriceps-sets.jpg',
              },
              {
                id: 'straight-leg-raise',
                title: 'Straight Leg Raise',
                target: 'Hip flexor & anterior thigh power',
                live: false,
                desc: 'Elevating the extended lower limb while keeping the knee completely locked.',
                imageUrl: '/images/exercises/straight-leg-raise.jpg',
              },
              {
                id: 'heel-slides',
                title: 'Heel Slides',
                target: 'Active flexion restoration & range of motion',
                live: false,
                desc: 'Sliding heel along treatment surface to safely restore post-operative knee flexion.',
                imageUrl: '/images/exercises/heel-slides.jpg',
              },
              {
                id: 'standing-hamstring-curl',
                title: 'Standing Hamstring Curl',
                target: 'Posterior chain stability & balance',
                live: false,
                desc: 'Unilateral standing knee flexion to rebalance agonist-antagonist ratio.',
                imageUrl: '/images/exercises/standing-hamstring-curl.jpg',
              },
              {
                id: 'heel-raises',
                title: 'Calf & Heel Raises',
                target: 'Gastrocnemius-soleus complex power',
                live: false,
                desc: 'Bilateral and unilateral ankle plantarflexion for weight-bearing rehabilitation.',
                imageUrl: '/images/exercises/heel-raises.jpg',
              },
            ].map((ex) => (
              <div 
                key={ex.id}
                className="rounded-2xl bg-dark-card border-subtle card-hover-violet overflow-hidden flex flex-col justify-between group shadow-xl"
              >
                <div className="h-40 relative overflow-hidden bg-[#0B0D16] border-b border-white/5">
                  <img
                    src={ex.imageUrl}
                    alt={ex.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#11131D] via-black/20 to-black/60 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between z-10 pointer-events-none">
                    <span className="text-[10px] font-mono text-[#B7B8C8] uppercase bg-[#0B0D16]/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                      {ex.target}
                    </span>
                    {ex.live && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7DE8F0]/20 text-[#7DE8F0] border border-[#7DE8F0]/40 animate-pulse backdrop-blur-md">
                        LIVE AI WEBCAM
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-3 flex flex-col justify-between flex-1">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white group-hover:text-[#A78BFA] transition-colors">{ex.title}</h3>
                    <p className="text-xs text-[#B7B8C8] leading-relaxed line-clamp-2">{ex.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <Link
                      to="/login?portal=patient"
                      className="text-[#A78BFA] hover:text-white font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>View Guide</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: DUAL AI TECHNOLOGIES
          ========================================================================= */}
      <section id="technology" className="py-20 border-t border-subtle bg-[#0B0D16]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A78BFA] badge-violet px-3 py-1 inline-block">
              Machine Learning Foundation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Two Integrated AI Pipelines
            </h2>
            <p className="text-sm text-[#B7B8C8]">
              Combining optical computer vision pose estimation with supervised 1D-CNN multimodal sensor classification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MediaPipe Pose Card */}
            <div className="p-8 rounded-2xl bg-dark-card border-subtle space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#7DE8F0]/15 border border-[#7DE8F0]/30 flex items-center justify-center text-[#7DE8F0]">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7DE8F0] badge-cyan px-2.5 py-0.5 inline-block">
                Computer Vision
              </span>
              <h3 className="text-xl font-bold text-white">MediaPipe Pose Landmarker</h3>
              <p className="text-sm text-[#B7B8C8] leading-relaxed">
                Tracks 33 full-body anatomical world coordinates at 60 FPS in pure WebAssembly/GPU. Calculates real-time hip-knee-ankle vector angles, filters noise using 1-Euro adaptive speed smoothing, and evaluates repetitions with attempt-level precision.
              </p>
            </div>

            {/* KneE-PAD 1D-CNN Card */}
            <div className="p-8 rounded-2xl bg-dark-card border-subtle space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#A78BFA]/15 border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA]">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A78BFA] badge-violet px-2.5 py-0.5 inline-block">
                Multimodal Sensor AI
              </span>
              <h3 className="text-xl font-bold text-white">KneE-PAD 1D-CNN Classifier</h3>
              <p className="text-sm text-[#B7B8C8] leading-relaxed">
                Trained deep 1D-CNN classifying 6-channel sEMG and 6-DOF IMU sensor signals into rehabilitation exercises. Achieves 83.85% test accuracy on held-out subject data with complete confusion matrix and ROC analytics in the Doctor Portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: ENTERPRISE CALL TO ACTION
          ========================================================================= */}
      <section className="py-24 border-t border-subtle bg-[#050509] text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#34D399] badge-emerald px-3 py-1 inline-block">
            Clinical Platform Ready
          </span>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Analyze Movement?
          </h2>

          <p className="text-base text-[#B7B8C8] max-w-xl mx-auto">
            Experience real-time joint angle tracking, equal-sized 3D pose visualization, and clinician progress reviews.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/login?portal=patient"
              className="w-full sm:w-auto px-8 py-3.5 btn-pill-primary text-sm uppercase tracking-wider font-bold"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              <span>Launch Patient Portal</span>
            </Link>

            <Link
              to="/login?portal=doctor"
              className="w-full sm:w-auto px-8 py-3.5 btn-pill-secondary text-sm tracking-wide font-medium"
            >
              <Stethoscope className="w-4 h-4 mr-2 text-[#A78BFA]" />
              <span>Doctor Portal Access</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
