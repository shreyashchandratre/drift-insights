"""
Data Generation Module — Gaussian Drift Generator and synthetic dataset creators.
Supports SEA, STAGGER-like concepts, and configurable Gaussian drift injection.
"""
import pandas as pd
import numpy as np
import random


def simulate_drift(df: pd.DataFrame, features_to_drift: int = 2, 
                   shift_amount: float = 1.0, specific_features: list = None) -> tuple:
    """
    Simulate drift by applying Gaussian mean shifts to selected features.
    
    Args:
        df: Original DataFrame to apply drift to.
        features_to_drift: Number of random features to drift (ignored if specific_features set).
        shift_amount: Magnitude of drift (multiplied by feature std).
        specific_features: Optional list of specific feature names to drift.
    
    Returns:
        Tuple of (drifted_df, selected_features)
    """
    drifted_df = df.copy()
    all_features = [col for col in df.columns if col != 'target']
    
    if specific_features:
        selected_features = [f for f in specific_features if f in all_features]
    else:
        n = min(features_to_drift, len(all_features))
        selected_features = random.sample(all_features, n)
    
    for feat in selected_features:
        std = drifted_df[feat].std()
        if std == 0:
            std = 1.0
        drifted_df[feat] = drifted_df[feat] + (shift_amount * std)
        # Add some noise to make it realistic
        drifted_df[feat] += np.random.normal(0, std * 0.1, len(drifted_df))
    
    return drifted_df, selected_features


def generate_sea_dataset(n_samples: int = 2000, noise: float = 0.1) -> pd.DataFrame:
    """Generate a SEA Concepts synthetic dataset with sudden drift."""
    np.random.seed(42)
    X = np.random.uniform(0, 10, size=(n_samples, 3))
    
    # SEA concept: y = 1 if x1 + x2 <= threshold
    # First half: threshold = 8, Second half: threshold = 7 (drift)
    half = n_samples // 2
    y = np.zeros(n_samples, dtype=int)
    y[:half] = (X[:half, 0] + X[:half, 1] <= 8).astype(int)
    y[half:] = (X[half:, 0] + X[half:, 1] <= 7).astype(int)
    
    # Add noise
    flip_idx = np.random.choice(n_samples, int(n_samples * noise), replace=False)
    y[flip_idx] = 1 - y[flip_idx]
    
    df = pd.DataFrame(X, columns=['feature_0', 'feature_1', 'feature_2'])
    df['target'] = y
    return df


def generate_gaussian_dataset(n_features: int = 10, n_samples: int = 2000) -> pd.DataFrame:
    """Generate a Gaussian dataset for drift testing."""
    np.random.seed(42)
    X = np.random.randn(n_samples, n_features)
    
    # Simple decision boundary
    weights = np.random.randn(n_features)
    logits = X @ weights
    probs = 1 / (1 + np.exp(-logits))
    y = (probs > 0.5).astype(int)
    
    cols = [f'feature_{i}' for i in range(n_features)]
    df = pd.DataFrame(X, columns=cols)
    df['target'] = y
    return df


def create_streaming_data_with_drift(baseline_df: pd.DataFrame, 
                                     drift_events: list,
                                     total_samples: int = 3000) -> pd.DataFrame:
    """
    Create a streaming dataset with multiple configurable drift events.
    
    Args:
        baseline_df: Original clean data to replicate.
        drift_events: List of dicts with keys: 
            sample_idx, n_features, shift_amount
        total_samples: Total number of streaming samples.
    
    Returns:
        DataFrame with drift injected at specified points.
    """
    features = [c for c in baseline_df.columns if c != 'target']
    n_features = len(features)
    
    # Tile baseline to fill total_samples
    repeats = (total_samples // len(baseline_df)) + 1
    stream_df = pd.concat([baseline_df] * repeats, ignore_index=True).head(total_samples).copy()
    
    # Sort drift events by sample index
    drift_events = sorted(drift_events, key=lambda x: x['sample_idx'])
    
    for event in drift_events:
        idx = event['sample_idx']
        n_feat = event.get('n_features', 1)
        shift = event.get('shift_amount', 1.0)
        
        selected = random.sample(features, min(n_feat, n_features))
        
        for feat in selected:
            std = stream_df[feat].std()
            if std == 0:
                std = 1.0
            stream_df.loc[idx:, feat] = stream_df.loc[idx:, feat] + (shift * std)
    
    return stream_df
