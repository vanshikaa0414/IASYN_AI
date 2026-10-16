# IASYN AI Demonstration Guide & Walkthrough
*Step-by-Step Script for College Engineering Presentation*

This guide walks through the five demonstration workflows designed for evaluators, professors, and peer reviewers.

---

## Demo Accounts Credentials
The database has been seeded with fictional accounts:

### 1. Demo Patient Account
- **Portal:** Patient Portal
- **Email:** `patient@iasyn.ai`
- **Password:** `PatientPassword123!`
- **Assigned Doctor:** Dr. Sarah Chen, PT, DPT

### 2. Demo Doctor Account
- **Portal:** Doctor Portal
- **Email:** `doctor@iasyn.ai`
- **Password:** `DoctorPassword123!`
- **Assigned Patient:** Alex Johnson

*(Tip: On the Login page, click the 1-Click Demo Buttons to fill credentials instantly without typing).*

---

## DEMO 1: Patient Login & Dashboard Overview
1. Open web browser to `http://localhost:5173`.
2. Observe the landing page highlighting:
   - Project title and clinical objective
   - The technical distinction between MediaPipe Webcam Tracking vs. KneE-PAD Sensor 1D-CNN
   - The 4-step closed-loop physical therapy workflow.
3. Click **Patient Login** or **Sign In as Patient**.
4. Click **Alex Johnson (Patient Demo)** to prefill credentials, then click **Sign In as Patient**.
5. Observe the **Patient Dashboard**:
   - Welcome banner displaying assigned clinician (*Dr. Sarah Chen, PT, DPT*)
   - Key rehabilitation metrics (*Total Assessments*, *Total Repetitions*, *Best Range of Motion*)
   - Shortcut action cards to the three core subsystems
   - Highlight of the latest clinical feedback written by the doctor
   - Table of recent assessments showing review states (*Reviewed* and *Pending Review*).

---

## DEMO 2: Exercise Guide (6 Exercises)
1. In the navigation bar, click **Exercise Guide** (or click the dashboard shortcut).
2. Inspect the six clinical rehabilitation exercise cards:
   - **Seated Knee Extension** *(Highlighted with "AI Webcam Ready" badge)*
   - **Quadriceps Sets**
   - **Straight Leg Raise**
   - **Heel Slides**
   - **Standing Hamstring Curl**
   - **Heel Raises**
3. Click **Seated Knee Extension** to view the full detail page:
   - Starting position and posture instructions
   - Step-by-step clinical guidance
   - Clinical safety precautions
   - Interactive Biomechanical Demonstration Player
   - Note the prominent **Start Live Assessment** button.

---

## DEMO 3: Live MediaPipe Webcam Knee Assessment
1. Click **Start Live Assessment** or navigate to `/patient/live-assessment`.
2. Click **Start Camera**:
   - The browser connects to the webcam (or loads the interactive clinical kinematic simulator if running in a headless or camera-restricted environment).
   - Real-time pose landmarks are drawn on the canvas (shoulder, hip, knee, ankle).
3. Click **Start Assessment**:
   - The session timer begins counting.
   - The live knee angle dynamically updates (e.g., from 90° resting flexion to 172° full extension).
   - Dynamic color cueing: Joint turns emerald green upon reaching terminal extension (≥165°).
   - Repetition counter increments reliably using state-machine hysteresis as movements pass extension and return conditions.
4. Click **End Assessment**:
   - An objective **Assessment Report** modal appears displaying:
     - Repetition count, active duration, ROM, min/max knee angles
     - Movement observations (terminal extension achievement, resting return, trunk lean)
     - Overall assessment status (*Meets configured criteria* or *Needs review*).
5. Click **Save to My Reports**.
   - The report is persisted directly to the SQLite database.
6. Open **My Reports** in the navigation bar and verify that the session is listed under **My Webcam Assessments** with status *Pending Review*.

---

## DEMO 4: KneE-PAD Sensor AI Demonstration (1D-CNN)
1. In the navigation bar, click **Sensor AI Demo**.
2. Notice the prominent clinical notice:
   > *"This demonstration analyzes previously recorded EMG and IMU sensor data from the KneE-PAD dataset. It does not measure your current movement."*
3. Inspect the model status pill:
   - Architecture: **1D-CNN-v1.0** (PyTorch)
   - Test Accuracy on held-out participants: **83.85%**
   - Macro F1 Score: **83.29%**
4. Select a recorded trial from the dropdown (e.g., `Participant 6 • Trial_1` or `Participant 12 • Trial_2`).
5. Click **Run AI Analysis**:
   - The backend loads the genuine 8-channel EMG and 48-channel IMU arrays.
   - Real PyTorch forward-pass inference computes softmax probabilities across the three classes.
   - Inspect the results:
     - Predicted Label vs. KneE-PAD Ground-Truth Label
     - Model confidence percentage (e.g., 97.2%)
     - Class probability distribution bar chart
     - Interactive surface EMG line chart (Quadriceps Rectus Femoris vs. Hamstrings)
     - Interactive IMU kinematic line chart (Tri-axial Accelerometer & Gyroscope).
6. Open **My Reports** -> **Sensor AI Demo History** and confirm the trial analysis is recorded.

---

## DEMO 5: Doctor Review & Feedback Loop
1. Click the Logout icon in the upper right.
2. Navigate to **Doctor Portal** login (`/login?portal=doctor`).
3. Click **Dr. Sarah Chen (Doctor Demo)** to prefill credentials, then click **Sign In as Doctor**.
4. Observe the **Doctor Dashboard**:
   - Assigned patients count (1 patient: *Alex Johnson*)
   - Total assessments awaiting clinical review
   - Priority review queue.
5. In the review queue, locate the patient's recent assessment and click **Review & Feedback**.
6. Inspect the kinematic metrics on the clinician review page:
   - Measured joint kinematics (ROM, min/max angle, repetition count, tracking quality)
   - Algorithm-detected observations.
7. Scroll down to the **Physiotherapist Written Feedback** section:
   - Enter your clinical feedback, for example:
     > *"Great job maintaining steady tempo on today's session, Alex! Your terminal extension improved to 174.5°. Continue with 3 sets of 10 daily and remember to avoid leaning backward during the final repetitions."*
8. Click **Save Feedback & Mark Reviewed**.
   - The feedback is committed to SQLite and the assessment status is updated to **Reviewed**.
9. Log out of the Doctor Portal and log back into the **Patient Portal** (`patient@iasyn.ai`).
10. Open **My Reports** (or check the Patient Dashboard banner):
    - Notice the assessment is now marked **Doctor Reviewed**.
    - Expand the session to read the doctor's written clinical recommendations.
