import sys
import json
import joblib
from pathlib import Path
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
from ml.preprocess import prepare_dataset, extract_features_for_baseline, CLASS_NAMES

MODELS_DIR = BASE_DIR / "ml" / "models"
OUTPUTS_DIR = BASE_DIR / "ml" / "outputs"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

def train_and_evaluate_baseline():
    print("=" * 60)
    print("IASYN AI - Random Forest Baseline Classifier")
    print("=" * 60)
    
    # 1. Load data with participant-independent splits
    X_train_raw, y_train, X_val_raw, y_val, X_test_raw, y_test, params, _, _, _ = prepare_dataset(save_processed=False)
    
    print("\nExtracting statistical feature vectors (56 channels x 7 features = 392 features)...")
    # Features from combined signals (raw or normalized - raw preserves absolute amplitude scale)
    X_train_feats = np.array([extract_features_for_baseline(s) for s in X_train_raw])
    X_val_feats = np.array([extract_features_for_baseline(s) for s in X_val_raw])
    X_test_feats = np.array([extract_features_for_baseline(s) for s in X_test_raw])
    
    print(f"Feature matrix shapes:")
    print(f" - Train: {X_train_feats.shape}, Labels: {y_train.shape}")
    print(f" - Validation: {X_val_feats.shape}, Labels: {y_val.shape}")
    print(f" - Test: {X_test_feats.shape}, Labels: {y_test.shape}")
    
    # 2. Train Random Forest
    print("\nTraining Random Forest Classifier (100 estimators)...")
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1
    )
    rf.fit(X_train_feats, y_train)
    
    # 3. Validation Performance
    val_preds = rf.predict(X_val_feats)
    val_acc = accuracy_score(y_val, val_preds)
    print(f"Validation Accuracy: {val_acc * 100:.2f}%")
    
    # 4. Test Evaluation (Participant-Independent held-out subjects)
    test_preds = rf.predict(X_test_feats)
    test_acc = accuracy_score(y_test, test_preds)
    
    precision, recall, f1, support = precision_recall_fscore_support(
        y_test, test_preds, average="macro", zero_division=0
    )
    
    per_class_p, per_class_r, per_class_f1, per_class_sup = precision_recall_fscore_support(
        y_test, test_preds, average=None, zero_division=0
    )
    
    cm = confusion_matrix(y_test, test_preds).tolist()
    
    report_dict = classification_report(
        y_test, test_preds,
        target_names=[CLASS_NAMES[i] for i in range(3)],
        output_dict=True,
        zero_division=0
    )
    
    print("\n--- Baseline Test Results (Held-out Participants) ---")
    print(f"Test Accuracy: {test_acc * 100:.2f}%")
    print(f"Macro Precision: {precision * 100:.2f}%")
    print(f"Macro Recall: {recall * 100:.2f}%")
    print(f"Macro F1 Score: {f1 * 100:.2f}%")
    print("\nConfusion Matrix:")
    print(np.array(cm))
    print("\nClassification Report:")
    print(classification_report(y_test, test_preds, target_names=[CLASS_NAMES[i] for i in range(3)], zero_division=0))
    
    # Save baseline metrics
    baseline_results = {
        "model_type": "RandomForestClassifier",
        "n_estimators": 100,
        "features_per_sample": int(X_train_feats.shape[1]),
        "test_subjects": params["splits"]["test_subjects"],
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
            "confusion_matrix": cm
        }
    }
    
    metrics_path = OUTPUTS_DIR / "baseline_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(baseline_results, f, indent=2)
    print(f"Saved baseline metrics to: {metrics_path}")
    
    # Save model
    model_path = MODELS_DIR / "baseline_rf.joblib"
    joblib.dump(rf, model_path)
    print(f"Saved baseline model to: {model_path}")
    print("=" * 60)
    
    return baseline_results

if __name__ == "__main__":
    train_and_evaluate_baseline()
