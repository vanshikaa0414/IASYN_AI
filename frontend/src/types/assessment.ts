export interface DoctorFeedback {
  id: number;
  assessment_id: number;
  doctor_id: number;
  doctor_name?: string;
  feedback_text: string;
  created_at: string;
}

export type AttemptOutcome = 'PASS' | 'FAIL' | 'UNABLE_TO_ASSESS';

export interface AttemptDetail {
  attempt_number: number;
  start_time: number;
  end_time: number;
  outcome: AttemptOutcome;
  min_knee_angle: number;
  max_knee_angle: number;
  range_of_motion: number;
  min_angle?: number;
  max_angle?: number;
  rom?: number;
  extension_duration?: number;
  return_duration?: number;
  dwell_duration?: number;
  trunk_lean_max?: number;
  tracking_quality?: string;
  quality?: string;
  deviations: string[];
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
  
  // Attempt-level metrics
  total_attempts?: number;
  passed_attempts?: number;
  failed_attempts?: number;
  unassessable_attempts?: number;
  movement_pass_rate?: number | null;
  attempts_json?: string;
  configured_criteria_json?: string;

  // Video metadata
  has_video?: boolean;
  video_mime_type?: string | null;
  video_file_size?: number | null;
  video_duration?: number | null;
  is_demo?: boolean;

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
    has_video?: boolean;
    is_demo?: boolean;
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
  adherence_pattern?: string;
}

export interface DailyAdherencePoint {
  date: string;
  day_label: string;
  completed_sets: number;
  planned_sets: number;
  pass_rate?: number | null;
  passed_attempts: number;
  failed_attempts: number;
  unassessable_attempts: number;
  avg_rom?: number | null;
  sessions_count: number;
}

export interface PatientProgressData {
  patient_id: number;
  patient_name: string;
  adherence_pattern: string;
  is_demo_patient: boolean;
  total_completed_sets: number;
  total_planned_sets: number;
  adherence_rate: number;
  daily_timeline: DailyAdherencePoint[];
  sessions: WebcamAssessment[];
}

export interface ModelEvaluationData {
  sensor_model?: {
    model_name: string;
    model_version: string;
    test_subjects: number[];
    num_test_trials: number;
    accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    confusion_matrix: number[][];
    per_class: Record<string, { precision: number; recall: number; f1: number; support: number }>;
    class_names: string[];
  };
  webcam_model: {
    available: boolean;
    status_message: string;
    notice: string;
    ground_truth_status?: string;
  };
  yolo_vs_mediapipe_benchmark?: {
    title: string;
    tested_exercise: string;
    mediapipe: {
      inference_engine: string;
      runtime_environment: string;
      avg_inference_latency_ms: number;
      server_gpu_memory_mb: number;
      privacy_architecture: string;
      knee_angle_stability: string;
      repetition_state_accuracy: string;
      suitability: string;
    };
    yolo_pose: {
      inference_engine: string;
      runtime_environment: string;
      avg_inference_latency_ms: number;
      server_gpu_memory_mb: number;
      privacy_architecture: string;
      knee_angle_stability: string;
      repetition_state_accuracy: string;
      suitability: string;
    };
    recommendation: string;
  };
}
