export interface TrialSelectionItem {
  trial_id: string;
  subject_id: number;
  subject_name: string;
  class_id: number;
  ground_truth_label: string;
  trial_name: string;
  emg_samples: number;
  imu_samples: number;
  duration_seconds: number;
}

export interface SignalPreviewPoint {
  time: number;
  [key: string]: number;
}

export interface SensorDemoResponse {
  id?: number | null;
  trial_id: string;
  ground_truth_label: string;
  ground_truth_class_id: number;
  predicted_label: string;
  predicted_class_id: number;
  confidence: number;
  probabilities: Record<string, number>;
  model_version: string;
  created_at?: string | null;
  category_explanation: string;
  emg_preview: {
    channels: string[];
    data: SignalPreviewPoint[];
  };
  imu_preview: {
    channels: string[];
    data: SignalPreviewPoint[];
  };
}

export interface SensorDemoHistoryItem {
  id: number;
  dataset_trial_id: string;
  predicted_label: string;
  ground_truth_label: string;
  confidence: number;
  model_version: string;
  created_at: string;
}

export interface MLStatus {
  model_trained: boolean;
  model_version: string;
  model_file_exists: boolean;
  num_classes: number;
  classes: Record<number, string>;
  test_accuracy?: number | null;
  macro_f1?: number | null;
}
