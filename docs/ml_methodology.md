# Machine Learning Methodology & Evaluation Report
*IASYN AI: AI-Assisted Knee Rehabilitation Classification*

## 1. Task Definition
The machine learning objective is to classify recorded multi-channel sensor signals from the KneE-PAD dataset during Seated Knee Extension into three distinct rehabilitation categories:
- **Class 3 (Index 0):** Correct Seated Knee Extension (full range of motion, stable thigh)
- **Class 4 (Index 1):** Wrong Execution — Incomplete Range of Motion (failure to reach full knee extension)
- **Class 5 (Index 2):** Wrong Execution — Lifting Limb (compensatory thigh lifting off the seat)

---

## 2. Dataset and Sensor Modalities
- **Source:** KneE-PAD Dataset (Zenodo 12112951)
- **Sensors:** 8 Delsys Trigno Avanti wireless sensors positioned on quadriceps, hamstrings, tibialis anterior, and gastrocnemius muscles bilaterally.
- **Channels:** 8 EMG channels (`1259.26 Hz`) + 48 IMU channels (`148.15 Hz`: 3-axis accelerometer + 3-axis gyroscope per sensor) = **56 total channels**.
- **Usable Trials:** 914 total trials across 31 subjects.

---

## 3. Strict Subject-Independent Validation Strategy
To prevent data leakage, participant recordings are strictly partitioned across participants:
- **Training Participants (21):** `Subject_1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31`
- **Validation Participants (5):** `Subject_3, 9, 15, 21, 27`
- **Test Participants (5):** `Subject_6, 12, 18, 24, 30`
- **Normalization:** Per-channel zero-mean unit-variance parameters are fitted strictly on the training set.

---

## 4. 1D-CNN Model Architecture
- **Input Dimension:** `(Batch, 56 channels, 256 time steps)`
- **Layer 1:** `Conv1D(56 -> 64, kernel=7, padding=3)` -> BatchNorm1d -> ReLU -> MaxPool1d(2)
- **Layer 2:** `Conv1D(64 -> 128, kernel=5, padding=2)` -> BatchNorm1d -> ReLU -> MaxPool1d(2)
- **Layer 3:** `Conv1D(128 -> 128, kernel=3, padding=1)` -> BatchNorm1d -> ReLU
- **Pooling:** `AdaptiveAvgPool1d(1)` (Global Average Pooling) -> 128 feature dimension
- **Classifier:** Dropout(0.3) -> Linear(128 -> 64) -> ReLU -> Dropout(0.3) -> Linear(64 -> 3)
- **Loss:** Class-weighted Cross-Entropy Loss
- **Optimizer:** Adam (`lr=0.001`, `weight_decay=1e-4`) with `ReduceLROnPlateau`

---

## 5. Actual Evaluation Results on Held-out Subjects
- **Test Participants:** Subjects 6, 12, 18, 24, 30
- **Total Test Trials:** 130
- **Test Accuracy:** `83.85%`
- **Macro Precision:** `85.83%`
- **Macro Recall:** `83.52%`
- **Macro F1 Score:** `83.29%`


### Baseline Random Forest Comparison
- **Features Extracted:** 392 statistical features across 56 channels (mean, std, min, max, RMS, P2P, energy)
- **Baseline Test Accuracy:** `73.08%`
- **Baseline Macro F1:** `72.76%`
- **1D-CNN Test Accuracy:** `83.85%`
- **1D-CNN Macro F1:** `83.29%`


### Per-Class Performance
| Class | Label | Precision | Recall | F1 Score | Support |
|---|---|---|---|---|---|
| **0** | Correct Seated Knee Extension | 70.9% | 95.1% | 81.2% | 41 |
| **1** | Wrong: Incomplete Range of Motion | 93.1% | 65.9% | 77.1% | 41 |
| **2** | Wrong: Lifting Limb from Chair | 93.5% | 89.6% | 91.5% | 48 |

---

## 6. Generated Visual Artifacts
- **Loss Curves:** `ml/outputs/loss_curve.png`
- **Accuracy Curves:** `ml/outputs/accuracy_curve.png`
- **Confusion Matrix:** `ml/outputs/confusion_matrix.png`
- **JSON Manifest:** `ml/outputs/evaluation_report.json`
