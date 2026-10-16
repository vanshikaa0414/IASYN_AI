import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
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
    
    tracking_quality = Column(String(50), nullable=False, default="Good")
    observations_json = Column(Text, nullable=False, default="[]") # JSON encoded list of observations
    assessment_status = Column(String(50), nullable=False, default="Meets configured criteria")
    review_status = Column(String(50), nullable=False, default="Pending Review")

    # Relationships
    patient = relationship("User", back_populates="webcam_assessments", foreign_keys=[patient_id])
    feedback = relationship("DoctorFeedback", back_populates="assessment", cascade="all, delete-orphan", uselist=False)

class DoctorFeedback(Base):
    __tablename__ = "doctor_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("webcam_assessments.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    feedback_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    assessment = relationship("WebcamAssessment", back_populates="feedback")
    doctor = relationship("User", foreign_keys=[doctor_id])
