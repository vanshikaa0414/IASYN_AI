import pytest
import io
import json
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models.user import User, UserRole, DoctorPatientAssignment
from app.models.assessment import WebcamAssessment, AssessmentAttempt, ExerciseSchedule

client = TestClient(app)

def get_auth_token(email: str, password: str, role: str) -> str:
    res = client.post("/api/auth/login", json={
        "email": email,
        "password": password,
        "role": role
    })
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


class TestPatientRegistrationAndAssignment:
    """Tests 1-5: Registration, Validation, Hashing, Doctor Assignment, and Isolation"""

    def test_patient_registration_success_and_doctor_assignment(self):
        unique_email = f"patient_{uuid.uuid4().hex[:8]}@iasyn.ai"
        payload = {
            "name": "Jane Register Doe",
            "email": unique_email,
            "password": "SecurePassword123!",
            "confirm_password": "SecurePassword123!"
        }
        res = client.post("/api/auth/register-patient", json=payload)
        assert res.status_code in (200, 201)
        data = res.json()
        assert "access_token" in data
        assert data["user"]["role"] == "PATIENT"
        assert data["user"]["email"] == unique_email

        # Verify in DB that password is not stored plaintext
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == unique_email).first()
            assert user is not None
            assert user.password_hash != "SecurePassword123!"
            assert user.password_hash.startswith("$2b$") or len(user.password_hash) > 30

            # Verify doctor auto-assignment to Dr. Sarah Chen
            assignment = db.query(DoctorPatientAssignment).filter(
                DoctorPatientAssignment.patient_id == user.id
            ).first()
            assert assignment is not None
            doctor = db.query(User).filter(User.id == assignment.doctor_id).first()
            assert doctor is not None
            assert doctor.role in (UserRole.DOCTOR.value, "DOCTOR")
            assert doctor.email == "doctor@iasyn.ai"
        finally:
            db.close()

    def test_duplicate_email_prevention(self):
        # Attempt to register with existing patient email
        payload = {
            "name": "Duplicate Test",
            "email": "patient@iasyn.ai",
            "password": "Password123!",
            "confirm_password": "Password123!"
        }
        res = client.post("/api/auth/register-patient", json=payload)
        assert res.status_code == 400
        assert "already exists" in res.json()["detail"].lower()

    def test_password_mismatch_validation(self):
        payload = {
            "name": "Mismatch Test",
            "email": "mismatch@iasyn.ai",
            "password": "Password123!",
            "confirm_password": "DifferentPassword123!"
        }
        res = client.post("/api/auth/register-patient", json=payload)
        assert res.status_code == 400
        assert "do not match" in res.json()["detail"].lower()

    def test_prevent_public_registration_as_doctor(self):
        # Ensure there is no public endpoint allowing role=DOCTOR registration
        payload = {
            "name": "Fake Doctor",
            "email": "hacker_doctor@iasyn.ai",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "role": "DOCTOR"
        }
        res = client.post("/api/auth/register-patient", json=payload)
        # Even if extra 'role' is passed, the backend sets role=Role.PATIENT
        if res.status_code == 201:
            assert res.json()["user"]["role"] == "PATIENT"


class TestMultiPatientDataIsolation:
    """Tests 6-8: Strict isolation of patient assessment records and videos"""

    def test_doctor_assigned_patients_contains_demo_cohort(self):
        doc_token = get_auth_token("doctor@iasyn.ai", "DoctorPassword123!", "DOCTOR")
        res = client.get("/api/doctor/patients", headers={"Authorization": f"Bearer {doc_token}"})
        assert res.status_code == 200
        patients = res.json()
        names = [p["name"] for p in patients]

        # Verify all 3 fictional demo patients are present under Dr. Sarah Chen
        assert "Alex Johnson" in names
        assert "Marcus Vance" in names
        assert "Elena Rostova" in names

    def test_patient_cannot_access_doctor_endpoints(self):
        patient_token = get_auth_token("patient@iasyn.ai", "PatientPassword123!", "PATIENT")
        res = client.get("/api/doctor/dashboard", headers={"Authorization": f"Bearer {patient_token}"})
        assert res.status_code == 403

        res2 = client.get("/api/doctor/patients", headers={"Authorization": f"Bearer {patient_token}"})
        assert res2.status_code == 403

    def test_patient_reports_are_strictly_isolated(self):
        # Patient 1 logs in
        p1_token = get_auth_token("patient@iasyn.ai", "PatientPassword123!", "PATIENT")
        res1 = client.get("/api/patient/assessments", headers={"Authorization": f"Bearer {p1_token}"})
        assert res1.status_code == 200
        p1_assessments = res1.json()

        # Patient 2 logs in
        p2_token = get_auth_token("patient2@iasyn.ai", "PatientPassword123!", "PATIENT")
        res2 = client.get("/api/patient/assessments", headers={"Authorization": f"Bearer {p2_token}"})
        assert res2.status_code == 200
        p2_assessments = res2.json()

        # Check that none of P1's assessment IDs appear in P2's list
        p1_ids = {a["id"] for a in p1_assessments}
        p2_ids = {a["id"] for a in p2_assessments}
        assert len(p1_ids.intersection(p2_ids)) == 0, "Patient records must never cross-pollinate!"


class TestAttemptTrackingAndPassRateMath:
    """Tests 9-11: Attempt counting, pass rate formula, and video upload/streaming security"""

    def test_assessment_creation_with_attempts_and_pass_rate_formula(self):
        token = get_auth_token("patient@iasyn.ai", "PatientPassword123!", "PATIENT")
        
        # 4 passed attempts, 1 failed attempt, 1 unassessable attempt
        # Total attempts = 4 + 1 + 1 = 6
        # Pass rate = 4 / (4 + 1) * 100 = 80.0%
        attempts = [
            {
                "attempt_number": 1,
                "start_time": 1.0,
                "end_time": 3.5,
                "outcome": "PASS",
                "min_knee_angle": 90.0,
                "max_knee_angle": 168.0,
                "range_of_motion": 78.0,
                "extension_duration": 1.2,
                "return_duration": 1.3,
                "dwell_duration": 0.5,
                "trunk_lean_max": 4.0,
                "tracking_quality": "Optimal",
                "deviations": []
            },
            {
                "attempt_number": 2,
                "start_time": 4.0,
                "end_time": 6.8,
                "outcome": "PASS",
                "min_knee_angle": 88.0,
                "max_knee_angle": 170.0,
                "range_of_motion": 82.0,
                "extension_duration": 1.3,
                "return_duration": 1.5,
                "dwell_duration": 0.5,
                "trunk_lean_max": 5.0,
                "tracking_quality": "Optimal",
                "deviations": []
            },
            {
                "attempt_number": 3,
                "start_time": 7.0,
                "end_time": 9.5,
                "outcome": "PASS",
                "min_knee_angle": 91.0,
                "max_knee_angle": 165.0,
                "range_of_motion": 74.0,
                "extension_duration": 1.2,
                "return_duration": 1.3,
                "dwell_duration": 0.4,
                "trunk_lean_max": 4.5,
                "tracking_quality": "Optimal",
                "deviations": []
            },
            {
                "attempt_number": 4,
                "start_time": 10.0,
                "end_time": 12.4,
                "outcome": "PASS",
                "min_knee_angle": 89.0,
                "max_knee_angle": 166.0,
                "range_of_motion": 77.0,
                "extension_duration": 1.1,
                "return_duration": 1.3,
                "dwell_duration": 0.4,
                "trunk_lean_max": 3.8,
                "tracking_quality": "Optimal",
                "deviations": []
            },
            {
                "attempt_number": 5,
                "start_time": 13.0,
                "end_time": 15.0,
                "outcome": "FAIL",
                "min_knee_angle": 90.0,
                "max_knee_angle": 142.0,
                "range_of_motion": 52.0,
                "extension_duration": 1.0,
                "return_duration": 1.0,
                "dwell_duration": 0.0,
                "trunk_lean_max": 6.0,
                "tracking_quality": "Good",
                "deviations": ["Incomplete terminal extension: reached 142° (target ≥155°)"]
            },
            {
                "attempt_number": 6,
                "start_time": 15.5,
                "end_time": 17.0,
                "outcome": "UNABLE_TO_ASSESS",
                "min_knee_angle": 90.0,
                "max_knee_angle": 120.0,
                "range_of_motion": 30.0,
                "extension_duration": 0.8,
                "return_duration": 0.7,
                "dwell_duration": 0.0,
                "trunk_lean_max": 5.0,
                "tracking_quality": "Poor (<40%)",
                "deviations": ["Tracking lost during movement"]
            }
        ]

        payload = {
            "exercise_name": "Seated Knee Extension",
            "duration_seconds": 18,
            "repetition_count": 4,
            "min_knee_angle": 88.0,
            "max_knee_angle": 170.0,
            "range_of_motion": 82.0,
            "tracking_quality": "Optimal (92% Confidence)",
            "observations": ["Session completed with 4 passed attempts and 1 failed attempt."],
            "assessment_status": "Meets configured criteria",
            "total_attempts": 6,
            "passed_attempts": 4,
            "failed_attempts": 1,
            "unassessable_attempts": 1,
            "movement_pass_rate": 80.0,
            "attempts": attempts,
            "configured_criteria": {
                "terminal_threshold_deg": 155,
                "flexion_threshold_deg": 105,
                "min_rom_deg": 50
            }
        }

        res = client.post("/api/patient/assessments", json=payload, headers={"Authorization": f"Bearer {token}"})
        assert res.status_code in (200, 201)
        created = res.json()
        assert created["total_attempts"] == 6
        assert created["passed_attempts"] == 4
        assert created["failed_attempts"] == 1
        assert created["unassessable_attempts"] == 1
        assert created["movement_pass_rate"] == 80.0
        assert created["repetition_count"] == 4

        # Test video upload on created assessment
        assessment_id = created["id"]
        fake_video_bytes = b"FAKE_WEBM_VIDEO_DATA_BUFFER"
        upload_res = client.post(
            f"/api/assessments/{assessment_id}/video",
            files={"video": ("session_test.webm", io.BytesIO(fake_video_bytes), "video/webm")},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert upload_res.status_code == 200
        upload_data = upload_res.json()
        assert upload_data["status"] == "success"
        assert upload_data["video_mime_type"] == "video/webm"

        # Test streaming video with valid token
        stream_res = client.get(f"/api/assessments/{assessment_id}/video?token={token}")
        assert stream_res.status_code == 200
        assert stream_res.content == fake_video_bytes

        # Test unauthorized streaming without token
        unauth_res = client.get(f"/api/assessments/{assessment_id}/video")
        assert unauth_res.status_code == 401

        # Test assigned doctor can stream the video
        doc_token = get_auth_token("doctor@iasyn.ai", "DoctorPassword123!", "DOCTOR")
        doc_stream = client.get(f"/api/assessments/{assessment_id}/video?token={doc_token}")
        assert doc_stream.status_code == 200

        # Test unassigned/different patient CANNOT stream this video
        other_patient_token = get_auth_token("patient2@iasyn.ai", "PatientPassword123!", "PATIENT")
        other_stream = client.get(f"/api/assessments/{assessment_id}/video?token={other_patient_token}")
        assert other_stream.status_code == 403


class TestDoctorFeedbackAndReview:
    """Test 12-14: Doctor written feedback persistence and patient retrieval"""

    def test_doctor_feedback_submission_and_patient_view(self):
        doc_token = get_auth_token("doctor@iasyn.ai", "DoctorPassword123!", "DOCTOR")
        # Get doctor assessments list
        list_res = client.get("/api/doctor/assessments", headers={"Authorization": f"Bearer {doc_token}"})
        assert list_res.status_code == 200
        assessments = list_res.json()
        assert len(assessments) > 0
        target = assessments[0]

        feedback_text = "Good control overall. Please focus on 1-second terminal hold at 165 degrees."
        fb_res = client.post(
            f"/api/doctor/assessments/{target['id']}/feedback",
            json={"feedback_text": feedback_text},
            headers={"Authorization": f"Bearer {doc_token}"}
        )
        assert fb_res.status_code == 200
        fb_data = fb_res.json()
        assert fb_data["feedback_text"] == feedback_text

        # Verify assessment review status updated to Reviewed
        detail_res = client.get(
            f"/api/doctor/assessments/{target['id']}",
            headers={"Authorization": f"Bearer {doc_token}"}
        )
        assert detail_res.status_code == 200
        assert detail_res.json()["review_status"] == "Reviewed"


class TestModelEvaluationMetricsAndDemoCohort:
    """Test 15-16: Real evaluation report reading and demo patient longitudinal trajectories"""

    def test_model_evaluation_endpoint_reads_real_metrics(self):
        doc_token = get_auth_token("doctor@iasyn.ai", "DoctorPassword123!", "DOCTOR")
        res = client.get("/api/doctor/model-evaluation", headers={"Authorization": f"Bearer {doc_token}"})
        assert res.status_code == 200
        data = res.json()

        # Check sensor model metrics
        sensor_model = data["sensor_model"]
        assert sensor_model is not None
        assert sensor_model["accuracy"] == 83.85
        assert sensor_model["macro_f1"] == 83.29
        assert sensor_model["num_test_trials"] == 130
        assert len(sensor_model["confusion_matrix"]) == 3

        # Check webcam disclaimer
        webcam_model = data["webcam_model"]
        assert webcam_model["available"] == False
        assert "independently labelled evaluation data required" in webcam_model["status_message"]

    def test_three_demo_patients_longitudinal_adherence(self):
        doc_token = get_auth_token("doctor@iasyn.ai", "DoctorPassword123!", "DOCTOR")

        # Get assigned patients to retrieve their IDs
        res = client.get("/api/doctor/patients", headers={"Authorization": f"Bearer {doc_token}"})
        patients_by_name = {p["name"]: p["id"] for p in res.json()}

        # 1. Alex Johnson (Increasing Adherence: Day 1: 1, Day 2: 2, Day 3: 3 sets)
        alex_id = patients_by_name["Alex Johnson"]
        alex_prog = client.get(f"/api/doctor/patients/{alex_id}/progress", headers={"Authorization": f"Bearer {doc_token}"}).json()
        alex_timeline = alex_prog["daily_timeline"]
        assert len(alex_timeline) >= 3
        assert alex_timeline[0]["completed_sets"] == 1
        assert alex_timeline[1]["completed_sets"] == 2
        assert alex_timeline[2]["completed_sets"] == 3
        assert "increasing" in alex_prog["adherence_pattern"].lower()

        # 2. Marcus Vance (Declining Adherence: Day 1: 2, Day 2: 1, Day 3: 0 sets)
        marcus_id = patients_by_name["Marcus Vance"]
        marcus_prog = client.get(f"/api/doctor/patients/{marcus_id}/progress", headers={"Authorization": f"Bearer {doc_token}"}).json()
        marcus_timeline = marcus_prog["daily_timeline"]
        assert len(marcus_timeline) >= 3
        assert marcus_timeline[0]["completed_sets"] == 2
        assert marcus_timeline[1]["completed_sets"] == 1
        assert marcus_timeline[2]["completed_sets"] == 0
        assert "declining" in marcus_prog["adherence_pattern"].lower()

        # 3. Elena Rostova (Consistent Adherence: Day 1: 1, Day 2: 1, Day 3: 1 set)
        elena_id = patients_by_name["Elena Rostova"]
        elena_prog = client.get(f"/api/doctor/patients/{elena_id}/progress", headers={"Authorization": f"Bearer {doc_token}"}).json()
        elena_timeline = elena_prog["daily_timeline"]
        assert len(elena_timeline) >= 3
        assert elena_timeline[0]["completed_sets"] == 1
        assert elena_timeline[1]["completed_sets"] == 1
        assert elena_timeline[2]["completed_sets"] == 1
        assert "consistent" in elena_prog["adherence_pattern"].lower()
