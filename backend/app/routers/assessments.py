import os
import uuid
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db, VIDEO_STORAGE_DIR
from app.models.user import User, DoctorPatientAssignment, UserRole
from app.models.assessment import WebcamAssessment
from app.schemas.assessment import WebcamAssessmentResponse
from app.security.auth import get_current_user, require_patient, decode_access_token

router = APIRouter(prefix="/assessments", tags=["Assessments & Video Storage"])
token_bearer = HTTPBearer(auto_error=False)

# Maximum allowable video upload size: 100 MB
MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024

def resolve_auth_user(
    credentials: Optional[HTTPAuthorizationCredentials],
    token: Optional[str],
    db: Session
) -> User:
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token
    
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(raw_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/{assessment_id}/video")
async def upload_assessment_video(
    assessment_id: int,
    video: UploadFile = File(...),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """
    Secure video upload endpoint for patient assessments.
    Enforces ownership, MIME validation, 100MB file limit, and saves to private storage.
    """
    assessment = db.query(WebcamAssessment).filter(WebcamAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    if assessment.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to upload video for this assessment record."
        )

    # Validate MIME type
    content_type = video.content_type or "video/webm"
    if not content_type.startswith("video/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{content_type}'. Uploaded file must be a valid video stream."
        )

    # Sanitize extension
    ext = ".webm"
    if "mp4" in content_type:
        ext = ".mp4"
    elif "ogg" in content_type:
        ext = ".ogv"

    # Generate secure random filename to avoid collisions and path traversal
    safe_filename = f"assessment_{assessment.id}_{uuid.uuid4().hex[:12]}{ext}"
    target_path = (VIDEO_STORAGE_DIR / safe_filename).resolve()

    # Enforce path containment within VIDEO_STORAGE_DIR
    if not str(target_path).startswith(str(VIDEO_STORAGE_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid storage path detected.")

    total_bytes = 0
    try:
        with open(target_path, "wb") as f:
            while chunk := await video.read(1024 * 1024): # 1MB chunks
                total_bytes += len(chunk)
                if total_bytes > MAX_VIDEO_SIZE_BYTES:
                    # Clean up partial file
                    f.close()
                    if os.path.exists(target_path):
                        os.remove(target_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Video recording exceeds maximum permitted size of 100MB."
                    )
                f.write(chunk)
    except Exception as e:
        if os.path.exists(target_path) and total_bytes > MAX_VIDEO_SIZE_BYTES:
            raise
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    # Update assessment record
    assessment.has_video = True
    assessment.video_storage_path = safe_filename
    assessment.video_mime_type = content_type
    assessment.video_file_size = total_bytes
    db.commit()
    db.refresh(assessment)

    return {
        "status": "success",
        "message": "Video successfully uploaded and linked to assessment report.",
        "assessment_id": assessment.id,
        "video_file_size": total_bytes,
        "video_mime_type": content_type
    }

@router.get("/{assessment_id}/video")
def get_assessment_video(
    assessment_id: int,
    token: Optional[str] = Query(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(token_bearer),
    db: Session = Depends(get_db)
):
    """
    Authenticated video playback streaming endpoint.
    Strictly restricted to:
    1. The patient who owns the recording.
    2. A clinician currently assigned to that patient.
    Supports standard Authorization Bearer header OR ?token= query parameter for HTML5 video elements.
    """
    current_user = resolve_auth_user(credentials, token, db)

    assessment = db.query(WebcamAssessment).filter(WebcamAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment report not found")

    # Authorization Check
    is_owner = (current_user.id == assessment.patient_id)
    is_assigned_doctor = False

    if current_user.role == UserRole.DOCTOR.value:
        assignment = (
            db.query(DoctorPatientAssignment)
            .filter(
                DoctorPatientAssignment.doctor_id == current_user.id,
                DoctorPatientAssignment.patient_id == assessment.patient_id
            )
            .first()
        )
        if assignment:
            is_assigned_doctor = True

    if not is_owner and not is_assigned_doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have permission to view this patient's exercise recording."
        )

    if not assessment.has_video or not assessment.video_storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video unavailable — metrics-only assessment."
        )

    # Sanitize and resolve file path
    safe_basename = os.path.basename(assessment.video_storage_path)
    file_path = (VIDEO_STORAGE_DIR / safe_basename).resolve()

    # Prevent directory traversal
    if not str(file_path).startswith(str(VIDEO_STORAGE_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid video storage path.")

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recorded video file was not found on local storage disk."
        )

    media_type = assessment.video_mime_type or "video/webm"
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=f"session_{assessment_id}.webm"
    )

@router.delete("/{assessment_id}/video")
def delete_assessment_video(
    assessment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes the recorded video file per local privacy & data retention policy,
    while preserving the numerical exercise metrics.
    """
    assessment = db.query(WebcamAssessment).filter(WebcamAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Authorization
    is_owner = (current_user.id == assessment.patient_id)
    is_assigned_doctor = False
    if current_user.role == UserRole.DOCTOR.value:
        assignment = (
            db.query(DoctorPatientAssignment)
            .filter(
                DoctorPatientAssignment.doctor_id == current_user.id,
                DoctorPatientAssignment.patient_id == assessment.patient_id
            )
            .first()
        )
        if assignment:
            is_assigned_doctor = True

    if not is_owner and not is_assigned_doctor:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this video recording.")

    if assessment.has_video and assessment.video_storage_path:
        safe_basename = os.path.basename(assessment.video_storage_path)
        file_path = (VIDEO_STORAGE_DIR / safe_basename).resolve()
        if str(file_path).startswith(str(VIDEO_STORAGE_DIR.resolve())) and file_path.exists():
            os.remove(file_path)

    assessment.has_video = False
    assessment.video_storage_path = None
    assessment.video_mime_type = None
    assessment.video_file_size = None
    db.commit()

    return {"status": "success", "message": "Video recording removed in accordance with retention policy."}
