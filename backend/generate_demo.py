"""
Demo Asset Generator — Creates a pre-trained XGBoost model and baseline
dataset for the built-in demo mode. Uses a synthetic fraud-like dataset.
"""
import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import joblib


def generate_demo_assets(output_dir: str = "data"):
    """Generate demo model and baseline CSV for zero-config demo mode."""
    os.makedirs(output_dir, exist_ok=True)
    np.random.seed(42)
    
    n_samples = 3000
    n_features = 10
    
    # Generate a synthetic fraud-like dataset
    feature_names = [
        'TransactionAmt', 'V258', 'C1', 'D15', 'DeviceType',
        'card_freq', 'addr_risk', 'email_domain', 'browser_id', 'time_delta'
    ]
    
    X = np.random.randn(n_samples, n_features)
    
    # Create a realistic decision boundary
    weights = np.array([0.8, 0.6, -0.5, 0.4, -0.3, 0.3, 0.2, -0.15, 0.1, 0.05])
    logits = X @ weights + np.random.randn(n_samples) * 0.3
    y = (logits > 0).astype(int)
    
    df = pd.DataFrame(X, columns=feature_names)
    df['target'] = y
    
    # Split: save baseline (train) portion
    baseline_df = df.head(2000).copy()
    baseline_df.to_csv(os.path.join(output_dir, "baseline.csv"), index=False)
    
    # Train an XGBoost model on the baseline
    try:
        from xgboost import XGBClassifier
        model = XGBClassifier(
            n_estimators=100, max_depth=5, learning_rate=0.1,
            use_label_encoder=False, eval_metric='logloss',
            random_state=42
        )
    except ImportError:
        from sklearn.ensemble import RandomForestClassifier
        model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    
    X_train = baseline_df[feature_names]
    y_train = baseline_df['target']
    model.fit(X_train, y_train)
    
    # Save model
    joblib.dump(model, os.path.join(output_dir, "demo_model.joblib"))
    
    # Save the held-out stream data (for demo streaming)
    stream_df = df.tail(1000).copy()
    stream_df.to_csv(os.path.join(output_dir, "stream_data.csv"), index=False)
    
    print(f"Demo assets generated in {output_dir}/")
    print(f"  - Model: {type(model).__name__}")
    print(f"  - Baseline: {len(baseline_df)} samples, {n_features} features")
    print(f"  - Stream data: {len(stream_df)} samples")
    
    accuracy = model.score(X_train, y_train)
    print(f"  - Baseline accuracy: {accuracy:.1%}")
    
    return model, baseline_df


if __name__ == "__main__":
    generate_demo_assets("data")
