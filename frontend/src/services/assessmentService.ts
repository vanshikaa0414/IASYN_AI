import { api } from './api';
import { authService } from './authService';
import {
  WebcamAssessment,
  PatientDashboardData,
  DoctorDashboardData,
  AssignedPatient,
  PatientProgressData,
  ModelEvaluationData,
  DoctorFeedback,
  AttemptDetail
} from '../types/assessment';

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
    total_attempts?: number;
    passed_attempts?: number;
    failed_attempts?: number;
    unassessable_attempts?: number;
    movement_pass_rate?: number | null;
    attempts?: AttemptDetail[];
    configured_criteria?: Record<string, any>;
  }): Promise<WebcamAssessment> => {
    return api.post<WebcamAssessment>('/patient/assessments', data);
  },

  uploadAssessmentVideo: async (assessmentId: number, videoBlob: Blob): Promise<{ status: string; assessment_id: number }> => {
    const formData = new FormData();
    const filename = `recording_${assessmentId}.webm`;
    formData.append('video', videoBlob, filename);

    const token = authService.getToken();
    const response = await fetch(`/api/assessments/${assessmentId}/video`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || `Video upload failed with status ${response.status}`);
    }

    return response.json();
  },

  getVideoStreamUrl: (assessmentId: number): string => {
    const token = authService.getToken();
    return token ? `/api/assessments/${assessmentId}/video?token=${encodeURIComponent(token)}` : `/api/assessments/${assessmentId}/video`;
  },

  deleteAssessmentVideo: async (assessmentId: number): Promise<{ status: string; message: string }> => {
    return api.delete<{ status: string; message: string }>(`/assessments/${assessmentId}/video`);
  },

  // Doctor portal methods
  getDoctorDashboard: async (): Promise<DoctorDashboardData> => {
    return api.get<DoctorDashboardData>('/doctor/dashboard');
  },

  getDoctorPatients: async (): Promise<AssignedPatient[]> => {
    return api.get<AssignedPatient[]>('/doctor/patients');
  },

  getDoctorAssessments: async (patientId?: number): Promise<WebcamAssessment[]> => {
    const endpoint = patientId ? `/doctor/assessments?patient_id=${patientId}` : '/doctor/assessments';
    return api.get<WebcamAssessment[]>(endpoint);
  },

  getDoctorAssessmentDetail: async (id: number): Promise<WebcamAssessment> => {
    return api.get<WebcamAssessment>(`/doctor/assessments/${id}`);
  },

  submitDoctorFeedback: async (assessmentId: number, feedbackText: string): Promise<DoctorFeedback> => {
    return api.post<DoctorFeedback>(`/doctor/assessments/${assessmentId}/feedback`, {
      feedback_text: feedbackText
    });
  },

  getPatientProgress: async (patientId: number): Promise<PatientProgressData> => {
    return api.get<PatientProgressData>(`/doctor/patients/${patientId}/progress`);
  },

  getModelEvaluation: async (): Promise<ModelEvaluationData> => {
    return api.get<ModelEvaluationData>('/doctor/model-evaluation');
  }
};
