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

from app.models.assessment import WebcamAssessment, DoctorFeedback, AssessmentAttempt

def format_assessment_response(a: WebcamAssessment, patient_name: Optional[str] = None) -> WebcamAssessmentResponse:
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
    return WebcamAssessmentResponse(
        id=a.id,
        patient_id=a.patient_id,
        patient_name=patient_name or (a.patient.name if a.patient else None),
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
        total_attempts=a.total_attempts or 0,
        passed_attempts=a.passed_attempts or 0,
        failed_attempts=a.failed_attempts or 0,
        unassessable_attempts=a.unassessable_attempts or 0,
        movement_pass_rate=a.movement_pass_rate,
        attempts_json=a.attempts_json or "[]",
        configured_criteria_json=a.configured_criteria_json or "{}",
        has_video=bool(a.has_video),
        video_mime_type=a.video_mime_type,
        video_file_size=a.video_file_size,
        video_duration=a.video_duration,
        is_demo=bool(a.is_demo),
        feedback=feedback_data
    )

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
    return [format_assessment_response(a, current_user.name) for a in assessments]

@router.post("/assessments", response_model=WebcamAssessmentResponse)
def create_patient_assessment(
    data: WebcamAssessmentCreateRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    # Prepare JSON serializations
    attempts_data = [a.dict() if hasattr(a, "dict") else dict(a) for a in data.attempts] if data.attempts else []
    attempts_json_str = json.dumps(attempts_data)
    criteria_json_str = json.dumps(data.configured_criteria or {
        "min_extension_angle": 150.0,
        "max_starting_angle": 105.0,
        "min_hold_seconds": 0.5,
        "max_trunk_compensation_deg": 18.0
    })

    # Internal consistency check & Movement Criteria Pass Rate
    # Formula: Passed Attempts / (Passed Attempts + Failed Attempts) * 100
    # Unassessable attempts are strictly excluded from the denominator.
    assessable = data.passed_attempts + data.failed_attempts
    calc_pass_rate = None
    if assessable > 0:
        calc_pass_rate = round((data.passed_attempts / assessable) * 100.0, 1)
    elif data.movement_pass_rate is not None:
        calc_pass_rate = data.movement_pass_rate

    new_assessment = WebcamAssessment(
        patient_id=current_user.id,
        exercise_name=data.exercise_name,
        duration_seconds=data.duration_seconds,
        repetition_count=data.repetition_count,
        min_knee_angle=data.min_knee_angle,
        max_knee_angle=data.max_knee_angle,
        range_of_motion=data.range_of_motion,
        total_attempts=data.total_attempts,
        passed_attempts=data.passed_attempts,
        failed_attempts=data.failed_attempts,
        unassessable_attempts=data.unassessable_attempts,
        movement_pass_rate=calc_pass_rate,
        attempts_json=attempts_json_str,
        configured_criteria_json=criteria_json_str,
        tracking_quality=data.tracking_quality,
        observations_json=json.dumps(data.observations),
        assessment_status=data.assessment_status,
        review_status="Pending Review",
        has_video=False,
        is_demo=False
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    # Persist individual attempt rows for structured queries
    if data.attempts:
        for att in data.attempts:
            att_row = AssessmentAttempt(
                assessment_id=new_assessment.id,
                attempt_number=att.attempt_number,
                start_time=att.start_time,
                end_time=att.end_time,
                outcome=att.outcome,
                min_knee_angle=att.min_knee_angle,
                max_knee_angle=att.max_knee_angle,
                range_of_motion=att.range_of_motion,
                extension_duration=att.extension_duration,
                return_duration=att.return_duration,
                dwell_duration=att.dwell_duration,
                trunk_lean_max=att.trunk_lean_max,
                tracking_quality=att.tracking_quality,
                deviations_json=json.dumps(att.deviations)
            )
            db.add(att_row)
        db.commit()

    return format_assessment_response(new_assessment, current_user.name)

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

    return format_assessment_response(assessment, current_user.name)


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
