import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User, DoctorPatientAssignment
from app.models.assessment import WebcamAssessment, DoctorFeedback
from app.models.sensor_demo import SensorDemoResult
from app.schemas.assessment import (
    WebcamAssessmentCreateRequest,
    WebcamAssessmentResponse,
    DoctorFeedbackResponse
)
from app.schemas.sensor_demo import SensorDemoHistoryItem
from app.security.auth import require_patient

router = APIRouter(prefix="/patient", tags=["Patient Portal"])

@router.get("/dashboard")
def get_patient_dashboard(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    # Total assessments
    assessments_query = db.query(WebcamAssessment).filter(WebcamAssessment.patient_id == current_user.id)
    total_assessments = assessments_query.count()
    
    # Recent assessments
    recent_assessments = (
        assessments_query.order_by(desc(WebcamAssessment.created_at))
        .limit(5)
        .all()
    )
    
    # Assigned doctor
    assignment = db.query(DoctorPatientAssignment).filter(DoctorPatientAssignment.patient_id == current_user.id).first()
    assigned_doctor_name = assignment.doctor.name if assignment and assignment.doctor else "Assigned Physiotherapist"

    # Latest doctor feedback
    latest_feedback_obj = (
        db.query(DoctorFeedback)
        .join(WebcamAssessment)
        .filter(WebcamAssessment.patient_id == current_user.id)
        .order_by(desc(DoctorFeedback.created_at))
        .first()
    )

    latest_feedback = None
    if latest_feedback_obj:
        latest_feedback = {
            "id": latest_feedback_obj.id,
            "assessment_id": latest_feedback_obj.assessment_id,
            "doctor_name": latest_feedback_obj.doctor.name if latest_feedback_obj.doctor else "Dr. Specialist",
            "feedback_text": latest_feedback_obj.feedback_text,
            "created_at": latest_feedback_obj.created_at
        }

    # Best ROM and total reps
    best_rom = 0.0
    total_reps = 0
    for a in assessments_query.all():
        if a.range_of_motion > best_rom:
            best_rom = a.range_of_motion
        total_reps += a.repetition_count

    return {
        "patient_name": current_user.name,
        "assigned_doctor": assigned_doctor_name,
        "total_assessments": total_assessments,
        "total_reps": total_reps,
        "best_rom": round(best_rom, 1),
        "latest_feedback": latest_feedback,
        "recent_assessments": [
            {
                "id": a.id,
                "exercise_name": a.exercise_name,
                "created_at": a.created_at,
                "repetition_count": a.repetition_count,
                "range_of_motion": a.range_of_motion,
                "assessment_status": a.assessment_status,
                "review_status": a.review_status,
                "has_feedback": a.feedback is not None
            }
            for a in recent_assessments
        ]
    }

@router.get("/assessments", response_model=List[WebcamAssessmentResponse])
def get_patient_assessments(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    assessments = (
        db.query(WebcamAssessment)
        .filter(WebcamAssessment.patient_id == current_user.id)
        .order_by(desc(WebcamAssessment.created_at))
        .all()
    )
    
    result = []
    for a in assessments:
        feedback_data = None
        if a.feedback:
            feedback_data = DoctorFeedbackResponse(
                id=a.feedback.id,
                assessment_id=a.feedback.assessment_id,
                doctor_id=a.feedback.doctor_id,
                doctor_name=a.feedback.doctor.name if a.feedback.doctor else None,
                feedback_text=a.feedback.feedback_text,
                created_at=a.feedback.created_at
            )
        result.append(
            WebcamAssessmentResponse(
                id=a.id,
                patient_id=a.patient_id,
                patient_name=current_user.name,
                exercise_name=a.exercise_name,
                created_at=a.created_at,
                duration_seconds=a.duration_seconds,
                repetition_count=a.repetition_count,
                min_knee_angle=a.min_knee_angle,
                max_knee_angle=a.max_knee_angle,
                range_of_motion=a.range_of_motion,
                tracking_quality=a.tracking_quality,
                observations_json=a.observations_json,
                assessment_status=a.assessment_status,
                review_status=a.review_status,
                feedback=feedback_data
            )
        )
    return result

@router.post("/assessments", response_model=WebcamAssessmentResponse)
def create_patient_assessment(
    data: WebcamAssessmentCreateRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    new_assessment = WebcamAssessment(
        patient_id=current_user.id,
        exercise_name=data.exercise_name,
        duration_seconds=data.duration_seconds,
        repetition_count=data.repetition_count,
        min_knee_angle=data.min_knee_angle,
        max_knee_angle=data.max_knee_angle,
        range_of_motion=data.range_of_motion,
        tracking_quality=data.tracking_quality,
        observations_json=json.dumps(data.observations),
        assessment_status=data.assessment_status,
        review_status="Pending Review"
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    return WebcamAssessmentResponse(
        id=new_assessment.id,
        patient_id=new_assessment.patient_id,
        patient_name=current_user.name,
        exercise_name=new_assessment.exercise_name,
        created_at=new_assessment.created_at,
        duration_seconds=new_assessment.duration_seconds,
        repetition_count=new_assessment.repetition_count,
        min_knee_angle=new_assessment.min_knee_angle,
        max_knee_angle=new_assessment.max_knee_angle,
        range_of_motion=new_assessment.range_of_motion,
        tracking_quality=new_assessment.tracking_quality,
        observations_json=new_assessment.observations_json,
        assessment_status=new_assessment.assessment_status,
        review_status=new_assessment.review_status,
        feedback=None
    )

@router.get("/assessments/{assessment_id}", response_model=WebcamAssessmentResponse)
def get_single_assessment(
    assessment_id: int,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    assessment = (
        db.query(WebcamAssessment)
        .filter(WebcamAssessment.id == assessment_id, WebcamAssessment.patient_id == current_user.id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment report not found")

    feedback_data = None
    if assessment.feedback:
        feedback_data = DoctorFeedbackResponse(
            id=assessment.feedback.id,
            assessment_id=assessment.feedback.assessment_id,
            doctor_id=assessment.feedback.doctor_id,
            doctor_name=assessment.feedback.doctor.name if assessment.feedback.doctor else None,
            feedback_text=assessment.feedback.feedback_text,
            created_at=assessment.feedback.created_at
        )

    return WebcamAssessmentResponse(
        id=assessment.id,
        patient_id=assessment.patient_id,
        patient_name=current_user.name,
        exercise_name=assessment.exercise_name,
        created_at=assessment.created_at,
        duration_seconds=assessment.duration_seconds,
        repetition_count=assessment.repetition_count,
        min_knee_angle=assessment.min_knee_angle,
        max_knee_angle=assessment.max_knee_angle,
        range_of_motion=assessment.range_of_motion,
        tracking_quality=assessment.tracking_quality,
        observations_json=assessment.observations_json,
        assessment_status=assessment.assessment_status,
        review_status=assessment.review_status,
        feedback=feedback_data
    )

@router.get("/sensor-demo/history", response_model=List[SensorDemoHistoryItem])
def get_sensor_demo_history(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    results = (
        db.query(SensorDemoResult)
        .filter(SensorDemoResult.initiated_by_user_id == current_user.id)
        .order_by(desc(SensorDemoResult.created_at))
        .all()
    )
    return results
