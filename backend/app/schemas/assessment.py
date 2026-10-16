import datetime
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class DoctorFeedbackResponse(BaseModel):
    id: int
    assessment_id: int
    doctor_id: int
    doctor_name: Optional[str] = None
    feedback_text: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class FeedbackCreateRequest(BaseModel):
    feedback_text: str

class AttemptDetail(BaseModel):
    attempt_number: int
    start_time: float
    end_time: float
    outcome: str # "PASS", "FAIL", "UNABLE_TO_ASSESS"
    min_knee_angle: float
    max_knee_angle: float
    range_of_motion: float
    extension_duration: float = 0.0
    return_duration: float = 0.0
    dwell_duration: float = 0.0
    trunk_lean_max: float = 0.0
    tracking_quality: str = "Optimal"
    deviations: List[str] = []

class WebcamAssessmentCreateRequest(BaseModel):
    exercise_name: str = "Seated Knee Extension"
    duration_seconds: int
    repetition_count: int
    min_knee_angle: float
    max_knee_angle: float
    range_of_motion: float
    tracking_quality: str
    observations: List[str]
    assessment_status: str
    
    # Attempt-level metrics
    total_attempts: int = 0
    passed_attempts: int = 0
    failed_attempts: int = 0
    unassessable_attempts: int = 0
    movement_pass_rate: Optional[float] = None
    attempts: Optional[List[AttemptDetail]] = None
    configured_criteria: Optional[Dict[str, Any]] = None

class WebcamAssessmentResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    exercise_name: str
    created_at: datetime.datetime
    duration_seconds: int
    repetition_count: int
    min_knee_angle: float
    max_knee_angle: float
    range_of_motion: float
    tracking_quality: str
    observations_json: str
    assessment_status: str
    review_status: str
    
    # Attempt-level extensions
    total_attempts: int = 0
    passed_attempts: int = 0
    failed_attempts: int = 0
    unassessable_attempts: int = 0
    movement_pass_rate: Optional[float] = None
    attempts_json: str = "[]"
    configured_criteria_json: str = "{}"
    
    # Video metadata
    has_video: bool = False
    video_mime_type: Optional[str] = None
    video_file_size: Optional[int] = None
    video_duration: Optional[float] = None
    is_demo: bool = False
    
    feedback: Optional[DoctorFeedbackResponse] = None

    class Config:
        from_attributes = True

class PatientSummaryResponse(BaseModel):
    id: int
    name: str
    email: str
    total_assessments: int
    pending_reviews: int
    latest_assessment_date: Optional[datetime.datetime] = None
    adherence_pattern: Optional[str] = None # e.g. "Increasing Adherence", "Consistent"

class DailyAdherencePoint(BaseModel):
    date: str # "YYYY-MM-DD"
    day_label: str # "Day 1", "Day 2", etc.
    completed_sets: int
    planned_sets: int
    pass_rate: Optional[float] = None
    passed_attempts: int = 0
    failed_attempts: int = 0
    unassessable_attempts: int = 0
    avg_rom: Optional[float] = None
    sessions_count: int = 0

class PatientProgressResponse(BaseModel):
    patient_id: int
    patient_name: str
    adherence_pattern: str
    is_demo_patient: bool = False
    total_completed_sets: int
    total_planned_sets: int
    adherence_rate: float
    daily_timeline: List[DailyAdherencePoint]
    sessions: List[WebcamAssessmentResponse]
