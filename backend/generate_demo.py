import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_breast_cancer
import joblib
import os

def generate_demo_assets(target_dir):
    os.makedirs(target_dir, exist_ok=True)
    
    # Load dataset
    data = load_breast_cancer()
    X = pd.DataFrame(data.data, columns=data.feature_names)
    y = data.target
    
    # Train a simple model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Save model
    joblib.dump(model, os.path.join(target_dir, 'demo_model.joblib'))
    
    # Save baseline data
    baseline_df = X.copy()
    baseline_df['target'] = y
    baseline_df.to_csv(os.path.join(target_dir, 'baseline.csv'), index=False)
    
    print(f"Demo assets generated in {target_dir}")

if __name__ == "__main__":
    generate_demo_assets('data')
