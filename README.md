# IASYN AI — AI-Assisted Knee Rehabilitation Monitoring and Physiotherapist Feedback System

**IASYN AI** is a full-stack clinical rehabilitation web application built from scratch for physical therapy monitoring, webcam-based joint kinematic tracking, and supervised sensor classification.

---

## Key Features & Portals
- **Patient Portal:**
  - **Exercise Guide:** Medically cautious instructions and video guidance for six rehabilitation exercises (Seated Knee Extension, Quadriceps Sets, Straight Leg Raise, Heel Slides, Standing Hamstring Curl, Heel Raises).
  - **Live Webcam Assessment:** Real-time pose estimation using Google MediaPipe Pose, hip-knee-ankle vector geometry, smoothed joint angles, state-machine repetition counter with hysteresis, and automated report persistence.
  - **Sensor AI Demonstration:** Supervised classification of recorded EMG (8 channels) and IMU (48 channels) sensor data from the **KneE-PAD** dataset using a compact PyTorch **1D-CNN** (Test Accuracy: **83.85%**, Macro F1: **83.29%**).
  - **Patient Reports:** Historical webcam session logs with kinematic metrics and written physiotherapist feedback.
- **Doctor Portal:**
  - Scoped access to assigned patients only.
  - Review queue for patient webcam kinematics and movement observations.
  - Direct clinical feedback authoring saved to SQLite and surfaced immediately to patients.

> **CRITICAL ML DISTINCTION:**
> - **MediaPipe Pose** processes **live webcam video** for real-time patient kinematics and repetition counting.
> - **1D-CNN** processes **previously recorded EMG and IMU sensor data** from the KneE-PAD dataset for offline demonstration.
> - The two systems are technically separated and clearly labelled throughout the application.

---

## Technology Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Lucide React, Recharts.
- **Backend:** Python 3.14 / 3.13, FastAPI, SQLite, SQLAlchemy, Pydantic, Uvicorn, Bcrypt, PyJWT.
- **Machine Learning:** PyTorch, NumPy, Pandas, SciPy, scikit-learn, Matplotlib.
- **Computer Vision:** Google MediaPipe Pose Landmarker, HTML5 Canvas, WebRTC MediaStreams.

---

## Project Structure
```
IASYN_AI/
├── frontend/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── public/exercise-videos/   # MP4 demonstration video assets
│   ├── src/
│   │   ├── components/           # Navbar, Footer, ProtectedRoute, VideoPlayer
│   │   ├── features/             # Exercise data, angle calculator, rep counter
│   │   ├── pages/                # Landing, Login, Patient & Doctor portals
│   │   ├── services/             # API client & backend service bridges
│   │   ├── context/              # Authentication context & session state
│   │   └── types/                # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── main.py               # FastAPI entrypoint & CORS configuration
│   │   ├── database.py           # SQLite connection & sessionmaker
│   │   ├── models/               # SQLAlchemy models (User, Assessment, Feedback)
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── routers/              # Auth, Patient, Doctor, and ML routers
│   │   └── security/             # Bcrypt hashing & JWT token verification
│   ├── tests/                    # Pytest test suite (11 unit & integration tests)
│   ├── seed_demo.py              # Database seeder (creates demo doctor & patient)
│   └── requirements.txt
├── ml/                           # KneE-PAD Machine Learning Subsystem
│   ├── inspect_dataset.py        # Dataset validation & manifest generator
│   ├── preprocess.py             # Signal resampling (56ch) & subject-independent splits
│   ├── model.py                  # PyTorch 1D-CNN architecture
│   ├── baseline.py               # Random Forest 100-tree baseline (Macro F1: 72.8%)
│   ├── train.py                  # 1D-CNN training loop with early stopping
│   ├── evaluate.py               # Test split evaluation, loss curves & confusion matrix
│   ├── predict.py                # Inference service for real-time sensor classification
│   ├── models/                   # Saved model checkpoints & preprocessor params
│   └── outputs/                  # Loss curves, accuracy plots, and evaluation reports
├── dataset_input/                # KneE-PAD Rehabilitation Dataset
│   ├── dataset/                  # Uncompressed subject directories (Subject_1 to 31)
│   ├── dataset.zip               # Compressed dataset archive
│   └── meta.txt                  # Sensor specifications & activity labels
├── docs/                         # Architecture, dataset analysis & methodology
│   ├── architecture.md
│   ├── dataset_analysis.md
│   ├── ml_methodology.md
│   └── demo_guide.md
├── pytest.ini                    # Pytest configuration
├── .gitignore                    # Project hygiene
└── README.md
```

---

## Local Setup & Execution (Windows PowerShell)

### Step 1: Open Terminal in Project Directory
```powershell
cd c:\Users\FMS-PC-2025\OneDrive\Desktop\IASYN_AI
```

### Step 2: Set Up Python Virtual Environment & Dependencies
```powershell
# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install backend & machine learning dependencies
pip install -r backend/requirements.txt
```

### Step 3: Install Frontend Dependencies
```powershell
cd frontend
npm install
cd ..
```

### Step 4: Initialize SQLite Database & Seed Demo Accounts
```powershell
.\venv\Scripts\python backend/seed_demo.py
```

### Step 5: (Optional) Inspect Dataset & Train 1D-CNN
*Note: The model has already been trained and saved under `ml/models/knee_1dcnn_best.pt`.*
```powershell
# Inspect KneE-PAD dataset
.\venv\Scripts\python ml/inspect_dataset.py

# Train baseline Random Forest
.\venv\Scripts\python ml/baseline.py

# Train PyTorch 1D-CNN
.\venv\Scripts\python ml/train.py

# Evaluate and generate evaluation plots
.\venv\Scripts\python ml/evaluate.py
```

### Step 6: Run Automated Tests
```powershell
.\venv\Scripts\pytest -v
```
*(All 11 tests in `backend/tests/` should pass with 100% success).*

---

## Starting the Application

### Terminal 1: Start FastAPI Backend
```powershell
cd c:\Users\FMS-PC-2025\OneDrive\Desktop\IASYN_AI
.\venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be running at: `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`).

### Terminal 2: Start React Frontend
```powershell
cd c:\Users\FMS-PC-2025\OneDrive\Desktop\IASYN_AI\frontend
npm run dev
```
Frontend web application will be accessible at: `http://localhost:5173`.

---

## Demo Accounts

| Role | Portal | Email | Password | Assigned Counterpart |
|---|---|---|---|---|
| **Patient** | Patient Portal | `patient@iasyn.ai` | `PatientPassword123!` | Dr. Sarah Chen, PT |
| **Doctor** | Doctor Portal | `doctor@iasyn.ai` | `DoctorPassword123!` | Alex Johnson |

*(1-click login buttons are also provided directly on the Login page).*

---

## KneE-PAD Machine Learning Results Summary

- **Dataset:** KneE-PAD ([Zenodo 12112951](https://zenodo.org/records/12112951))
- **Activity:** Seated Knee Extension (914 usable trials across 31 subjects).
- **Classes:**
  - Class 3: Correct Seated Knee Extension
  - Class 4: Wrong Execution — Incomplete Range of Motion
  - Class 5: Wrong Execution — Lifting Limb from Chair
- **Sensors:** 8 Delsys Trigno Avanti wireless sensors (8 EMG channels @ 1259.26 Hz + 48 IMU channels @ 148.15 Hz = 56 total input channels).
- **Validation Scheme:** Strict Subject-Independent Splits (Train: 21 subjects, Val: 5 subjects, Test: 5 held-out subjects `[6, 12, 18, 24, 30]`). Zero participant leakage.

| Model | Test Accuracy | Macro Precision | Macro Recall | Macro F1 |
|---|---|---|---|---|
| **Random Forest Baseline** (392 features) | 73.08% | 85.94% | 71.54% | 72.76% |
| **PyTorch 1D-CNN** (56 channels) | **83.85%** | **85.83%** | **83.52%** | **83.29%** |

Generated charts and matrices are saved in `ml/outputs/`:
- `loss_curve.png`
- `accuracy_curve.png`
- `confusion_matrix.png`
- `evaluation_report.json`

---

## College Demonstration Walkthrough
For the complete step-by-step presentation script, consult [`docs/demo_guide.md`](file:///c:/Users/FMS-PC-2025/OneDrive/Desktop/IASYN_AI/docs/demo_guide.md).
