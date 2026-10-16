import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_tokens():
    # Login patient
    p_res = client.post("/api/auth/login", json={
        "email": "patient@iasyn.ai",
        "password": "PatientPassword123!",
        "role": "PATIENT"
    })
    patient_token = p_res.json()["access_token"]

    # Login doctor
    d_res = client.post("/api/auth/login", json={
        "email": "doctor@iasyn.ai",
        "password": "DoctorPassword123!",
        "role": "DOCTOR"
    })
    doctor_token = d_res.json()["access_token"]
    return patient_token, doctor_token

def test_patient_dashboard_and_assessments_flow():
    p_token, d_token = get_tokens()
    p_headers = {"Authorization": f"Bearer {p_token}"}
    d_headers = {"Authorization": f"Bearer {d_token}"}

    # 1. Patient Dashboard
    dash_res = client.get("/api/patient/dashboard", headers=p_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "patient_name" in dash_data
    assert "assigned_doctor" in dash_data

    # 2. Patient creates new webcam assessment
    new_assessment_data = {
        "exercise_name": "Seated Knee Extension",
        "duration_seconds": 38,
        "repetition_count": 9,
        "min_knee_angle": 90.0,
        "max_knee_angle": 175.5,
        "range_of_motion": 85.5,
        "tracking_quality": "Optimal",
        "observations": [
            "Good active quadriceps contraction",
            "Consistent rhythm maintained"
        ],
        "assessment_status": "Meets configured criteria"
    }
    create_res = client.post("/api/patient/assessments", json=new_assessment_data, headers=p_headers)
    assert create_res.status_code == 200
    created_assessment = create_res.json()
    assessment_id = created_assessment["id"]
    assert created_assessment["repetition_count"] == 9
    assert created_assessment["review_status"] == "Pending Review"

    # 3. Doctor reviews assessments
    doc_assessments_res = client.get("/api/doctor/assessments", headers=d_headers)
    assert doc_assessments_res.status_code == 200
    all_doc_assessments = doc_assessments_res.json()
    assert any(a["id"] == assessment_id for a in all_doc_assessments)

    # 4. Doctor submits written feedback
    feedback_text = "Good job on maintaining full knee extension on today's session. Keep focusing on knee extension hold at the peak."
    fb_res = client.post(
        f"/api/doctor/assessments/{assessment_id}/feedback",
        json={"feedback_text": feedback_text},
        headers=d_headers
    )
    assert fb_res.status_code == 200
    fb_data = fb_res.json()
    assert fb_data["feedback_text"] == feedback_text

    # 5. Patient checks updated assessment and sees doctor feedback
    patient_check = client.get(f"/api/patient/assessments/{assessment_id}", headers=p_headers)
    assert patient_check.status_code == 200
    updated_data = patient_check.json()
    assert updated_data["review_status"] == "Reviewed"
    assert updated_data["feedback"] is not None
    assert updated_data["feedback"]["feedback_text"] == feedback_text
