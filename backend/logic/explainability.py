"""
SHAP XAI Explainability Engine — Computes SHAP values for pre-drift (W_before)
and post-drift (W_after) windows, calculates Explanation Shift Delta E per feature,
and produces a ranked feature importance change report.
"""
import shap
import pandas as pd
import numpy as np


def _is_tree_model(model) -> bool:
    """Check if model is a tree-based model that supports TreeExplainer."""
    tree_types = [
        "XGBClassifier", "XGBRegressor", "XGBRFClassifier",
        "LGBMClassifier", "LGBMRegressor",
        "RandomForestClassifier", "RandomForestRegressor",
        "GradientBoostingClassifier", "GradientBoostingRegressor",
        "DecisionTreeClassifier", "DecisionTreeRegressor",
        "ExtraTreesClassifier", "ExtraTreesRegressor"
    ]
    return type(model).__name__ in tree_types


def compute_shap_drift(model, X_before: pd.DataFrame, X_after: pd.DataFrame) -> tuple:
    """
    Compute SHAP values for W_before and W_after windows and calculate Delta E.
    
    Args:
        model: The active ML model.
        X_before: Pre-drift feature matrix (W_before window).
        X_after: Post-drift feature matrix (W_after window).
    
    Returns:
        Tuple of (report_list, delta_e_total, shap_before_summary, shap_after_summary)
    """
    # Use TreeExplainer for tree-based models, KernelExplainer otherwise
    if _is_tree_model(model):
        explainer = shap.TreeExplainer(model)
        shap_before = explainer.shap_values(X_before)
        shap_after = explainer.shap_values(X_after)
    else:
        background = shap.sample(X_before, min(100, len(X_before)))
        predict_fn = model.predict_proba if hasattr(model, 'predict_proba') else model.predict
        explainer = shap.KernelExplainer(predict_fn, background)
        shap_before = explainer.shap_values(X_before, nsamples=100)
        shap_after = explainer.shap_values(X_after, nsamples=100)

    # Handle multi-class output (list of arrays or 3D array)
    if isinstance(shap_before, list):
        shap_before = shap_before[1] if len(shap_before) > 1 else shap_before[0]
        shap_after = shap_after[1] if len(shap_after) > 1 else shap_after[0]
    
    if len(np.array(shap_before).shape) == 3:
        shap_before = np.array(shap_before)[:, :, 1] if np.array(shap_before).shape[2] > 1 else np.array(shap_before)[:, :, 0]
        shap_after = np.array(shap_after)[:, :, 1] if np.array(shap_after).shape[2] > 1 else np.array(shap_after)[:, :, 0]

    shap_before = np.array(shap_before)
    shap_after = np.array(shap_after)

    # Mean absolute SHAP values per feature
    mean_abs_before = np.abs(shap_before).mean(axis=0)
    mean_abs_after = np.abs(shap_after).mean(axis=0)
    
    # Delta E_i = |mean(|SHAP_i(W_after)|) - mean(|SHAP_i(W_before)|)|
    delta_e = np.abs(mean_abs_after - mean_abs_before)
    
    # Total Delta E (L2 norm)
    delta_e_total = float(np.linalg.norm(delta_e))
    
    # Build per-feature report
    features = X_before.columns.tolist()
    report = []
    for i, feature in enumerate(features):
        # Distribution stats for top features
        before_stats = {
            "mean": float(X_before[feature].mean()),
            "std": float(X_before[feature].std()),
            "min": float(X_before[feature].min()),
            "max": float(X_before[feature].max()),
            "median": float(X_before[feature].median())
        }
        after_stats = {
            "mean": float(X_after[feature].mean()),
            "std": float(X_after[feature].std()),
            "min": float(X_after[feature].min()),
            "max": float(X_after[feature].max()),
            "median": float(X_after[feature].median())
        }
        report.append({
            "feature": feature,
            "shap_before": float(mean_abs_before[i]),
            "shap_after": float(mean_abs_after[i]),
            "delta_e": float(delta_e[i]),
            "direction": "Up" if mean_abs_after[i] > mean_abs_before[i] else "Down",
            "before_stats": before_stats,
            "after_stats": after_stats
        })
    
    # Sort by Delta E descending
    report = sorted(report, key=lambda x: x['delta_e'], reverse=True)
    
    # SHAP summaries for visualization (mean abs per feature for both windows)
    shap_summary = {
        "before": {features[i]: float(mean_abs_before[i]) for i in range(len(features))},
        "after": {features[i]: float(mean_abs_after[i]) for i in range(len(features))}
    }
    
    return report, delta_e_total, shap_summary
