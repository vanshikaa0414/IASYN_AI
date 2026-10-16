# IASYN AI System Architecture & Engineering Specifications
*AI-Assisted Knee Rehabilitation Monitoring and Physiotherapist Feedback System*

## 1. System Overview
IASYN AI is a full-stack clinical rehabilitation platform designed to facilitate:
1. Patient access to structured knee rehabilitation exercise instructions.
2. Real-time webcam joint angle tracking and repetition counting during seated knee extension exercises using MediaPipe Pose.
3. Supervised classification of recorded multi-channel electromyography (EMG) and inertial measurement unit (IMU) sensor data from the KneE-PAD dataset using a custom 1D Convolutional Neural Network (1D-CNN).
4. Direct physiotherapist review of patient kinematics and written feedback delivery.

```
+-----------------------------------------------------------------------------------------+
|                                    IASYN AI APPLICATION                                 |
+--------------------------------------------+--------------------------------------------+
|               PATIENT PORTAL               |               DOCTOR PORTAL                |
|  - Exercise Guide (6 Exercises)            |  - Assigned Patient Roster                 |
|  - Live Webcam Assessment (MediaPipe Pose) |  - Kinematic Metric Review                 |
|  - Sensor AI Demo (KneE-PAD 1D-CNN)        |  - Clinician Written Feedback Form         |
|  - Movement & Feedback Reports             |  - Status Management (Reviewed / Pending)  |
+--------------------------------------------+--------------------------------------------+
                                             |
                                             v  REST API (JWT Bearer Auth)
+-----------------------------------------------------------------------------------------+
|                                 FASTAPI APPLICATION BACKEND                             |
|  - Auth Router (/api/auth)                 |  - Database: SQLite (SQLAlchemy ORM)       |
|  - Patient Router (/api/patient)           |  - PyTorch 1D-CNN Inference Engine         |
|  - Doctor Router (/api/doctor)             |  - Strict Role-Based Access Control        |
|  - Machine Learning Router (/api/ml)       |  - Passlib / Bcrypt Password Hashing       |
+--------------------------------------------+--------------------------------------------+
       |                                                            |
       v                                                            v
+------------------------------------------+  +-------------------------------------------+
|      COMPUTER VISION SUBSYSTEM           |  |       SUPERVISED ML SUBSYSTEM             |
|  - MediaPipe Pose Landmarker             |  |  - KneE-PAD Dataset (Zenodo 12112951)     |
|  - Hip-Knee-Ankle Vector Geometry        |  |  - 56 Channels (8 EMG + 48 IMU)           |
|  - Exponential Moving Average Smoothing  |  |  - Subject-Independent Train/Val/Test     |
|  - Hysteresis Repetition Counter         |  |  - Baseline Random Forest (Macro F1 72.8%)|
|  - Kinematic Observation Decision Tree   |  |  - PyTorch 1D-CNN (Test Acc 83.8%, F1 83.3%)|
+------------------------------------------+  +-------------------------------------------+
```

---

## 2. Technical Stack Separation
A central architectural pillar of IASYN AI is the rigorous technical distinction between its two AI modalities:

| Modality | Technology | Input Data | Target | Function |
|---|---|---|---|---|
| **Live Assessment** | Google MediaPipe Pose | Real-time Webcam Frames | Hip, Knee, Ankle landmarks | Calculates interior knee angle (90° to 175°), counts repetitions using a finite-state machine with hysteresis, and detects visible compensatory trunk lean. |
| **Sensor AI Demo** | Custom PyTorch 1D-CNN | Recorded KneE-PAD Signals | 8 EMG channels + 48 IMU channels | Classifies recorded knee extensions into Correct (Class 3), Incomplete ROM (Class 4), and Lifting Limb (Class 5). |

---

## 3. Database Schema (SQLite via SQLAlchemy)
- **`users`**: User identity, role (`PATIENT` or `DOCTOR`), email, and bcrypt password hash.
- **`doctor_patient_assignments`**: Foreign key mapping ensuring doctors only view assigned patients.
- **`webcam_assessments`**: Objective kinematics (repetition count, duration, min/max knee angle, range of motion, tracking quality, observations JSON, assessment status, review status).
- **`doctor_feedbacks`**: Written clinical recommendations authored by assigned doctors linked 1-to-1 with assessments.
- **`sensor_demo_results`**: History of KneE-PAD dataset trials analyzed through the 1D-CNN model.
