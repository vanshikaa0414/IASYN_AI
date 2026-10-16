import datetime
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class TrialSelectionItem(BaseModel):
    trial_id: str  # e.g. "Subject_1/3/Trial_1"
    subject_id: int
    subject_name: str
    class_id: int
    ground_truth_label: str
    trial_name: str
    emg_samples: int
    imu_samples: int
    duration_seconds: float

class SensorPredictRequest(BaseModel):
    trial_id: str

class SensorDemoResponse(BaseModel):
    id: Optional[int] = None
    trial_id: str
    ground_truth_label: str
    ground_truth_class_id: int
    predicted_label: str
    predicted_class_id: int
    confidence: float
    probabilities: Dict[str, float]
    model_version: str
    created_at: Optional[datetime.datetime] = None
    category_explanation: str
    emg_preview: Dict[str, Any]
    imu_preview: Dict[str, Any]

class SensorDemoHistoryItem(BaseModel):
    id: int
    dataset_trial_id: str
    predicted_label: str
    ground_truth_label: str
    confidence: float
    model_version: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class MLStatusResponse(BaseModel):
    model_trained: bool
    model_version: str
    model_file_exists: bool
    num_classes: int
    classes: Dict[int, str]
    test_accuracy: Optional[float] = None
    macro_f1: Optional[float] = None
