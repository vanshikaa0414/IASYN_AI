import os
import sys
import json
import datetime
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.database import engine, Base, SessionLocal
from app.models.user import User, DoctorPatientAssignment, UserRole
from app.models.assessment import WebcamAssessment, DoctorFeedback
from app.models.sensor_demo import SensorDemoResult
from app.security.auth import hash_password

def seed_demo_data():
    print("=" * 60)
    print("IASYN AI - Database Initialization & Demo Account Seeding")
    print("=" * 60)
    
    # 1. Initialize Tables
    print("Creating SQLite database tables if not present...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 2. Check / Create Demo Doctor
        doctor_email = "doctor@iasyn.ai"
        utc_now = datetime.datetime.now(datetime.timezone.utc)
        doctor = db.query(User).filter(User.email == doctor_email).first()
        if not doctor:
            print(f"Creating Demo Doctor: {doctor_email}")
            doctor = User(
                name="Dr. Sarah Chen, PT, DPT",
                email=doctor_email,
                password_hash=hash_password("DoctorPassword123!"),
                role=UserRole.DOCTOR.value,
                created_at=utc_now - datetime.timedelta(days=30)
            )
            db.add(doctor)
            db.commit()
            db.refresh(doctor)
        else:
            print(f"Demo Doctor already exists (ID: {doctor.id})")

        # 3. Check / Create Demo Patient
        patient_email = "patient@iasyn.ai"
        patient = db.query(User).filter(User.email == patient_email).first()
        if not patient:
            print(f"Creating Demo Patient: {patient_email}")
            patient = User(
                name="Alex Johnson",
                email=patient_email,
                password_hash=hash_password("PatientPassword123!"),
                role=UserRole.PATIENT.value,
                created_at=utc_now - datetime.timedelta(days=14)
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
        else:
            print(f"Demo Patient already exists (ID: {patient.id})")

        # 4. Create Doctor-Patient Assignment
        assignment = (
            db.query(DoctorPatientAssignment)
            .filter(
                DoctorPatientAssignment.doctor_id == doctor.id,
                DoctorPatientAssignment.patient_id == patient.id
            )
            .first()
        )
        if not assignment:
            print(f"Assigning Dr. {doctor.name} to Patient {patient.name}...")
            assignment = DoctorPatientAssignment(doctor_id=doctor.id, patient_id=patient.id)
            db.add(assignment)
            db.commit()
        else:
            print("Doctor-Patient assignment already active.")

        # 5. Seed Initial Webcam Assessments for Demo Patient
        existing_assessments = db.query(WebcamAssessment).filter(WebcamAssessment.patient_id == patient.id).count()
        if existing_assessments == 0:
            print("Seeding baseline webcam assessments and feedback...")
            
            # Assessment 1: Reviewed session with Doctor Feedback
            dt1 = utc_now - datetime.timedelta(days=2, hours=3)
            assessment1 = WebcamAssessment(
                patient_id=patient.id,
                exercise_name="Seated Knee Extension",
                created_at=dt1,
                duration_seconds=45,
                repetition_count=8,
                min_knee_angle=92.4,
                max_knee_angle=174.8,
                range_of_motion=82.4,
                tracking_quality="Optimal (Confidence > 92%)",
                observations_json=json.dumps([
                    "Full extension achieved on 7 of 8 repetitions",
                    "Smooth return velocity with minimal joint acceleration spikes",
                    "Stable pelvic alignment maintained during concentric phase"
                ]),
                assessment_status="Meets configured criteria",
                review_status="Reviewed"
            )
            db.add(assessment1)
            db.commit()
            db.refresh(assessment1)

            # Add Doctor Feedback to Assessment 1
            feedback1 = DoctorFeedback(
                assessment_id=assessment1.id,
                doctor_id=doctor.id,
                feedback_text="Excellent control and steady tempo during this session, Alex! Your terminal knee extension angle of 174.8° shows noticeable improvement compared to last week. Continue with 3 sets of 8 repetitions daily.",
                created_at=dt1 + datetime.timedelta(hours=2)
            )
            db.add(feedback1)

            # Assessment 2: Recent session awaiting Doctor Review
            dt2 = utc_now - datetime.timedelta(hours=4)
            assessment2 = WebcamAssessment(
                patient_id=patient.id,
                exercise_name="Seated Knee Extension",
                created_at=dt2,
                duration_seconds=52,
                repetition_count=10,
                min_knee_angle=88.5,
                max_knee_angle=171.2,
                range_of_motion=82.7,
                tracking_quality="Good (Confidence 88%)",
                observations_json=json.dumps([
                    "10 repetitions successfully registered",
                    "Slight trunk extension observed on rep 9 and 10 as fatigue increased",
                    "Range of motion remained consistent within target zone (80° - 90°)"
                ]),
                assessment_status="Needs review",
                review_status="Pending Review"
            )
            db.add(assessment2)

            # 6. Seed Sample Sensor AI Demo History
            demo_record = SensorDemoResult(
                initiated_by_user_id=patient.id,
                dataset_trial_id="Subject_6/3/Trial_1",
                predicted_label="Correct Seated Knee Extension",
                ground_truth_label="Correct Seated Knee Extension",
                confidence=0.9624,
                model_version="1D-CNN-v1.0",
                created_at=utc_now - datetime.timedelta(days=1)
            )
            db.add(demo_record)
            db.commit()
            print("Successfully seeded baseline assessments and feedback.")

        print("\nDemo Accounts Summary:")
        print("------------------------------------------------------------")
        print("ROLE: PATIENT PORTAL")
        print(f"  Email:    {patient_email}")
        print("  Password: PatientPassword123!")
        print("  Name:     Alex Johnson")
        print("------------------------------------------------------------")
        print("ROLE: DOCTOR PORTAL")
        print(f"  Email:    {doctor_email}")
        print("  Password: DoctorPassword123!")
        print("  Name:     Dr. Sarah Chen, PT, DPT")
        print("------------------------------------------------------------")
        print("All credentials and assignments ready for local demonstration.")
        print("=" * 60)
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
