import os
import sys
import random
import json
from pathlib import Path
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

from ml.preprocess import prepare_dataset, CLASS_NAMES
from ml.model import KneeExtension1DCNN

MODELS_DIR = BASE_DIR / "ml" / "models"
OUTPUTS_DIR = BASE_DIR / "ml" / "outputs"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def train_model(epochs: int = 35, batch_size: int = 32, lr: float = 0.001):
    print("=" * 60)
    print("IASYN AI - Training 1D-CNN on KneE-PAD Dataset")
    print("=" * 60)
    set_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # 1. Load and Preprocess Data
    X_train, y_train, X_val, y_val, X_test, y_test, params, _, _, _ = prepare_dataset(save_processed=True)
    
    # Calculate Class Weights
    class_counts = np.bincount(y_train, minlength=3)
    total_samples = len(y_train)
    class_weights = total_samples / (3.0 * class_counts)
    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    print(f"Class distributions in Train: {dict(zip([CLASS_NAMES[i] for i in range(3)], class_counts.tolist()))}")
    print(f"Computed Class Weights: {class_weights}")
    
    # Create DataLoaders
    train_dataset = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
    val_dataset = TensorDataset(torch.from_numpy(X_val), torch.from_numpy(y_val))
    test_dataset = TensorDataset(torch.from_numpy(X_test), torch.from_numpy(y_test))
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    # 2. Initialize Model
    model = KneeExtension1DCNN(in_channels=56, num_classes=3, dropout_rate=0.3).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights_tensor)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=4)
    
    # 3. Training Loop with Checkpointing
    history = {
        "train_loss": [],
        "val_loss": [],
        "train_acc": [],
        "val_acc": [],
        "learning_rates": []
    }
    
    best_val_acc = 0.0
    best_model_path = MODELS_DIR / "knee_1dcnn_best.pt"
    patience = 12
    patience_counter = 0
    
    print("\nStarting training epochs...")
    for epoch in range(1, epochs + 1):
        # Training Phase
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * batch_x.size(0)
            preds = torch.argmax(outputs, dim=1)
            correct += (preds == batch_y).sum().item()
            total += batch_y.size(0)
            
        epoch_train_loss = running_loss / total
        epoch_train_acc = correct / total
        
        # Validation Phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                outputs = model(batch_x)
                loss = criterion(outputs, batch_y)
                
                val_loss += loss.item() * batch_x.size(0)
                preds = torch.argmax(outputs, dim=1)
                val_correct += (preds == batch_y).sum().item()
                val_total += batch_y.size(0)
                
        epoch_val_loss = val_loss / val_total
        epoch_val_acc = val_correct / val_total
        current_lr = optimizer.param_groups[0]["lr"]
        
        scheduler.step(epoch_val_acc)
        
        history["train_loss"].append(epoch_train_loss)
        history["val_loss"].append(epoch_val_loss)
        history["train_acc"].append(epoch_train_acc)
        history["val_acc"].append(epoch_val_acc)
        history["learning_rates"].append(current_lr)
        
        if epoch % 5 == 0 or epoch == 1 or epoch_val_acc > best_val_acc:
            print(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {epoch_train_loss:.4f} Acc: {epoch_train_acc*100:.1f}% | Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc*100:.1f}% | LR: {current_lr:.6f}")
            
        if epoch_val_acc > best_val_acc:
            best_val_acc = epoch_val_acc
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "best_val_acc": best_val_acc,
                "in_channels": 56,
                "num_classes": 3,
                "model_version": "1D-CNN-v1.0"
            }, best_model_path)
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"Early stopping triggered at epoch {epoch} (Best Val Acc: {best_val_acc*100:.2f}%)")
                break
                
    print(f"\nTraining Complete. Best Validation Accuracy: {best_val_acc * 100:.2f}%")
    print(f"Model saved to: {best_model_path}")
    
    # Save training history
    history_path = OUTPUTS_DIR / "training_history.json"
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
    print(f"Saved training history to: {history_path}")
    
    return history, best_model_path

if __name__ == "__main__":
    train_model()
