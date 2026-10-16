import os
import sys
import json
import datetime
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.database import engine, Base, SessionLocal, upgrade_database_schema
from app.models.user import User, DoctorPatientAssignment, UserRole
from app.models.assessment import WebcamAssessment, DoctorFeedback, ExerciseSchedule, AssessmentAttempt
from app.security.auth import hash_password

def seed_three_demo_patients():
    print("=" * 70)
    print("IASYN AI — Three Fictional Demonstration Patients Seeding")
    print("=" * 70)
    
    # Ensure tables and schema are up to date
    Base.metadata.create_all(bind=engine)
    upgrade_database_schema(engine)
    
    db = SessionLocal()
    try:
        today = datetime.date.today()
        d1 = today - datetime.timedelta(days=2)
        d2 = today - datetime.timedelta(days=1)
        d3 = today
        
        # 1. Designated Demo Doctor (Dr. Sarah Chen, PT, DPT)
        doctor_email = "doctor@iasyn.ai"
        doctor = db.query(User).filter(User.email == doctor_email).first()
        if not doctor:
            doctor = User(
                name="Dr. Sarah Chen, PT, DPT",
                email=doctor_email,
                password_hash=hash_password("DoctorPassword123!"),
                role=UserRole.DOCTOR.value,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=40)
            )
            db.add(doctor)
            db.commit()
            db.refresh(doctor)
            print(f"Created Demo Doctor: {doctor.name} ({doctor.email})")
        else:
            print(f"Demo Doctor verified: {doctor.name} (ID: {doctor.id})")

        # 2. Three Fictional Demonstration Patients
        demo_patients_spec = [
            {
                "email": "patient1@iasyn.ai",
                "alt_email": "patient@iasyn.ai",
                "name": "Alex Johnson",
                "pattern": "Increasing Adherence",
                # Day 1: 1 set, Day 2: 2 sets, Day 3: 3 sets
                "schedule": [
                    {"day": 1, "date": d1.strftime("%Y-%m-%d"), "planned": 1, "completed": 1, "pass_rate": 87.5, "passed": 7, "failed": 1, "unassessable": 0, "rom": 82.4, "reps": 8},
                    {"day": 2, "date": d2.strftime("%Y-%m-%d"), "planned": 2, "completed": 2, "pass_rate": 93.8, "passed": 15, "failed": 1, "unassessable": 0, "rom": 84.8, "reps": 16},
                    {"day": 3, "date": d3.strftime("%Y-%m-%d"), "planned": 3, "completed": 3, "pass_rate": 96.0, "passed": 24, "failed": 1, "unassessable": 1, "rom": 86.5, "reps": 24},
                ]
            },
            {
                "email": "patient2@iasyn.ai",
                "name": "Marcus Vance",
                "pattern": "Declining Adherence",
                # Day 1: 2 sets, Day 2: 1 set, Day 3: 0 sets
                "schedule": [
                    {"day": 1, "date": d1.strftime("%Y-%m-%d"), "planned": 2, "completed": 2, "pass_rate": 75.0, "passed": 12, "failed": 4, "unassessable": 1, "rom": 74.2, "reps": 16},
                    {"day": 2, "date": d2.strftime("%Y-%m-%d"), "planned": 2, "completed": 1, "pass_rate": 62.5, "passed": 5, "failed": 3, "unassessable": 0, "rom": 69.8, "reps": 8},
                    {"day": 3, "date": d3.strftime("%Y-%m-%d"), "planned": 2, "completed": 0, "pass_rate": None, "passed": 0, "failed": 0, "unassessable": 0, "rom": None, "reps": 0, "status": "MISSED"},
                ]
            },
            {
                "email": "patient3@iasyn.ai",
                "name": "Elena Rostova",
                "pattern": "Consistent Adherence",
                # Day 1: 1 set, Day 2: 1 set, Day 3: 1 set
                "schedule": [
                    {"day": 1, "date": d1.strftime("%Y-%m-%d"), "planned": 1, "completed": 1, "pass_rate": 87.5, "passed": 7, "failed": 1, "unassessable": 0, "rom": 79.5, "reps": 8},
                    {"day": 2, "date": d2.strftime("%Y-%m-%d"), "planned": 1, "completed": 1, "pass_rate": 87.5, "passed": 7, "failed": 1, "unassessable": 0, "rom": 80.1, "reps": 8},
                    {"day": 3, "date": d3.strftime("%Y-%m-%d"), "planned": 1, "completed": 1, "pass_rate": 100.0, "passed": 8, "failed": 0, "unassessable": 0, "rom": 81.0, "reps": 8},
                ]
            }
        ]

        for spec in demo_patients_spec:
            # Query existing user or create
            patient = db.query(User).filter(User.email == spec["email"]).first()
            if not patient and "alt_email" in spec:
                patient = db.query(User).filter(User.email == spec["alt_email"]).first()

            if not patient:
                patient = User(
                    name=spec["name"],
                    email=spec["email"],
                    password_hash=hash_password("PatientPassword123!"),
                    role=UserRole.PATIENT.value,
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(days=20)
                )
                db.add(patient)
                db.commit()
                db.refresh(patient)
                print(f"Created Demo Patient: {patient.name} ({patient.email})")
            else:
                print(f"Demo Patient verified: {patient.name} ({patient.email}, ID: {patient.id})")

            # Doctor-Patient Assignment
            assign = (
                db.query(DoctorPatientAssignment)
                .filter(
                    DoctorPatientAssignment.doctor_id == doctor.id,
                    DoctorPatientAssignment.patient_id == patient.id
                )
                .first()
            )
            if not assign:
                db.add(DoctorPatientAssignment(doctor_id=doctor.id, patient_id=patient.id))
                db.commit()
                print(f"Assigned Dr. {doctor.name} to {patient.name}")

            # Seed Schedules and Demonstration Assessments
            for s_info in spec["schedule"]:
                # Check / Create ExerciseSchedule
                sched = (
                    db.query(ExerciseSchedule)
                    .filter(
                        ExerciseSchedule.patient_id == patient.id,
                        ExerciseSchedule.scheduled_date == s_info["date"]
                    )
                    .first()
                )
                if not sched:
                    sched = ExerciseSchedule(
                        patient_id=patient.id,
                        scheduled_date=s_info["date"],
                        planned_sets=s_info["planned"],
                        completed_sets=s_info["completed"],
                        status=s_info.get("status", "COMPLETED" if s_info["completed"] >= s_info["planned"] else "PARTIAL")
                    )
                    db.add(sched)
                    db.commit()

                # If completed sets > 0 and no assessment exists for this date, seed demonstration assessment
                if s_info["completed"] > 0:
                    assess_date_start = datetime.datetime.strptime(s_info["date"], "%Y-%m-%d") + datetime.timedelta(hours=10)
                    existing_sess = (
                        db.query(WebcamAssessment)
                        .filter(
                            WebcamAssessment.patient_id == patient.id,
                            WebcamAssessment.created_at >= assess_date_start,
                            WebcamAssessment.created_at < assess_date_start + datetime.timedelta(days=1)
                        )
                        .first()
                    )

                    if not existing_sess:
                        total_att = s_info["passed"] + s_info["failed"] + s_info["unassessable"]
                        
                        # Generate realistic attempt breakdown
                        attempts_list = []
                        att_count = 1
                        for p_idx in range(s_info["passed"]):
                            attempts_list.append({
                                "attempt_number": att_count,
                                "start_time": round((att_count - 1) * 4.5, 1),
                                "end_time": round((att_count - 1) * 4.5 + 3.8, 1),
                                "outcome": "PASS",
                                "min_knee_angle": 91.2,
                                "max_knee_angle": round(91.2 + (s_info["rom"] or 80.0), 1),
                                "range_of_motion": s_info["rom"] or 80.0,
                                "extension_duration": 1.8,
                                "return_duration": 1.6,
                                "dwell_duration": 0.4,
                                "trunk_lean_max": 8.5,
                                "tracking_quality": "Optimal",
                                "deviations": []
                            })
                            att_count += 1

                        for f_idx in range(s_info["failed"]):
                            attempts_list.append({
                                "attempt_number": att_count,
                                "start_time": round((att_count - 1) * 4.5, 1),
                                "end_time": round((att_count - 1) * 4.5 + 3.2, 1),
                                "outcome": "FAIL",
                                "min_knee_angle": 93.0,
                                "max_knee_angle": 138.5,
                                "range_of_motion": 45.5,
                                "extension_duration": 1.1,
                                "return_duration": 1.5,
                                "dwell_duration": 0.1,
                                "trunk_lean_max": 19.2,
                                "tracking_quality": "Good",
                                "deviations": ["Incomplete terminal knee extension (< 150°)", "Excessive trunk lean compensation (> 18°)"]
                            })
                            att_count += 1

                        for u_idx in range(s_info["unassessable"]):
                            attempts_list.append({
                                "attempt_number": att_count,
                                "start_time": round((att_count - 1) * 4.5, 1),
                                "end_time": round((att_count - 1) * 4.5 + 3.0, 1),
                                "outcome": "UNABLE_TO_ASSESS",
                                "min_knee_angle": 90.0,
                                "max_knee_angle": 90.0,
                                "range_of_motion": 0.0,
                                "extension_duration": 0.0,
                                "return_duration": 0.0,
                                "dwell_duration": 0.0,
                                "trunk_lean_max": 0.0,
                                "tracking_quality": "Insufficient Confidence (< 50%)",
                                "deviations": ["Severe occlusion: lower leg not visible in camera frame"]
                            })
                            att_count += 1

                        demo_sess = WebcamAssessment(
                            patient_id=patient.id,
                            exercise_name="Seated Knee Extension",
                            created_at=assess_date_start,
                            duration_seconds=42 * s_info["completed"],
                            repetition_count=s_info["reps"],
                            min_knee_angle=91.0,
                            max_knee_angle=round(91.0 + (s_info["rom"] or 80.0), 1),
                            range_of_motion=s_info["rom"] or 80.0,
                            total_attempts=total_att,
                            passed_attempts=s_info["passed"],
                            failed_attempts=s_info["failed"],
                            unassessable_attempts=s_info["unassessable"],
                            movement_pass_rate=s_info["pass_rate"],
                            attempts_json=json.dumps(attempts_list),
                            configured_criteria_json=json.dumps({
                                "min_extension_angle": 150.0,
                                "max_starting_angle": 105.0,
                                "min_hold_seconds": 0.5,
                                "max_trunk_compensation_deg": 18.0
                            }),
                            tracking_quality="Demonstration Baseline",
                            observations_json=json.dumps([
                                f"Fictional demonstration dataset for longitudinal progress visualization: {spec['pattern']}",
                                f"{s_info['completed']} set(s) registered on {s_info['date']}",
                                f"Movement Criteria Pass Rate: {s_info['pass_rate']}%"
                            ]),
                            assessment_status="Meets configured criteria" if (s_info["pass_rate"] or 0) >= 80 else "Needs improvement",
                            review_status="Reviewed" if s_info["day"] < 3 else "Pending Review",
                            has_video=False,
                            is_demo=True
                        )
                        db.add(demo_sess)
                        db.commit()
                        db.refresh(demo_sess)

                        # Add Doctor Feedback for Day 1
                        if s_info["day"] == 1:
                            feedback = DoctorFeedback(
                                assessment_id=demo_sess.id,
                                doctor_id=doctor.id,
                                feedback_text=f"Demonstration feedback for {patient.name}: Baseline posture shows consistent seated alignment. Maintain controlled tempo on terminal extension.",
                                created_at=assess_date_start + datetime.timedelta(hours=2)
                            )
                            db.add(feedback)
                            db.commit()

        print("\nThree Fictional Demonstration Patients successfully configured:")
        print("1. Alex Johnson (patient1@iasyn.ai / patient@iasyn.ai) -> INCREASING ADHERENCE: Day 1=1 set, Day 2=2 sets, Day 3=3 sets")
        print("2. Marcus Vance (patient2@iasyn.ai) -> DECLINING ADHERENCE: Day 1=2 sets, Day 2=1 set, Day 3=0 sets (Missed)")
        print("3. Elena Rostova (patient3@iasyn.ai) -> CONSISTENT ADHERENCE: Day 1=1 set, Day 2=1 set, Day 3=1 set")
        print("All 3 demonstration patients assigned to Dr. Sarah Chen (doctor@iasyn.ai).")
        print("=" * 70)
    finally:
        db.close()

if __name__ == "__main__":
    seed_three_demo_patients()
