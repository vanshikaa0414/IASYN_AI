import os
import json
from pathlib import Path
from typing import Dict, List, Tuple, Any
import numpy as np
from scipy import signal

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset_input" / "dataset"
MODELS_DIR = BASE_DIR / "ml" / "models"
OUTPUTS_DIR = BASE_DIR / "ml" / "outputs"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Dataset Class mapping:
# 3 -> 0 (Correct Seated Knee Extension)
# 4 -> 1 (Wrong: Incomplete Range of Motion)
# 5 -> 2 (Wrong: Lifting Limb from Chair)
CLASS_TO_IDX = {3: 0, 4: 1, 5: 2}
IDX_TO_CLASS = {0: 3, 1: 4, 2: 5}
CLASS_NAMES = {
    0: "Correct Seated Knee Extension",
    1: "Wrong: Incomplete Range of Motion",
    2: "Wrong: Lifting Limb from Chair"
}
CLASS_EXPLANATIONS = {
    0: "The patient completed a full knee extension from 90° flexion to 0° full extension with stable trunk and thigh support.",
    1: "Incomplete knee extension observed. The knee failed to reach terminal extension (reduced active range of motion).",
    2: "Compensatory movement detected: The patient lifted their thigh/limb off the chair seat during knee extension."
}

# Strict Subject-Independent Splits (No participant overlap!)
# 31 subjects total
TRAIN_SUBJECTS = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31]
VAL_SUBJECTS = [3, 9, 15, 21, 27]
TEST_SUBJECTS = [6, 12, 18, 24, 30]

TARGET_LENGTH = 256  # Standardized sequence length for 1D-CNN

def resample_signal(arr: np.ndarray, target_length: int = TARGET_LENGTH) -> np.ndarray:
    """
    Resample a multi-channel signal (channels, time) to (channels, target_length)
    using scipy.signal.resample.
    """
    channels, orig_len = arr.shape
    if orig_len == target_length:
        return arr.astype(np.float32)
    # scipy.signal.resample operates along specified axis
    resampled = signal.resample(arr, target_length, axis=1)
    return resampled.astype(np.float32)

def load_trial_data(trial_dir: Path) -> Tuple[np.ndarray, np.ndarray]:
    """
    Loads raw EMG and IMU arrays from a trial folder.
    EMG: shape (8, T_emg)
    IMU: shape (48, T_imu)
    """
    emg_path = trial_dir / "emg.npy"
    imu_path = trial_dir / "imu.npy"
    if not emg_path.exists() or not imu_path.exists():
        raise FileNotFoundError(f"Missing emg.npy or imu.npy in {trial_dir}")
    
    emg = np.load(emg_path)
    imu = np.load(imu_path)
    return emg, imu

def preprocess_single_trial(
    emg: np.ndarray,
    imu: np.ndarray,
    mean: np.ndarray = None,
    std: np.ndarray = None,
    target_length: int = TARGET_LENGTH
) -> np.ndarray:
    """
    Preprocesses a single trial:
    1. Resample EMG (8, T_emg) -> (8, target_length)
    2. Resample IMU (48, T_imu) -> (48, target_length)
    3. Concatenate along channel dimension -> (56, target_length)
    4. Normalize using training mean and std if provided.
    """
    emg_res = resample_signal(emg, target_length)
    imu_res = resample_signal(imu, target_length)
    combined = np.concatenate([emg_res, imu_res], axis=0) # Shape: (56, target_length)
    
    if mean is not None and std is not None:
        # Broadcast across time dimension: combined is (56, 256), mean/std are (56, 1)
        combined = (combined - mean) / (std + 1e-7)
        
    return combined.astype(np.float32)

def extract_features_for_baseline(combined_signals: np.ndarray) -> np.ndarray:
    """
    Extracts summary statistical features for Random Forest baseline:
    Per channel (56 channels):
    - Mean
    - Standard Deviation
    - Minimum
    - Maximum
    - Root Mean Square (RMS)
    - Peak-to-Peak amplitude
    - Signal Energy
    Returns feature vector of shape (56 * 7,) = 392 features.
    """
    # combined_signals: (56, time)
    feat_mean = np.mean(combined_signals, axis=1)
    feat_std = np.std(combined_signals, axis=1)
    feat_min = np.min(combined_signals, axis=1)
    feat_max = np.max(combined_signals, axis=1)
    feat_rms = np.sqrt(np.mean(combined_signals ** 2, axis=1))
    feat_p2p = feat_max - feat_min
    feat_energy = np.sum(combined_signals ** 2, axis=1)
    
    features = np.concatenate([
        feat_mean, feat_std, feat_min, feat_max, feat_rms, feat_p2p, feat_energy
    ])
    return features.astype(np.float32)

def prepare_dataset(save_processed: bool = True):
    """
    Loads all knee extension trials, performs participant-independent splitting,
    computes normalization parameters on training split only, and returns:
    (X_train, y_train, X_val, y_val, X_test, y_test, meta_info)
    """
    print(f"Preparing KneE-PAD dataset from: {DATASET_DIR}")
    
    train_trials = []
    val_trials = []
    test_trials = []
    
    for sub_id in range(1, 32):
        sub_folder = DATASET_DIR / f"Subject_{sub_id}"
        if not sub_folder.exists():
            continue
            
        for orig_class in [3, 4, 5]:
            class_folder = sub_folder / str(orig_class)
            if not class_folder.exists():
                continue
                
            for trial_folder in sorted(class_folder.iterdir()):
                if not trial_folder.is_dir():
                    continue
                try:
                    emg, imu = load_trial_data(trial_folder)
                    # Resample without normalization first
                    emg_res = resample_signal(emg, TARGET_LENGTH)
                    imu_res = resample_signal(imu, TARGET_LENGTH)
                    combined = np.concatenate([emg_res, imu_res], axis=0) # (56, 256)
                    label = CLASS_TO_IDX[orig_class]
                    
                    item = {
                        "subject_id": sub_id,
                        "class_orig": orig_class,
                        "label": label,
                        "trial_path": f"Subject_{sub_id}/{orig_class}/{trial_folder.name}",
                        "signal": combined
                    }
                    
                    if sub_id in TRAIN_SUBJECTS:
                        train_trials.append(item)
                    elif sub_id in VAL_SUBJECTS:
                        val_trials.append(item)
                    elif sub_id in TEST_SUBJECTS:
                        test_trials.append(item)
                except Exception as e:
                    print(f"Skipping {trial_folder}: {e}")

    print(f"Loaded Trials:")
    print(f" - Train: {len(train_trials)} trials (from {len(TRAIN_SUBJECTS)} subjects)")
    print(f" - Validation: {len(val_trials)} trials (from {len(VAL_SUBJECTS)} subjects)")
    print(f" - Test: {len(test_trials)} trials (from {len(TEST_SUBJECTS)} subjects)")

    # Extract arrays
    X_train_raw = np.array([item["signal"] for item in train_trials], dtype=np.float32) # (N_train, 56, 256)
    y_train = np.array([item["label"] for item in train_trials], dtype=np.int64)

    X_val_raw = np.array([item["signal"] for item in val_trials], dtype=np.float32)
    y_val = np.array([item["label"] for item in val_trials], dtype=np.int64)

    X_test_raw = np.array([item["signal"] for item in test_trials], dtype=np.float32)
    y_test = np.array([item["label"] for item in test_trials], dtype=np.int64)

    # Compute normalization ONLY on train split
    # Shape of mean and std across train samples and time: (56, 1)
    train_mean = np.mean(X_train_raw, axis=(0, 2), keepdims=True) # shape (1, 56, 1)
    train_std = np.std(X_train_raw, axis=(0, 2), keepdims=True)   # shape (1, 56, 1)
    train_std[train_std < 1e-6] = 1.0 # Avoid division by zero

    # Normalize
    X_train = (X_train_raw - train_mean) / train_std
    X_val = (X_val_raw - train_mean) / train_std
    X_test = (X_test_raw - train_mean) / train_std

    # Save preprocessor parameters for inference
    preprocessor_params = {
        "target_length": TARGET_LENGTH,
        "emg_channels": 8,
        "imu_channels": 48,
        "total_channels": 56,
        "mean": train_mean.squeeze().tolist(), # 56 values
        "std": train_std.squeeze().tolist(),   # 56 values
        "class_to_idx": CLASS_TO_IDX,
        "idx_to_class": {str(k): v for k, v in IDX_TO_CLASS.items()},
        "class_names": CLASS_NAMES,
        "class_explanations": CLASS_EXPLANATIONS,
        "splits": {
            "train_subjects": TRAIN_SUBJECTS,
            "val_subjects": VAL_SUBJECTS,
            "test_subjects": TEST_SUBJECTS,
            "train_count": len(train_trials),
            "val_count": len(val_trials),
            "test_count": len(test_trials)
        }
    }

    if save_processed:
        params_path = MODELS_DIR / "preprocessor_params.json"
        with open(params_path, "w", encoding="utf-8") as f:
            json.dump(preprocessor_params, f, indent=2)
        print(f"Saved preprocessing configuration to {params_path}")

    return X_train, y_train, X_val, y_val, X_test, y_test, preprocessor_params, train_trials, val_trials, test_trials

if __name__ == "__main__":
    prepare_dataset(save_processed=True)
