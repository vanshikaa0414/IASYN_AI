import sys
import json
from pathlib import Path
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import matplotlib
matplotlib.use("Agg") # Non-interactive backend
import matplotlib.pyplot as plt
import torch
import torch.nn.functional as F
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support

from ml.preprocess import prepare_dataset, CLASS_NAMES
from ml.model import KneeExtension1DCNN

MODELS_DIR = BASE_DIR / "ml" / "models"
OUTPUTS_DIR = BASE_DIR / "ml" / "outputs"
DOCS_DIR = BASE_DIR / "docs"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
DOCS_DIR.mkdir(parents=True, exist_ok=True)

def evaluate_model():
    print("=" * 60)
    print("IASYN AI - Evaluating 1D-CNN on Held-out Test Participants")
    print("=" * 60)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # 1. Load Data
    _, _, _, _, X_test, y_test, params, _, _, _ = prepare_dataset(save_processed=False)
    test_tensor = torch.from_numpy(X_test).to(device)
    
    # 2. Load Trained Model
    model_path = MODELS_DIR / "knee_1dcnn_best.pt"
    if not model_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found at {model_path}. Run train.py first.")
        
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    model = KneeExtension1DCNN(in_channels=56, num_classes=3).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    print(f"Loaded checkpoint trained to epoch {checkpoint.get('epoch', 'N/A')}")
    
    # 3. Predict on Test Set
    with torch.no_grad():
        logits = model(test_tensor)
        probs = F.softmax(logits, dim=1).cpu().numpy()
        preds = np.argmax(probs, axis=1)
        
    # 4. Compute Metrics
    test_acc = accuracy_score(y_test, preds)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, preds, average="macro", zero_division=0)
    per_class_p, per_class_r, per_class_f1, per_class_sup = precision_recall_fscore_support(
        y_test, preds, average=None, zero_division=0
    )
    cm = confusion_matrix(y_test, preds)
    
    print("\n--- 1D-CNN Test Results (Held-Out Test Subjects: 6, 12, 18, 24, 30) ---")
    print(f"Test Accuracy:    {test_acc * 100:.2f}%")
    print(f"Macro Precision:  {precision * 100:.2f}%")
    print(f"Macro Recall:     {recall * 100:.2f}%")
    print(f"Macro F1 Score:   {f1 * 100:.2f}%")
    print("\nConfusion Matrix:")
    print(cm)
    print("\nClassification Report:")
    report_text = classification_report(y_test, preds, target_names=[CLASS_NAMES[i] for i in range(3)], zero_division=0)
    print(report_text)
    
    # 5. Save Evaluation JSON Report
    eval_results = {
        "model_name": "KneeExtension1DCNN",
        "model_version": checkpoint.get("model_version", "1D-CNN-v1.0"),
        "test_subjects": params["splits"]["test_subjects"],
        "num_test_trials": len(y_test),
        "metrics": {
            "test_accuracy": float(test_acc),
            "macro_precision": float(precision),
            "macro_recall": float(recall),
            "macro_f1": float(f1),
            "per_class": {
                CLASS_NAMES[i]: {
                    "precision": float(per_class_p[i]),
                    "recall": float(per_class_r[i]),
                    "f1": float(per_class_f1[i]),
                    "support": int(per_class_sup[i])
                }
                for i in range(3)
            },
            "confusion_matrix": cm.tolist()
        }
    }
    
    eval_path = OUTPUTS_DIR / "evaluation_report.json"
    with open(eval_path, "w", encoding="utf-8") as f:
        json.dump(eval_results, f, indent=2)
    print(f"Saved evaluation metrics to: {eval_path}")
    
    # 6. Generate Figures
    # A. Training and Validation Curves
    history_path = OUTPUTS_DIR / "training_history.json"
    if history_path.exists():
        with open(history_path, "r", encoding="utf-8") as f:
            hist = json.load(f)
            
        epochs_range = range(1, len(hist["train_loss"]) + 1)
        
        # Loss Curve
        plt.figure(figsize=(8, 5))
        plt.plot(epochs_range, hist["train_loss"], label="Train Loss", color="#0284c7", lw=2)
        plt.plot(epochs_range, hist["val_loss"], label="Validation Loss", color="#f43f5e", lw=2)
        plt.title("1D-CNN Training & Validation Loss", fontsize=14, fontweight="bold")
        plt.xlabel("Epochs", fontsize=11)
        plt.ylabel("Cross-Entropy Loss", fontsize=11)
        plt.legend(frameon=True)
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()
        plt.savefig(OUTPUTS_DIR / "loss_curve.png", dpi=300)
        plt.close()
        
        # Accuracy Curve
        plt.figure(figsize=(8, 5))
        plt.plot(epochs_range, [acc * 100 for acc in hist["train_acc"]], label="Train Accuracy", color="#0284c7", lw=2)
        plt.plot(epochs_range, [acc * 100 for acc in hist["val_acc"]], label="Validation Accuracy", color="#10b981", lw=2)
        plt.axhline(y=test_acc * 100, color="#f59e0b", linestyle=":", label=f"Test Accuracy ({test_acc*100:.1f}%)")
        plt.title("1D-CNN Training, Validation & Test Accuracy", fontsize=14, fontweight="bold")
        plt.xlabel("Epochs", fontsize=11)
        plt.ylabel("Accuracy (%)", fontsize=11)
        plt.legend(frameon=True)
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()
        plt.savefig(OUTPUTS_DIR / "accuracy_curve.png", dpi=300)
        plt.close()
        print("Generated loss and accuracy curve plots.")
        
    # B. Confusion Matrix Plot
    plt.figure(figsize=(7, 6))
    plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title("1D-CNN Confusion Matrix on Test Split", fontsize=13, fontweight="bold")
    plt.colorbar()
    tick_marks = np.arange(3)
    short_labels = ["Correct (3)", "Wrong ROM (4)", "Wrong Lift (5)"]
    plt.xticks(tick_marks, short_labels, rotation=25)
    plt.yticks(tick_marks, short_labels)
    
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, format(cm[i, j], "d"),
                     horizontalalignment="center",
                     color="white" if cm[i, j] > thresh else "black",
                     fontsize=12, fontweight="bold")
                     
    plt.ylabel("Ground Truth Class", fontsize=11)
    plt.xlabel("Predicted Class", fontsize=11)
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / "confusion_matrix.png", dpi=300)
    plt.close()
    print("Generated confusion matrix plot.")
    
    # 7. Write Comprehensive Documentation docs/ml_methodology.md
    baseline_path = OUTPUTS_DIR / "baseline_metrics.json"
    baseline_info = ""
    if baseline_path.exists():
        with open(baseline_path, "r", encoding="utf-8") as f:
            b_data = json.load(f)
            bm = b_data["metrics"]
            baseline_info = f"""
### Baseline Random Forest Comparison
- **Features Extracted:** 392 statistical features across 56 channels (mean, std, min, max, RMS, P2P, energy)
- **Baseline Test Accuracy:** `{bm['test_accuracy']*100:.2f}%`
- **Baseline Macro F1:** `{bm['macro_f1']*100:.2f}%`
- **1D-CNN Test Accuracy:** `{test_acc*100:.2f}%`
- **1D-CNN Macro F1:** `{f1*100:.2f}%`
"""

    methodology_md = f"""# Machine Learning Methodology & Evaluation Report
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
- **Total Test Trials:** {len(y_test)}
- **Test Accuracy:** `{test_acc * 100:.2f}%`
- **Macro Precision:** `{precision * 100:.2f}%`
- **Macro Recall:** `{recall * 100:.2f}%`
- **Macro F1 Score:** `{f1 * 100:.2f}%`

{baseline_info}

### Per-Class Performance
| Class | Label | Precision | Recall | F1 Score | Support |
|---|---|---|---|---|---|
| **0** | Correct Seated Knee Extension | {per_class_p[0]*100:.1f}% | {per_class_r[0]*100:.1f}% | {per_class_f1[0]*100:.1f}% | {per_class_sup[0]} |
| **1** | Wrong: Incomplete Range of Motion | {per_class_p[1]*100:.1f}% | {per_class_r[1]*100:.1f}% | {per_class_f1[1]*100:.1f}% | {per_class_sup[1]} |
| **2** | Wrong: Lifting Limb from Chair | {per_class_p[2]*100:.1f}% | {per_class_r[2]*100:.1f}% | {per_class_f1[2]*100:.1f}% | {per_class_sup[2]} |

---

## 6. Generated Visual Artifacts
- **Loss Curves:** `ml/outputs/loss_curve.png`
- **Accuracy Curves:** `ml/outputs/accuracy_curve.png`
- **Confusion Matrix:** `ml/outputs/confusion_matrix.png`
- **JSON Manifest:** `ml/outputs/evaluation_report.json`
"""
    with open(DOCS_DIR / "ml_methodology.md", "w", encoding="utf-8") as f:
        f.write(methodology_md)
    print(f"Saved methodology report to: {DOCS_DIR / 'ml_methodology.md'}")
    print("=" * 60)
    
    return eval_results

if __name__ == "__main__":
    evaluate_model()
