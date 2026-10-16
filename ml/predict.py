import os
import json
from pathlib import Path
from typing import Dict, Any, List
import numpy as np
import torch
import torch.nn.functional as F

from ml.model import KneeExtension1DCNN
from ml.preprocess import (
    load_trial_data,
    preprocess_single_trial,
    CLASS_NAMES,
    CLASS_EXPLANATIONS,
    IDX_TO_CLASS,
    CLASS_TO_IDX
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset_input" / "dataset"
MODELS_DIR = BASE_DIR / "ml" / "models"
OUTPUTS_DIR = BASE_DIR / "ml" / "outputs"

class KneePredictor:
    """
    Inference service for KneE-PAD 1D-CNN Model.
    Loads saved checkpoint and normalization parameters to predict on sensor trials.
    """
    _instance = None

    def __init__(self):
        self.device = torch.device("cpu") # CPU is fast and universally available for inference
        self.model = None
        self.params = None
        self.mean = None
        self.std = None
        self.model_version = "1D-CNN-v1.0"
        self._load_model_and_params()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = KneePredictor()
        return cls._instance

    def _load_model_and_params(self):
        params_path = MODELS_DIR / "preprocessor_params.json"
        model_path = MODELS_DIR / "knee_1dcnn_best.pt"

        if not params_path.exists() or not model_path.exists():
            return

        try:
            with open(params_path, "r", encoding="utf-8") as f:
                self.params = json.load(f)
            
            # Mean and std are lists of 56 floats
            self.mean = np.array(self.params["mean"], dtype=np.float32).reshape(56, 1)
            self.std = np.array(self.params["std"], dtype=np.float32).reshape(56, 1)

            # Load model
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
            self.model = KneeExtension1DCNN(in_channels=56, num_classes=3).to(self.device)
            self.model.load_state_dict(checkpoint["model_state_dict"])
            self.model.eval()
            self.model_version = checkpoint.get("model_version", "1D-CNN-v1.0")
        except Exception as e:
            print(f"Warning: Could not load trained model: {e}")
            self.model = None

    def is_ready(self) -> bool:
        if self.model is None or self.params is None:
            self._load_model_and_params()
        return self.model is not None and self.params is not None

    def predict_trial(self, trial_rel_path: str) -> Dict[str, Any]:
        """
        Runs real inference on a KneE-PAD trial.
        trial_rel_path: e.g. "Subject_1/3/Trial_1"
        """
        if not self.is_ready():
            raise RuntimeError("Model is not trained yet. Please train the 1D-CNN first.")

        trial_dir = DATASET_DIR / trial_rel_path
        if not trial_dir.exists():
            raise FileNotFoundError(f"Trial directory does not exist: {trial_dir}")

        parts = trial_rel_path.replace("\\", "/").split("/")
        # Expected: Subject_X / Class_Y / Trial_Z
        orig_class = int(parts[1])
        ground_truth_idx = CLASS_TO_IDX.get(orig_class, 0)
        ground_truth_label = CLASS_NAMES[ground_truth_idx]

        # Load raw data
        raw_emg, raw_imu = load_trial_data(trial_dir)
        
        # Preprocess
        processed = preprocess_single_trial(
            raw_emg, raw_imu,
            mean=self.mean, std=self.std,
            target_length=self.params["target_length"]
        ) # Shape: (56, 256)

        # PyTorch Tensor: (1, 56, 256)
        input_tensor = torch.from_numpy(processed).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = F.softmax(logits, dim=1).squeeze(0).cpu().numpy()

        pred_idx = int(np.argmax(probs))
        confidence = float(probs[pred_idx])
        pred_label = CLASS_NAMES[pred_idx]
        category_explanation = CLASS_EXPLANATIONS[pred_idx]

        probabilities_dict = {
            CLASS_NAMES[i]: float(probs[i])
            for i in range(3)
        }

        # Prepare downsampled signal preview for Recharts frontend visualization (e.g. 100 points)
        # Select representative channels:
        # EMG: Channel 0 (Rectus Femoris - Quadriceps) & Channel 1 (Hamstrings)
        # IMU: Channel 0 (Acc X), Channel 1 (Acc Y), Channel 2 (Acc Z), Channel 3 (Gyro X)
        num_preview_pts = 80
        emg_step = max(1, raw_emg.shape[1] // num_preview_pts)
        imu_step = max(1, raw_imu.shape[1] // num_preview_pts)

        # Compute RMS envelope for EMG Rectus Femoris & Hamstrings
        emg_preview_data = []
        for i in range(0, raw_emg.shape[1], emg_step):
            t_sec = round(i / 1259.26, 3)
            emg_preview_data.append({
                "time": t_sec,
                "quadriceps_rf": round(float(raw_emg[0, i]), 4),
                "hamstrings": round(float(raw_emg[1, i]), 4)
            })

        imu_preview_data = []
        for i in range(0, raw_imu.shape[1], imu_step):
            t_sec = round(i / 148.15, 3)
            imu_preview_data.append({
                "time": t_sec,
                "acc_x": round(float(raw_imu[0, i]), 3),
                "acc_y": round(float(raw_imu[1, i]), 3),
                "acc_z": round(float(raw_imu[2, i]), 3),
                "gyro_z": round(float(raw_imu[5, i]), 3)
            })

        return {
            "trial_id": trial_rel_path,
            "ground_truth_label": ground_truth_label,
            "ground_truth_class_id": orig_class,
            "predicted_label": pred_label,
            "predicted_class_id": IDX_TO_CLASS[pred_idx],
            "confidence": round(confidence, 4),
            "probabilities": {k: round(v, 4) for k, v in probabilities_dict.items()},
            "model_version": self.model_version,
            "category_explanation": category_explanation,
            "emg_preview": {
                "channels": ["Quadriceps Rectus Femoris (mV)", "Hamstrings (mV)"],
                "data": emg_preview_data[:num_preview_pts]
            },
            "imu_preview": {
                "channels": ["Acc X (G)", "Acc Y (G)", "Acc Z (G)", "Gyro Z (deg/s)"],
                "data": imu_preview_data[:num_preview_pts]
            }
        }
