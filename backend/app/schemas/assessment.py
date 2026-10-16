import datetime
from pydantic import BaseModel
from typing import List, Optional, Any

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
