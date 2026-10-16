import { api } from './api';
import { DoctorDashboardData, AssignedPatient, WebcamAssessment, DoctorFeedback } from '../types/assessment';

export const doctorService = {
  getDoctorDashboard: async (): Promise<DoctorDashboardData> => {
    return api.get<DoctorDashboardData>('/doctor/dashboard');
  },

  getAssignedPatients: async (): Promise<AssignedPatient[]> => {
    return api.get<AssignedPatient[]>('/doctor/patients');
  },

  getDoctorAssessments: async (patientId?: number): Promise<WebcamAssessment[]> => {
    const query = patientId ? `?patient_id=${patientId}` : '';
    return api.get<WebcamAssessment[]>(`/doctor/assessments${query}`);
  },

  getAssessmentDetail: async (assessmentId: number): Promise<WebcamAssessment> => {
    return api.get<WebcamAssessment>(`/doctor/assessments/${assessmentId}`);
  },

  submitFeedback: async (assessmentId: number, feedbackText: string): Promise<DoctorFeedback> => {
    return api.post<DoctorFeedback>(`/doctor/assessments/${assessmentId}/feedback`, {
      feedback_text: feedbackText
    });
  }
};
