import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_patient_success():
    response = client.post("/api/auth/login", json={
        "email": "patient@iasyn.ai",
        "password": "PatientPassword123!",
        "role": "PATIENT"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "PATIENT"
    assert data["user"]["email"] == "patient@iasyn.ai"

def test_login_doctor_success():
    response = client.post("/api/auth/login", json={
        "email": "doctor@iasyn.ai",
        "password": "DoctorPassword123!",
        "role": "DOCTOR"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "DOCTOR"
    assert data["user"]["email"] == "doctor@iasyn.ai"

def test_login_wrong_role():
    # Attempting to log in as doctor with patient portal
    response = client.post("/api/auth/login", json={
        "email": "patient@iasyn.ai",
        "password": "PatientPassword123!",
        "role": "DOCTOR"
    })
    assert response.status_code == 403

def test_login_invalid_password():
    response = client.post("/api/auth/login", json={
        "email": "patient@iasyn.ai",
        "password": "WrongPassword!",
        "role": "PATIENT"
    })
    assert response.status_code == 401

def test_protected_route_without_token():
    response = client.get("/api/patient/dashboard")
    assert response.status_code == 401
