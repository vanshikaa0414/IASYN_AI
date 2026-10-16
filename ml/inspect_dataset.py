import os
import json
import zipfile
import numpy as np
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_INPUT_DIR = BASE_DIR / "dataset_input"
ZIP_PATH = DATASET_INPUT_DIR / "dataset.zip"
UNZIPPED_DIR = DATASET_INPUT_DIR / "dataset"
META_PATH = DATASET_INPUT_DIR / "meta.txt"
if not META_PATH.exists():
    META_PATH = DATASET_INPUT_DIR / "metadata.txt"

OUTPUT_DIR = BASE_DIR / "ml" / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DOCS_DIR = BASE_DIR / "docs"
DOCS_DIR.mkdir(parents=True, exist_ok=True)

# Knee Extension Classes in KneE-PAD
# Label 3: Correct Seated leg extension
# Label 4: Wrong Seated leg extension (without full range of motion)
# Label 5: Wrong Seated leg extension (lifting limb from chair)
KNEE_EXTENSION_CLASSES = {
    3: "Correct Seated Knee Extension",
    4: "Wrong: Incomplete Range of Motion",
    5: "Wrong: Lifting Limb from Chair"
}

ALL_LABELS = {
    0: "Correct Squat",
    1: "Wrong Squat (weight transfer)",
    2: "Wrong Squat (injured leg in front)",
    3: "Correct Seated leg extension",
    4: "Wrong Seated leg extension (without full ROM)",
    5: "Wrong Seated leg extension (lifting limb from chair)",
    6: "Correct Walking",
    7: "Wrong Walking (knee not fully extended)",
    8: "Wrong Walking (full extension with hip abduction)"
}

def inspect_dataset():
    print("=" * 60)
    print("IASYN AI - KneE-PAD Dataset Inspection")
    print("=" * 60)

    # 1. Check Files
    print(f"Checking dataset files in {DATASET_INPUT_DIR}...")
    zip_exists = ZIP_PATH.exists()
    meta_exists = META_PATH.exists()
    dir_exists = UNZIPPED_DIR.exists()
    print(f" - dataset.zip exists: {zip_exists} ({ZIP_PATH.stat().st_size if zip_exists else 0} bytes)")
    print(f" - meta.txt exists: {meta_exists} ({META_PATH})")
    print(f" - dataset/ directory exists: {dir_exists}")

    # 2. Parse Metadata
    meta_info = {
        "participants": {},
        "sensor_config": {},
        "sensor_placements": {},
        "labels": ALL_LABELS
    }
    
    if meta_exists:
        with open(META_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
        print(f"Parsed {len(lines)} lines from metadata.")

    # 3. Locate Subjects and Trials
    # Use unzipped directory if available, otherwise read from zip
    subject_dirs = []
    if dir_exists:
        subject_dirs = sorted(
            [d for d in UNZIPPED_DIR.iterdir() if d.is_dir() and d.name.startswith("Subject_")],
            key=lambda x: int(x.name.split("_")[1])
        )
    print(f"Found {len(subject_dirs)} subjects in dataset folder.")

    manifest = {
        "total_subjects": len(subject_dirs),
        "subjects": [],
        "knee_extension_summary": {
            "total_trials": 0,
            "by_class": {3: 0, 4: 0, 5: 0},
            "by_subject": {},
            "emg_channels": set(),
            "imu_channels": set(),
            "emg_lengths": [],
            "imu_lengths": [],
            "corrupted_or_missing": []
        }
    }

    total_all_trials = 0
    all_class_counts = {i: 0 for i in range(9)}

    for s_dir in subject_dirs:
        sub_name = s_dir.name
        sub_id = int(sub_name.split("_")[1])
        sub_entry = {"id": sub_id, "name": sub_name, "trials": []}
        
        # Check all class folders in subject
        for c_dir in sorted(s_dir.iterdir()):
            if not c_dir.is_dir():
                continue
            try:
                class_id = int(c_dir.name)
            except ValueError:
                continue
            
            # Check trials
            trial_dirs = sorted([t for t in c_dir.iterdir() if t.is_dir()])
            count = len(trial_dirs)
            all_class_counts[class_id] += count
            total_all_trials += count

            if class_id in KNEE_EXTENSION_CLASSES:
                manifest["knee_extension_summary"]["by_class"][class_id] += count
                manifest["knee_extension_summary"]["by_subject"].setdefault(sub_id, 0)
                manifest["knee_extension_summary"]["by_subject"][sub_id] += count
                manifest["knee_extension_summary"]["total_trials"] += count

                for t_dir in trial_dirs:
                    emg_file = t_dir / "emg.npy"
                    imu_file = t_dir / "imu.npy"
                    
                    trial_info = {
                        "subject_id": sub_id,
                        "class_id": class_id,
                        "class_name": KNEE_EXTENSION_CLASSES[class_id],
                        "trial_name": t_dir.name,
                        "rel_path": f"{sub_name}/{class_id}/{t_dir.name}",
                        "emg_exists": emg_file.exists(),
                        "imu_exists": imu_file.exists(),
                        "emg_shape": None,
                        "imu_shape": None,
                        "valid": False
                    }

                    if emg_file.exists() and imu_file.exists():
                        try:
                            emg_arr = np.load(emg_file)
                            imu_arr = np.load(imu_file)
                            
                            # Shape verification
                            trial_info["emg_shape"] = list(emg_arr.shape)
                            trial_info["imu_shape"] = list(imu_arr.shape)
                            
                            manifest["knee_extension_summary"]["emg_channels"].add(emg_arr.shape[0])
                            manifest["knee_extension_summary"]["imu_channels"].add(imu_arr.shape[0])
                            manifest["knee_extension_summary"]["emg_lengths"].append(int(emg_arr.shape[1]))
                            manifest["knee_extension_summary"]["imu_lengths"].append(int(imu_arr.shape[1]))

                            # Check for NaNs or Infs
                            if np.isnan(emg_arr).any() or np.isnan(imu_arr).any():
                                trial_info["has_nan"] = True
                                manifest["knee_extension_summary"]["corrupted_or_missing"].append(f"{trial_info['rel_path']}: NaN values")
                            else:
                                trial_info["valid"] = True
                        except Exception as e:
                            trial_info["error"] = str(e)
                            manifest["knee_extension_summary"]["corrupted_or_missing"].append(f"{trial_info['rel_path']}: {e}")
                    else:
                        manifest["knee_extension_summary"]["corrupted_or_missing"].append(f"{trial_info['rel_path']}: Missing files")

                    sub_entry["trials"].append(trial_info)

        manifest["subjects"].append(sub_entry)

    # Convert sets to lists for JSON serialization
    emg_lengths = manifest["knee_extension_summary"]["emg_lengths"]
    imu_lengths = manifest["knee_extension_summary"]["imu_lengths"]
    
    stats_summary = {
        "total_subjects": len(subject_dirs),
        "total_trials_all_activities": total_all_trials,
        "all_class_counts": all_class_counts,
        "knee_extension": {
            "total_trials": manifest["knee_extension_summary"]["total_trials"],
            "by_class": manifest["knee_extension_summary"]["by_class"],
            "emg_channels": list(manifest["knee_extension_summary"]["emg_channels"]),
            "imu_channels": list(manifest["knee_extension_summary"]["imu_channels"]),
            "emg_length_min": int(np.min(emg_lengths)) if emg_lengths else 0,
            "emg_length_max": int(np.max(emg_lengths)) if emg_lengths else 0,
            "emg_length_mean": float(np.mean(emg_lengths)) if emg_lengths else 0,
            "imu_length_min": int(np.min(imu_lengths)) if imu_lengths else 0,
            "imu_length_max": int(np.max(imu_lengths)) if imu_lengths else 0,
            "imu_length_mean": float(np.mean(imu_lengths)) if imu_lengths else 0,
            "corrupted_or_missing_count": len(manifest["knee_extension_summary"]["corrupted_or_missing"]),
            "corrupted_or_missing_list": manifest["knee_extension_summary"]["corrupted_or_missing"]
        }
    }

    # Save manifest
    manifest_save = {
        "stats": stats_summary,
        "subjects": manifest["subjects"]
    }
    manifest_path = OUTPUT_DIR / "dataset_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_save, f, indent=2)
    print(f"\nManifest successfully written to: {manifest_path}")

    # Generate Markdown Report in docs/dataset_analysis.md
    analysis_md = f"""# KneE-PAD Dataset Analysis & Manifest Report
*IASYN AI Machine Learning Component*

## 1. Executive Summary
- **Dataset Source:** KneE-PAD Rehabilitation Dataset ([Zenodo 12112951](https://zenodo.org/records/12112951))
- **Total Participants:** {stats_summary['total_subjects']} subjects (`Subject_1` to `Subject_{stats_summary['total_subjects']}`)
- **Total Recorded Trials Across All Activities:** {total_all_trials}
- **Target Exercise for IASYN AI:** Seated Knee Extension (Labels 3, 4, 5)
- **Total Seated Knee Extension Trials:** {stats_summary['knee_extension']['total_trials']}
- **Data Integrity:** {stats_summary['knee_extension']['corrupted_or_missing_count']} corrupted/missing files detected.

---

## 2. Sensor Hardware Configuration (from metadata)
- **Sensor System:** Delsys Trigno Avanti Wireless Sensors (8 sensors placed on bilaterally positioned leg muscle groups)
- **EMG Channels:** 8 channels (1 channel per sensor)
  - Muscle Placements:
    1. Right Rectus Femoris
    2. Right Hamstrings
    3. Right Tibialis Anterior
    4. Right Gastrocnemius
    5. Left Rectus Femoris
    6. Left Hamstrings
    7. Left Tibialis Anterior
    8. Left Gastrocnemius
- **IMU Channels:** 48 channels (6 channels per sensor: Tri-axial Accelerometer [x, y, z] in G + Tri-axial Gyroscope [x, y, z] in DEG/S)
- **Sampling Rates:**
  - EMG Sampling Rate: `1259.26 Hz`
  - IMU Sampling Rate: `148.15 Hz`
  - Ratio (EMG / IMU): `8.5`

---

## 3. Knee Extension Activity Classes
| Label ID | Activity Class | Description | Total Usable Trials |
|---|---|---|---|
| **3** | Correct Seated Knee Extension | Seated leg extension performed correctly with full range of motion | **{stats_summary['knee_extension']['by_class'][3]}** |
| **4** | Wrong: Incomplete Range of Motion | Seated leg extension of injured knee without full range of motion | **{stats_summary['knee_extension']['by_class'][4]}** |
| **5** | Wrong: Lifting Limb from Chair | Seated leg extension with lifting of the limb from the chair | **{stats_summary['knee_extension']['by_class'][5]}** |
| **Total** | | | **{stats_summary['knee_extension']['total_trials']}** |

---

## 4. Signal Dimensionality & Duration
- **EMG Array Dimensions:** `(8, T_emg)`
  - Minimum Time Length: `{stats_summary['knee_extension']['emg_length_min']}` samples ({stats_summary['knee_extension']['emg_length_min']/1259.26:.2f} s)
  - Maximum Time Length: `{stats_summary['knee_extension']['emg_length_max']}` samples ({stats_summary['knee_extension']['emg_length_max']/1259.26:.2f} s)
  - Mean Time Length: `{stats_summary['knee_extension']['emg_length_mean']:.1f}` samples ({stats_summary['knee_extension']['emg_length_mean']/1259.26:.2f} s)
- **IMU Array Dimensions:** `(48, T_imu)`
  - Minimum Time Length: `{stats_summary['knee_extension']['imu_length_min']}` samples ({stats_summary['knee_extension']['imu_length_min']/148.15:.2f} s)
  - Maximum Time Length: `{stats_summary['knee_extension']['imu_length_max']}` samples ({stats_summary['knee_extension']['imu_length_max']/148.15:.2f} s)
  - Mean Time Length: `{stats_summary['knee_extension']['imu_length_mean']:.1f}` samples ({stats_summary['knee_extension']['imu_length_mean']/148.15:.2f} s)

---

## 5. Subject-Independent Splitting Plan
To strictly avoid data leakage:
- No participant's trials will appear in multiple splits.
- Split Ratio: ~70% Train, ~15% Validation, ~15% Test.
- Stratified by subject pathology and class availability.
- Normalization (mean/std per channel) will be fitted ONLY on the training split.
"""
    with open(DOCS_DIR / "dataset_analysis.md", "w", encoding="utf-8") as f:
        f.write(analysis_md)
    print(f"Dataset analysis documentation written to: {DOCS_DIR / 'dataset_analysis.md'}")

    print("\n--- Summary Statistics ---")
    print(f"Total Subjects: {stats_summary['total_subjects']}")
    print(f"Seated Knee Extension Trials: {stats_summary['knee_extension']['total_trials']}")
    print(f"Class 3 (Correct): {stats_summary['knee_extension']['by_class'][3]}")
    print(f"Class 4 (Wrong - Incomplete ROM): {stats_summary['knee_extension']['by_class'][4]}")
    print(f"Class 5 (Wrong - Lifting Limb): {stats_summary['knee_extension']['by_class'][5]}")
    print(f"EMG Channels: {stats_summary['knee_extension']['emg_channels']}")
    print(f"IMU Channels: {stats_summary['knee_extension']['imu_channels']}")
    print(f"Corrupted or Missing: {stats_summary['knee_extension']['corrupted_or_missing_count']}")
    print("=" * 60)

    return stats_summary

if __name__ == "__main__":
    inspect_dataset()
