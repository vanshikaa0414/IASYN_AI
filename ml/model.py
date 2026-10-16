import torch
import torch.nn as nn
import torch.nn.functional as F

class KneeExtension1DCNN(nn.Module):
    """
    1D Convolutional Neural Network for Knee Extension Sensor Classification
    Trained on the KneE-PAD rehabilitation dataset (8 EMG + 48 IMU channels = 56 input channels).
    
    Architecture:
    Input: (Batch, 56 channels, 256 time steps)
    -> Conv1D(56 -> 64, k=7) -> BatchNorm -> ReLU -> MaxPool(2)
    -> Conv1D(64 -> 128, k=5) -> BatchNorm -> ReLU -> MaxPool(2)
    -> Conv1D(128 -> 128, k=3) -> BatchNorm -> ReLU -> AdaptiveAvgPool(1)
    -> Dropout(0.3)
    -> Linear(128 -> 64) -> ReLU
    -> Linear(64 -> 3)
    Output: Logits for 3 classes (0: Correct, 1: Incomplete ROM, 2: Lifting Limb)
    """
    def __init__(self, in_channels: int = 56, num_classes: int = 3, dropout_rate: float = 0.3):
        super().__init__()
        
        self.conv1 = nn.Conv1d(in_channels, 64, kernel_size=7, stride=1, padding=3)
        self.bn1 = nn.BatchNorm1d(64)
        
        self.conv2 = nn.Conv1d(64, 128, kernel_size=5, stride=1, padding=2)
        self.bn2 = nn.BatchNorm1d(128)
        
        self.conv3 = nn.Conv1d(128, 128, kernel_size=3, stride=1, padding=1)
        self.bn3 = nn.BatchNorm1d(128)
        
        self.pool = nn.MaxPool1d(kernel_size=2, stride=2)
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        
        self.dropout = nn.Dropout(dropout_rate)
        self.fc1 = nn.Linear(128, 64)
        self.fc2 = nn.Linear(64, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, 56, 256)
        x = self.pool(F.relu(self.bn1(self.conv1(x)))) # -> (B, 64, 128)
        x = self.pool(F.relu(self.bn2(self.conv2(x)))) # -> (B, 128, 64)
        x = F.relu(self.bn3(self.conv3(x)))            # -> (B, 128, 64)
        
        x = self.global_pool(x)                        # -> (B, 128, 1)
        x = x.squeeze(-1)                              # -> (B, 128)
        
        x = self.dropout(x)
        x = F.relu(self.fc1(x))                        # -> (B, 64)
        x = self.dropout(x)
        logits = self.fc2(x)                           # -> (B, 3)
        return logits

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            return F.softmax(logits, dim=1)
