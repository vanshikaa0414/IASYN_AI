import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User, DoctorPatientAssignment
from app.models.assessment import WebcamAssessment, DoctorFeedback
from app.schemas.assessment import (
    WebcamAssessmentResponse,
    DoctorFeedbackResponse,
    FeedbackCreateRequest,
    PatientSummaryResponse
)
from app.security.auth import require_doctor

router = APIRouter(prefix="/doctor", tags=["Doctor Portal"])

@router.get("/dashboard")
def get_doctor_dashboard(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    # Find assigned patient IDs
    assignments = db.query(DoctorPatientAssignment).filter(DoctorPatientAssignment.doctor_id == current_user.id).all()
    patient_ids = [a.patient_id for a in assignments]
    
    total_patients = len(patient_ids)
    
    # Assessments across assigned patients
    assessments_query = db.query(WebcamAssessment).filter(WebcamAssessment.patient_id.in_(patient_ids)) if patient_ids else db.query(WebcamAssessment).filter(False)
    total_assessments = assessments_query.count()
    pending_reviews = assessments_query.filter(WebcamAssessment.review_status == "Pending Review").count()
    completed_reviews = assessments_query.filter(WebcamAssessment.review_status == "Reviewed").count()
    
    recent_assessments = (
        assessments_query.order_by(desc(WebcamAssessment.created_at))
        .limit(6)
        .all()
    )

    return {
        "doctor_name": current_user.name,
        "total_patients": total_patients,
        "total_assessments": total_assessments,
        "pending_reviews": pending_reviews,
        "completed_reviews": completed_reviews,
        "recent_assessments": [
            {
                "id": a.id,
                "patient_id": a.patient_id,
                "patient_name": a.patient.name if a.patient else f"Patient #{a.patient_id}",
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

@router.get("/patients", response_model=List[PatientSummaryResponse])
def get_assigned_patients(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    assignments = db.query(DoctorPatientAssignment).filter(DoctorPatientAssignment.doctor_id == current_user.id).all()
    
    result = []
    for a in assignments:
        p = a.patient
        if not p:
            continue
        p_assessments = db.query(WebcamAssessment).filter(WebcamAssessment.patient_id == p.id)
        total_p_assessments = p_assessments.count()
        pending_p = p_assessments.filter(WebcamAssessment.review_status == "Pending Review").count()
        latest_p = p_assessments.order_by(desc(WebcamAssessment.created_at)).first()
        
        result.append(
            PatientSummaryResponse(
                id=p.id,
                name=p.name,
                email=p.email,
                total_assessments=total_p_assessments,
                pending_reviews=pending_p,
                latest_assessment_date=latest_p.created_at if latest_p else None
            )
        )
    return result

@router.get("/assessments", response_model=List[WebcamAssessmentResponse])
def get_doctor_assessments(
    patient_id: Optional[int] = None,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    # Verify assigned patients
    assignments = db.query(DoctorPatientAssignment).filter(DoctorPatientAssignment.doctor_id == current_user.id).all()
    assigned_patient_ids = [a.patient_id for a in assignments]
    
    if not assigned_patient_ids:
        return []
        
    query = db.query(WebcamAssessment).filter(WebcamAssessment.patient_id.in_(assigned_patient_ids))
    if patient_id is not None:
        if patient_id not in assigned_patient_ids:
            raise HTTPException(status_code=403, detail="Patient is not assigned to you")
        query = query.filter(WebcamAssessment.patient_id == patient_id)
        
    assessments = query.order_by(desc(WebcamAssessment.created_at)).all()
    
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
                patient_name=a.patient.name if a.patient else None,
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

@router.get("/assessments/{assessment_id}", response_model=WebcamAssessmentResponse)
def get_doctor_assessment_detail(
    assessment_id: int,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    assessment = db.query(WebcamAssessment).filter(WebcamAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    # Check if patient belongs to doctor
    assignment = (
        db.query(DoctorPatientAssignment)
        .filter(
            DoctorPatientAssignment.doctor_id == current_user.id,
            DoctorPatientAssignment.patient_id == assessment.patient_id
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=403, detail="Patient is not assigned to you")

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
        patient_name=assessment.patient.name if assessment.patient else None,
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

@router.post("/assessments/{assessment_id}/feedback", response_model=DoctorFeedbackResponse)
def submit_doctor_feedback(
    assessment_id: int,
    data: FeedbackCreateRequest,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    assessment = db.query(WebcamAssessment).filter(WebcamAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    # Check authorization
    assignment = (
        db.query(DoctorPatientAssignment)
        .filter(
            DoctorPatientAssignment.doctor_id == current_user.id,
            DoctorPatientAssignment.patient_id == assessment.patient_id
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=403, detail="Patient is not assigned to you")

    if not data.feedback_text.strip():
        raise HTTPException(status_code=400, detail="Feedback text cannot be empty")

    # Update or create feedback
    existing_feedback = db.query(DoctorFeedback).filter(DoctorFeedback.assessment_id == assessment_id).first()
    if existing_feedback:
        existing_feedback.feedback_text = data.feedback_text.strip()
        existing_feedback.doctor_id = current_user.id
        existing_feedback.created_at = datetime.datetime.utcnow()
        feedback_record = existing_feedback
    else:
        feedback_record = DoctorFeedback(
            assessment_id=assessment_id,
            doctor_id=current_user.id,
            feedback_text=data.feedback_text.strip(),
            created_at=datetime.datetime.utcnow()
        )
        db.add(feedback_record)
        
    # Mark assessment as Reviewed
    assessment.review_status = "Reviewed"
    db.commit()
    db.refresh(feedback_record)

    return DoctorFeedbackResponse(
        id=feedback_record.id,
        assessment_id=feedback_record.assessment_id,
        doctor_id=feedback_record.doctor_id,
        doctor_name=current_user.name,
        feedback_text=feedback_record.feedback_text,
        created_at=feedback_record.created_at
    )
