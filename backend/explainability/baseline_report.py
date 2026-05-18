import datetime
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from scipy.stats import skew, kurtosis

def generate_baseline_report(model, baseline_df: pd.DataFrame, features: list):
    """
    Generate a baseline health check report for the model using training data.
    """
    X = baseline_df[features]
    y = baseline_df['target'] if 'target' in baseline_df.columns else None
    
    n_samples = len(X)
    
    # 1. SHAP Baseline Feature Importance
    # Sample 200 for SHAP to save time
    shap_sample = X.sample(min(200, n_samples), random_state=42)
    
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(shap_sample)
        if isinstance(shap_values, list): # Multi-class
            shap_values = shap_values[-1] # Assume binary or use positive class
        elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
            shap_values = shap_values[:, :, -1]
    except Exception:
        # Fallback to KernelExplainer if not tree-based
        explainer = shap.KernelExplainer(model.predict, shap_sample.iloc[:10])
        shap_values = explainer.shap_values(shap_sample)
        if isinstance(shap_values, list):
            shap_values = shap_values[-1]
        elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
            shap_values = shap_values[:, :, -1]
            
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    
    # Safety fallback if mean_abs_shap is somehow still 2D
    if hasattr(mean_abs_shap, 'ndim') and mean_abs_shap.ndim > 1:
        mean_abs_shap = mean_abs_shap.mean(axis=1)

    shap_baseline = {feat: float(val) for feat, val in zip(features, mean_abs_shap)}
    
    # Feature rankings by SHAP
    feature_rankings = sorted([{"feature": k, "shap_importance": v} for k, v in shap_baseline.items()], 
                              key=lambda x: x["shap_importance"], reverse=True)
                              
    total_shap = sum(shap_baseline.values())
    
    # 2. Model Performance Baseline
    acc, prec, rec, f1 = 0, 0, 0, 0
    low_conf_count = 0
    if y is not None:
        preds = model.predict(X)
        acc = float(accuracy_score(y, preds))
        
        # Calculate precision, recall, f1 for binary (fallback to weighted for multiclass)
        try:
            prec = float(precision_score(y, preds))
            rec = float(recall_score(y, preds))
            f1 = float(f1_score(y, preds))
        except ValueError:
            prec = float(precision_score(y, preds, average='weighted'))
            rec = float(recall_score(y, preds, average='weighted'))
            f1 = float(f1_score(y, preds, average='weighted'))
            
        if hasattr(model, 'predict_proba'):
            probs = model.predict_proba(X)
            max_probs = np.max(probs, axis=1)
            low_conf_count = int(np.sum(max_probs < 0.6))
            
    # 3. Feature Health Analysis
    stats = []
    unstable_features = []
    for feat in features:
        feat_data = X[feat].values
        mean_val = float(np.mean(feat_data))
        std_val = float(np.std(feat_data))
        skew_val = float(skew(feat_data))
        kurt_val = float(kurtosis(feat_data))
        
        status = "Stable"
        if abs(skew_val) > 2.0:
            status = "Unstable"
            unstable_features.append(feat)
        elif abs(skew_val) > 1.0:
            status = "Monitor"
            
        stats.append({
            "feature": feat,
            "mean": mean_val,
            "std": std_val,
            "skewness": skew_val,
            "kurtosis": kurt_val,
            "status": status
        })
        
    top_3_important = [f["feature"] for f in feature_rankings[:3]]
    bottom_3_important = [f["feature"] for f in feature_rankings[-3:]]
    
    # 4. Potential Bias Detection
    dominant_feature_warning = None
    if feature_rankings and total_shap > 0:
        top_feat = feature_rankings[0]
        if top_feat["shap_importance"] / total_shap > 0.40:
            dominant_feature_warning = f"{top_feat['feature']} accounts for {top_feat['shap_importance'] / total_shap * 100:.0f}% of total SHAP"
            
    low_impact_features = [f["feature"] for f in feature_rankings if f["shap_importance"] < 0.001]
    
    # 5. Drift Vulnerability Score
    vulnerability_rankings = []
    for s in stats:
        feat = s["feature"]
        mean_val = s["mean"]
        std_val = s["std"]
        shap_val = shap_baseline.get(feat, 0)
        
        if mean_val == 0:
            cv = 0
        else:
            cv = abs(std_val / mean_val)
            
        vuln_score = cv * shap_val
        vulnerability_rankings.append({
            "feature": feat,
            "vulnerability_score": float(vuln_score)
        })
        
    vulnerability_rankings.sort(key=lambda x: x["vulnerability_score"], reverse=True)
    top_3_vulnerable = [v["feature"] for v in vulnerability_rankings[:3]]
    
    return {
        "model_type": type(model).__name__,
        "n_features": len(features),
        "n_baseline_samples": n_samples,
        "baseline_accuracy": acc,
        "baseline_f1": f1,
        "shap_baseline": shap_baseline,
        "feature_rankings": feature_rankings,
        "dominant_feature_warning": dominant_feature_warning,
        "low_impact_features": low_impact_features,
        "vulnerability_ranking": vulnerability_rankings,
        "top_3_vulnerable": top_3_vulnerable,
        "low_confidence_sample_count": low_conf_count,
        "feature_stats": stats,
        "report_generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
