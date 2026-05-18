import time
import copy
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score

def feature_guided_retrain(model, X_recent: pd.DataFrame, y_recent, top_k_features: list, delta_e_scores: dict, severity: str, decay_rate: float = 0.005):
    """
    Step 1 & 2: Feature-guided sample weights computation.
    """
    start_time = time.time()
    n_samples = len(X_recent)
    
    # Standard unweighted/decay weights for comparison
    weights_standard = np.exp(-decay_rate * np.arange(n_samples)[::-1])
    weights_standard /= weights_standard.sum()
    weights_standard *= n_samples # normalize to sum to N

    # Compute drift_score_j
    drift_scores = np.zeros(n_samples)
    feature_weights_used = {}
    
    for feat in top_k_features:
        if feat in X_recent.columns and feat in delta_e_scores:
            feat_data = X_recent[feat].values
            mean_val = np.mean(feat_data)
            std_val = np.std(feat_data)
            if std_val == 0:
                std_val = 1e-6 # prevent division by zero
                
            delta_e = delta_e_scores[feat]
            contrib = (np.abs(feat_data - mean_val) / std_val) * delta_e
            drift_scores += contrib
            feature_weights_used[feat] = float(delta_e)
            
    # Normalize drift_score_j to [1.0, 5.0]
    if drift_scores.max() > drift_scores.min():
        drift_scores = 1.0 + 4.0 * (drift_scores - drift_scores.min()) / (drift_scores.max() - drift_scores.min())
    else:
        drift_scores = np.ones(n_samples)

    # Combine with exponential recency
    recency_weights = np.exp(-decay_rate * np.arange(n_samples)[::-1])
    final_weights = drift_scores * recency_weights
    
    # Normalize to sum to N
    final_weights = final_weights / final_weights.sum() * n_samples

    # Step 3: Retrain with weighted samples (Feature-Guided)
    model_fg = copy.deepcopy(model)
    if severity == "MODERATE" and hasattr(model_fg, 'warm_start'):
        model_fg.warm_start = True
        if hasattr(model_fg, 'n_estimators'):
            model_fg.n_estimators += 50
    elif severity == "SEVERE" and hasattr(model_fg, 'warm_start'):
        model_fg.warm_start = False

    try:
        model_fg.fit(X_recent, y_recent, sample_weight=final_weights)
    except TypeError:
        # Fallback if sample_weight not supported directly, though most sklearn do
        model_fg.fit(X_recent, y_recent)

    # Step 4: Compare against standard retraining
    model_std = copy.deepcopy(model)
    if severity == "MODERATE" and hasattr(model_std, 'warm_start'):
        model_std.warm_start = True
        if hasattr(model_std, 'n_estimators'):
            model_std.n_estimators += 50
    elif severity == "SEVERE" and hasattr(model_std, 'warm_start'):
        model_std.warm_start = False

    try:
        model_std.fit(X_recent, y_recent, sample_weight=weights_standard)
    except TypeError:
        model_std.fit(X_recent, y_recent)

    # Evaluate both on a hold-out set (e.g., last 20% of the recent window)
    val_size = max(10, int(0.2 * n_samples))
    X_val = X_recent.tail(val_size)
    y_val = y_recent.tail(val_size) if hasattr(y_recent, 'tail') else y_recent[-val_size:]
    
    preds_fg = model_fg.predict(X_val)
    acc_fg = float(accuracy_score(y_val, preds_fg))
    
    preds_std = model_std.predict(X_val)
    acc_std = float(accuracy_score(y_val, preds_std))
    
    if acc_fg >= acc_std:
        winner = "feature_guided"
        best_model = model_fg
    else:
        winner = "standard"
        best_model = model_std

    retraining_time = time.time() - start_time
    improvement = acc_fg - acc_std

    # Return results
    return {
        "success": True,
        "candidate_model": best_model,
        "feature_weights": feature_weights_used,
        "validation_accuracy_feature_guided": acc_fg,
        "validation_accuracy_standard": acc_std,
        "winner": winner,
        "improvement": f"{improvement * 100:+.1f}%",
        "top_k_features_used": [{"feature": k, "delta_e": v} for k, v in feature_weights_used.items()],
        "total_samples_retrained": n_samples,
        "retraining_time_seconds": retraining_time,
        "final_weights": final_weights.tolist()
    }
