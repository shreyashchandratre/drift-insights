import pandas as pd
import numpy as np
import random

def simulate_drift(df, features_to_drift=2, shift_amount=1.0):
    """
    Simulates drift by shifting the mean of random features.
    """
    drifted_df = df.copy()
    all_features = [col for col in df.columns if col != 'target']
    
    selected_features = random.sample(all_features, min(features_to_drift, len(all_features)))
    
    for feat in selected_features:
        # Shift the mean
        std = drifted_df[feat].std()
        drifted_df[feat] = drifted_df[feat] + (shift_amount * std)
        
    return drifted_df, selected_features
