import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PageTransition } from './components/common/PageTransition';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { ExerciseGuidePage } from './pages/patient/ExerciseGuidePage';
import { ExerciseDetailPage } from './pages/patient/ExerciseDetailPage';
import { LiveAssessmentPage } from './pages/patient/LiveAssessmentPage';
import { VideoComparisonPage } from './pages/patient/VideoComparisonPage';
import { SensorDemoPage } from './pages/patient/SensorDemoPage';
import { PatientReportsPage } from './pages/patient/PatientReportsPage';

import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatientsPage } from './pages/doctor/DoctorPatientsPage';
import { DoctorAssessmentsPage } from './pages/doctor/DoctorAssessmentsPage';
import { AssessmentDetailPage } from './pages/doctor/AssessmentDetailPage';
import { PatientProgressPage } from './pages/doctor/PatientProgressPage';
import { ModelEvaluationPage } from './pages/doctor/ModelEvaluationPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <div className="flex flex-col min-h-screen bg-[#050509] text-white selection:bg-[#A78BFA] selection:text-[#050509] relative">
            <div className="ambient-glow-mesh" aria-hidden="true" />
            <Navbar />
            <main className="flex-1 flex flex-col relative z-10">
              <PageTransition>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* Patient Portal Routes */}
                  <Route
                    path="/patient/dashboard"
                    element={
                      <ProtectedRoute allowedRole="PATIENT">
                        <PatientDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/exercises"
                    element={
                      <ProtectedRoute allowedRole="PATIENT">
                        <ExerciseGuidePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/exercises/:id"
                    element={
                      <ProtectedRoute allowedRole="PATIENT">
                        <ExerciseDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/live-assessment"
                    element={
                      <ProtectedRoute allowedRole="PATIENT">
                        <LiveAssessmentPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/video-comparison"
                    element={
                      <ProtectedRoute allowedRole="PATIENT">
                        <VideoComparisonPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/sensor-demo"
                    element={
                      <ProtectedRoute allowedRole="PATIENT">
                        <SensorDemoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patient/reports"
                    element={
                      <ProtectedRoute allowedRole="PATIENT">
                        <PatientReportsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Doctor Portal Routes */}
                  <Route
                    path="/doctor/dashboard"
                    element={
                      <ProtectedRoute allowedRole="DOCTOR">
                        <DoctorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/patients"
                    element={
                      <ProtectedRoute allowedRole="DOCTOR">
                        <DoctorPatientsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/assessments"
                    element={
                      <ProtectedRoute allowedRole="DOCTOR">
                        <DoctorAssessmentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/assessments/:id"
                    element={
                      <ProtectedRoute allowedRole="DOCTOR">
                        <AssessmentDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/progress"
                    element={
                      <ProtectedRoute allowedRole="DOCTOR">
                        <PatientProgressPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/model-evaluation"
                    element={
                      <ProtectedRoute allowedRole="DOCTOR">
                        <ModelEvaluationPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PageTransition>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
