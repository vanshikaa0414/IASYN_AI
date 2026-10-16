export interface DoctorFeedback {
  id: number;
  assessment_id: number;
  doctor_id: number;
  doctor_name?: string;
  feedback_text: string;
  created_at: string;
}

export interface WebcamAssessment {
  id: number;
  patient_id: number;
  patient_name?: string;
  exercise_name: string;
  created_at: string;
  duration_seconds: number;
  repetition_count: number;
  min_knee_angle: number;
  max_knee_angle: number;
  range_of_motion: number;
  tracking_quality: string;
  observations_json: string; // JSON encoded string of string[]
  assessment_status: string;
  review_status: string;
  feedback?: DoctorFeedback | null;
}

export interface PatientDashboardData {
  patient_name: string;
  assigned_doctor: string;
  total_assessments: number;
  total_reps: number;
  best_rom: number;
  latest_feedback?: {
    id: number;
    assessment_id: number;
    doctor_name: string;
    feedback_text: string;
    created_at: string;
  } | null;
  recent_assessments: {
    id: number;
    exercise_name: string;
    created_at: string;
    repetition_count: number;
    range_of_motion: number;
    assessment_status: string;
    review_status: string;
    has_feedback: boolean;
  }[];
}

export interface DoctorDashboardData {
  doctor_name: string;
  total_patients: number;
  total_assessments: number;
  pending_reviews: number;
  completed_reviews: number;
  recent_assessments: {
    id: number;
    patient_id: number;
    patient_name: string;
    exercise_name: string;
    created_at: string;
    repetition_count: number;
    range_of_motion: number;
    assessment_status: string;
    review_status: string;
    has_feedback: boolean;
  }[];
}

export interface AssignedPatient {
  id: number;
  name: string;
  email: string;
  total_assessments: number;
  pending_reviews: number;
  latest_assessment_date?: string | null;
}
