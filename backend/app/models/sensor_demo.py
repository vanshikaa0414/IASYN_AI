import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class SensorDemoResult(Base):
    __tablename__ = "sensor_demo_results"

    id = Column(Integer, primary_key=True, index=True)
    initiated_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_trial_id = Column(String(100), nullable=False) # e.g. "Subject_1/3/Trial_1"
    predicted_label = Column(String(100), nullable=False)
    ground_truth_label = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    model_version = Column(String(50), nullable=False, default="1D-CNN-v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="sensor_demo_results", foreign_keys=[initiated_by_user_id])
