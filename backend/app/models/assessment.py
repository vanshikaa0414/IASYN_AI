import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class WebcamAssessment(Base):
    __tablename__ = "webcam_assessments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_name = Column(String(100), nullable=False, default="Seated Knee Extension")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    
    duration_seconds = Column(Integer, default=0, nullable=False)
    repetition_count = Column(Integer, default=0, nullable=False)
    min_knee_angle = Column(Float, nullable=False, default=0.0)
    max_knee_angle = Column(Float, nullable=False, default=0.0)
    range_of_motion = Column(Float, nullable=False, default=0.0)
    
    # Attempt-level metrics
    total_attempts = Column(Integer, default=0, nullable=False)
    passed_attempts = Column(Integer, default=0, nullable=False)
    failed_attempts = Column(Integer, default=0, nullable=False)
    unassessable_attempts = Column(Integer, default=0, nullable=False)
    movement_pass_rate = Column(Float, nullable=True) # Percentage (0.0 to 100.0) or None
    
    # Detailed JSON representations for rich historical querying
    attempts_json = Column(Text, nullable=False, default="[]") # Detailed attempt-by-attempt records
    configured_criteria_json = Column(Text, nullable=False, default="{}") # Snapshots of thresholds used
    
    tracking_quality = Column(String(50), nullable=False, default="Good")
    observations_json = Column(Text, nullable=False, default="[]") # JSON encoded list of observations
    assessment_status = Column(String(50), nullable=False, default="Meets configured criteria")
    review_status = Column(String(50), nullable=False, default="Pending Review")
    
    # Video Recording Storage
    has_video = Column(Boolean, default=False, nullable=False)
    video_storage_path = Column(String(255), nullable=True)
    video_mime_type = Column(String(50), nullable=True)
    video_file_size = Column(Integer, nullable=True)
    video_duration = Column(Float, nullable=True)
    
    # Demonstration record flag
    is_demo = Column(Boolean, default=False, nullable=False)

    # Relationships
    patient = relationship("User", back_populates="webcam_assessments", foreign_keys=[patient_id])
    feedback = relationship("DoctorFeedback", back_populates="assessment", cascade="all, delete-orphan", uselist=False)
    attempts = relationship("AssessmentAttempt", back_populates="assessment", cascade="all, delete-orphan")

class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("webcam_assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number = Column(Integer, nullable=False)
    start_time = Column(Float, nullable=False) # Offset seconds from recording start
    end_time = Column(Float, nullable=False)
    outcome = Column(String(30), nullable=False) # "PASS", "FAIL", "UNABLE_TO_ASSESS"
    
    min_knee_angle = Column(Float, nullable=False, default=90.0)
    max_knee_angle = Column(Float, nullable=False, default=90.0)
    range_of_motion = Column(Float, nullable=False, default=0.0)
    extension_duration = Column(Float, nullable=False, default=0.0)
    return_duration = Column(Float, nullable=False, default=0.0)
    dwell_duration = Column(Float, nullable=False, default=0.0)
    trunk_lean_max = Column(Float, nullable=False, default=0.0)
    tracking_quality = Column(String(50), nullable=False, default="Optimal")
    deviations_json = Column(Text, nullable=False, default="[]")

    assessment = relationship("WebcamAssessment", back_populates="attempts")

class DoctorFeedback(Base):
    __tablename__ = "doctor_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("webcam_assessments.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    feedback_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    assessment = relationship("WebcamAssessment", back_populates="feedback")
    doctor = relationship("User", foreign_keys=[doctor_id])

class ExerciseSchedule(Base):
    __tablename__ = "exercise_schedules"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_date = Column(String(20), nullable=False, index=True) # "YYYY-MM-DD"
    planned_sets = Column(Integer, nullable=False, default=1)
    completed_sets = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="SCHEDULED") # "COMPLETED", "PARTIAL", "MISSED", "SCHEDULED"

    patient = relationship("User", foreign_keys=[patient_id])
