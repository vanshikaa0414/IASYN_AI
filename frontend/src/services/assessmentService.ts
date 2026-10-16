import { api } from './api';
import { WebcamAssessment, PatientDashboardData } from '../types/assessment';

export const assessmentService = {
  getPatientDashboard: async (): Promise<PatientDashboardData> => {
    return api.get<PatientDashboardData>('/patient/dashboard');
  },

  getPatientAssessments: async (): Promise<WebcamAssessment[]> => {
    return api.get<WebcamAssessment[]>('/patient/assessments');
  },

  getAssessmentDetail: async (id: number): Promise<WebcamAssessment> => {
    return api.get<WebcamAssessment>(`/patient/assessments/${id}`);
  },

  createAssessment: async (data: {
    exercise_name: string;
    duration_seconds: number;
    repetition_count: number;
    min_knee_angle: number;
    max_knee_angle: number;
    range_of_motion: number;
    tracking_quality: string;
    observations: string[];
    assessment_status: string;
  }): Promise<WebcamAssessment> => {
    return api.post<WebcamAssessment>('/patient/assessments', data);
  }
};
