# KneE-PAD Dataset Analysis & Manifest Report
*IASYN AI Machine Learning Component*

## 1. Executive Summary
- **Dataset Source:** KneE-PAD Rehabilitation Dataset ([Zenodo 12112951](https://zenodo.org/records/12112951))
- **Total Participants:** 31 subjects (`Subject_1` to `Subject_31`)
- **Total Recorded Trials Across All Activities:** 2086
- **Target Exercise for IASYN AI:** Seated Knee Extension (Labels 3, 4, 5)
- **Total Seated Knee Extension Trials:** 914
- **Data Integrity:** 0 corrupted/missing files detected.

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
| **3** | Correct Seated Knee Extension | Seated leg extension performed correctly with full range of motion | **294** |
| **4** | Wrong: Incomplete Range of Motion | Seated leg extension of injured knee without full range of motion | **285** |
| **5** | Wrong: Lifting Limb from Chair | Seated leg extension with lifting of the limb from the chair | **335** |
| **Total** | | | **914** |

---

## 4. Signal Dimensionality & Duration
- **EMG Array Dimensions:** `(8, T_emg)`
  - Minimum Time Length: `2533` samples (2.01 s)
  - Maximum Time Length: `9894` samples (7.86 s)
  - Mean Time Length: `4468.3` samples (3.55 s)
- **IMU Array Dimensions:** `(48, T_imu)`
  - Minimum Time Length: `298` samples (2.01 s)
  - Maximum Time Length: `1164` samples (7.86 s)
  - Mean Time Length: `525.7` samples (3.55 s)

---

## 5. Subject-Independent Splitting Plan
To strictly avoid data leakage:
- No participant's trials will appear in multiple splits.
- Split Ratio: ~70% Train, ~15% Validation, ~15% Test.
- Stratified by subject pathology and class availability.
- Normalization (mean/std per channel) will be fitted ONLY on the training split.
