import pytest
import numpy as np
import torch
from fastapi.testclient import TestClient

from app.main import app
from ml.model import KneeExtension1DCNN
from ml.predict import KneePredictor
from ml.preprocess import preprocess_single_trial

client = TestClient(app)

def test_1dcnn_architecture_and_forward_pass():
    model = KneeExtension1DCNN(in_channels=56, num_classes=3)
    dummy_input = torch.randn(4, 56, 256)
    output = model(dummy_input)
    assert output.shape == (4, 3)
    
    probs = model.predict_proba(dummy_input)
    assert probs.shape == (4, 3)
    # Check probabilities sum to 1.0
    row_sums = probs.sum(dim=1).detach().numpy()
    np.testing.assert_allclose(row_sums, [1.0, 1.0, 1.0, 1.0], atol=1e-5)

def test_preprocessing_output_shape():
    raw_emg = np.random.randn(8, 3000)
    raw_imu = np.random.randn(48, 400)
    processed = preprocess_single_trial(raw_emg, raw_imu, target_length=256)
    assert processed.shape == (56, 256)
    assert processed.dtype == np.float32

def test_ml_status_endpoint():
    response = client.get("/api/ml/status")
    assert response.status_code == 200
    data = response.json()
    assert data["model_trained"] is True
    assert data["num_classes"] == 3
    assert data["test_accuracy"] is not None

def test_ml_demo_trials_endpoint():
    response = client.get("/api/ml/demo-trials")
    assert response.status_code == 200
    trials = response.json()
    assert len(trials) > 0
    first_trial = trials[0]
    assert "trial_id" in first_trial
    assert "ground_truth_label" in first_trial

def test_ml_predict_endpoint():
    # Login patient
    p_res = client.post("/api/auth/login", json={
        "email": "patient@iasyn.ai",
        "password": "PatientPassword123!",
        "role": "PATIENT"
    })
    token = p_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    predict_req = {"trial_id": "Subject_6/3/Trial_1"}
    response = client.post("/api/ml/predict-demo", json=predict_req, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_label" in data
    assert "confidence" in data
    assert 0.0 <= data["confidence"] <= 1.0
    assert "emg_preview" in data
    assert "imu_preview" in data
