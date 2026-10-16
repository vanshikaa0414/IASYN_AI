from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole, DoctorPatientAssignment
from app.schemas.auth import (
    UserLoginRequest,
    UserRegisterRequest,
    PatientRegisterRequest,
    TokenResponse,
    UserResponse
)
from app.security.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Verify role requested matches the user's role
    if user.role != request.role.upper():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User is not registered as a {request.role}. Please select your correct portal.",
        )
    
    token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/register-patient", response_model=TokenResponse)
def register_patient(request: PatientRegisterRequest, db: Session = Depends(get_db)):
    """
    Public registration endpoint strictly restricted to PATIENT accounts.
    Validates name, email, password strength, confirmation, prevents duplicate accounts,
    and assigns newly registered patients to the designated demonstration doctor.
    """
    name_clean = request.name.strip()
    if len(name_clean) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name must be at least 2 characters long."
        )

    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and confirm password do not match."
        )

    email_clean = request.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in instead."
        )

    # Strictly create as PATIENT (public doctor registration is prohibited)
    new_user = User(
        name=name_clean,
        email=email_clean,
        password_hash=hash_password(request.password),
        role=UserRole.PATIENT.value
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Designated Demo Doctor Assignment (ONE DOCTOR -> MANY PATIENTS)
    demo_doctor = db.query(User).filter(User.email == "doctor@iasyn.ai").first()
    if not demo_doctor:
        demo_doctor = db.query(User).filter(User.role == UserRole.DOCTOR.value).first()

    if demo_doctor:
        assignment = DoctorPatientAssignment(doctor_id=demo_doctor.id, patient_id=new_user.id)
        db.add(assignment)
        db.commit()

    # Generate JWT authentication token for immediate seamless patient session
    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role, "email": new_user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/register", response_model=UserResponse)
def register(request: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Internal registration endpoint. Public registration of DOCTOR role is strictly prevented.
    """
    role = request.role.upper()
    if role == UserRole.DOCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public clinician registration is restricted. Clinical staff must be provisioned by an administrator."
        )
    if role != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be PATIENT."
        )

    email_clean = request.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    new_user = User(
        name=request.name.strip(),
        email=email_clean,
        password_hash=hash_password(request.password),
        role=UserRole.PATIENT.value
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    demo_doctor = db.query(User).filter(User.email == "doctor@iasyn.ai").first()
    if demo_doctor:
        db.add(DoctorPatientAssignment(doctor_id=demo_doctor.id, patient_id=new_user.id))
        db.commit()

    return new_user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}
