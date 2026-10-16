import os
import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.sensor_demo import SensorDemoResult
from app.schemas.sensor_demo import (
    MLStatusResponse,
    TrialSelectionItem,
    SensorPredictRequest,
    SensorDemoResponse
)
from app.security.auth import get_current_user
from ml.predict import KneePredictor
from ml.preprocess import CLASS_NAMES, CLASS_TO_IDX

router = APIRouter(prefix="/ml", tags=["Machine Learning Sensor Demo"])

BASE_DIR = Path(__file__).resolve().parents[3]
DATASET_DIR = BASE_DIR / "dataset_input" / "dataset"
OUTPUTS_DIR = BASE_DIR / "ml" / "outputs"
MODELS_DIR = BASE_DIR / "ml" / "models"

@router.get("/status", response_model=MLStatusResponse)
def get_ml_status():
    predictor = KneePredictor.get_instance()
    is_ready = predictor.is_ready()
    
    test_acc = None
    macro_f1 = None
    
    eval_path = OUTPUTS_DIR / "evaluation_report.json"
    if eval_path.exists():
        try:
            with open(eval_path, "r", encoding="utf-8") as f:
                report = json.load(f)
                test_acc = report.get("metrics", {}).get("test_accuracy")
                macro_f1 = report.get("metrics", {}).get("macro_f1")
        except Exception:
            pass

    return MLStatusResponse(
        model_trained=is_ready,
        model_version=predictor.model_version,
        model_file_exists=(MODELS_DIR / "knee_1dcnn_best.pt").exists(),
        num_classes=3,
        classes={k: CLASS_NAMES[k] for k in range(3)},
        test_accuracy=round(test_acc * 100, 2) if test_acc is not None else None,
        macro_f1=round(macro_f1 * 100, 2) if macro_f1 is not None else None
    )

@router.get("/demo-trials", response_model=List[TrialSelectionItem])
def get_available_demo_trials():
    """
    Returns a curated set of real recorded trials from KneE-PAD representing
    all 3 classes and held-out test and validation participants.
    """
    manifest_path = OUTPUTS_DIR / "dataset_manifest.json"
    trials_list = []

    # Selected diverse subjects: test subjects (6, 12, 18, 24, 30) and val subjects (3, 9, 15, 21, 27)
    featured_subjects = [6, 12, 18, 24, 30, 3, 9, 15, 21, 27, 1, 2]
    
    for sub_id in featured_subjects:
        sub_dir = DATASET_DIR / f"Subject_{sub_id}"
        if not sub_dir.exists():
            continue
            
        for orig_class in [3, 4, 5]:
            class_dir = sub_dir / str(orig_class)
            if not class_dir.exists():
                continue
                
            # Take up to 2 trials per subject-class pair to keep the selection list fast and clean
            t_folders = sorted([t for t in class_dir.iterdir() if t.is_dir()])[:2]
            for t_dir in t_folders:
                emg_f = t_dir / "emg.npy"
                imu_f = t_dir / "imu.npy"
                if emg_f.exists() and imu_f.exists():
                    try:
                        # Inspect file sizes to compute samples
                        emg_bytes = emg_f.stat().st_size
                        imu_bytes = imu_f.stat().st_size
                        # 8 channels * 8 bytes (float64) = 64 bytes per time step
                        # header is 128 bytes
                        emg_len = max(0, (emg_bytes - 128) // (8 * 8))
                        imu_len = max(0, (imu_bytes - 128) // (48 * 8))
                        duration_sec = round(emg_len / 1259.26, 2)
                        
                        class_idx = CLASS_TO_IDX[orig_class]
                        trials_list.append(TrialSelectionItem(
                            trial_id=f"Subject_{sub_id}/{orig_class}/{t_dir.name}",
                            subject_id=sub_id,
                            subject_name=f"Participant {sub_id}",
                            class_id=orig_class,
                            ground_truth_label=CLASS_NAMES[class_idx],
                            trial_name=t_dir.name,
                            emg_samples=emg_len,
                            imu_samples=imu_len,
                            duration_seconds=duration_sec
                        ))
                    except Exception:
                        pass
                        
    return trials_list

@router.post("/predict-demo", response_model=SensorDemoResponse)
def predict_demo_trial(
    request: SensorPredictRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    predictor = KneePredictor.get_instance()
    if not predictor.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="1D-CNN Model is not loaded or trained yet. Please train the model."
        )

    try:
        result = predictor.predict_trial(request.trial_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    # Save to history if patient is authenticated
    record_id = None
    created_at = None
    if current_user:
        history_entry = SensorDemoResult(
            initiated_by_user_id=current_user.id,
            dataset_trial_id=result["trial_id"],
            predicted_label=result["predicted_label"],
            ground_truth_label=result["ground_truth_label"],
            confidence=result["confidence"],
            model_version=result["model_version"]
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        record_id = history_entry.id
        created_at = history_entry.created_at

    return SensorDemoResponse(
        id=record_id,
        trial_id=result["trial_id"],
        ground_truth_label=result["ground_truth_label"],
        ground_truth_class_id=result["ground_truth_class_id"],
        predicted_label=result["predicted_label"],
        predicted_class_id=result["predicted_class_id"],
        confidence=result["confidence"],
        probabilities=result["probabilities"],
        model_version=result["model_version"],
        created_at=created_at,
        category_explanation=result["category_explanation"],
        emg_preview=result["emg_preview"],
        imu_preview=result["imu_preview"]
    )
