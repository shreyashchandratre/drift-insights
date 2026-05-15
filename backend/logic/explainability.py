import shap
import pandas as pd
import numpy as np

def compute_shap_drift(model, X_before, X_after):
    """
    Computes SHAP values and Explanation Shift Delta E.
    """
    # Use TreeExplainer for tree-based models, otherwise KernelExplainer
    try:
        explainer = shap.TreeExplainer(model)
        shap_before = explainer.shap_values(X_before)
        shap_after = explainer.shap_values(X_after)
    except Exception as e:
        print(f"TreeExplainer failed, using KernelExplainer: {e}")
        # Use a small background sample for KernelExplainer speed
        background = shap.sample(X_before, 50)
        explainer = shap.KernelExplainer(model.predict_proba if hasattr(model, 'predict_proba') else model.predict, background)
        shap_before = explainer.shap_values(X_before)
        shap_after = explainer.shap_values(X_after)

    # Handle SHAP multi-class output (shap_values might be a list or a 3D array)
    if isinstance(shap_before, list):
        shap_before = shap_before[1] if len(shap_before) > 1 else shap_before[0]
        shap_after = shap_after[1] if len(shap_after) > 1 else shap_after[0]
    
    # If it's still 3D (some SHAP versions return (samples, features, outputs))
    if len(shap_before.shape) == 3:
        shap_before = shap_before[:, :, 1] if shap_before.shape[2] > 1 else shap_before[:, :, 0]
        shap_after = shap_after[:, :, 1] if shap_after.shape[2] > 1 else shap_after[:, :, 0]

    # Mean absolute SHAP values
    mean_abs_before = np.abs(shap_before).mean(axis=0)
    mean_abs_after = np.abs(shap_after).mean(axis=0)
    
    # Delta E_i
    delta_e = np.abs(mean_abs_after - mean_abs_before)
    
    # Total Delta E (L2 norm)
    delta_e_total = np.linalg.norm(delta_e)
    
    # Feature importance shift
    features = X_before.columns.tolist()
    report = []
    for i, feature in enumerate(features):
        report.append({
            "feature": feature,
            "shap_before": float(mean_abs_before[i]),
            "shap_after": float(mean_abs_after[i]),
            "delta_e": float(delta_e[i]),
            "direction": "Up" if mean_abs_after[i] > mean_abs_before[i] else "Down"
        })
    
    # Sort by Delta E
    report = sorted(report, key=lambda x: x['delta_e'], reverse=True)
    
    return report, float(delta_e_total)
