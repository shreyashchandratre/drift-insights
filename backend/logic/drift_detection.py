"""
Drift Detection Module — Uses River's ADWIN for concept drift detection.
Feeds binary correct/incorrect prediction signals into ADWIN and returns
detected change points with pre/post error rate statistics.
"""
from river import drift
import numpy as np


def detect_drift_adwin(error_signals: list, delta: float = 0.002) -> dict:
    """
    Run ADWIN drift detection on a stream of binary error signals.
    
    Args:
        error_signals: List of 0s (correct) and 1s (incorrect predictions).
        delta: ADWIN confidence parameter (lower = more sensitive).
    
    Returns:
        Dictionary with drift_indices, window sizes, and running error rates.
    """
    adwin = drift.ADWIN(delta=delta)
    drift_indices = []
    running_errors = []
    window_sizes = []
    cumulative_errors = 0
    
    for i, val in enumerate(error_signals):
        adwin.update(val)
        cumulative_errors += val
        running_errors.append(cumulative_errors / (i + 1))
        window_sizes.append(adwin.width)
        
        if adwin.drift_detected:
            drift_indices.append(i)
    
    return {
        "drift_indices": drift_indices,
        "running_errors": running_errors,
        "window_sizes": window_sizes
    }


def compute_error_signal(model, X, y_true) -> list:
    """
    Compute binary error signal: 1 if prediction is wrong, 0 if correct.
    """
    preds = model.predict(X)
    return (preds != y_true).astype(int).tolist()


def compute_pre_post_error(error_signals: list, change_point: int, window: int = 200) -> dict:
    """
    Compute pre-drift and post-drift error rates around a change point.
    """
    pre_start = max(0, change_point - window)
    pre_window = error_signals[pre_start:change_point]
    post_window = error_signals[change_point:change_point + window]
    
    pre_error = np.mean(pre_window) if pre_window else 0
    post_error = np.mean(post_window) if post_window else 0
    
    return {
        "pre_drift_error": float(pre_error),
        "post_drift_error": float(post_error),
        "error_change": float(post_error - pre_error),
        "pre_window_size": len(pre_window),
        "post_window_size": len(post_window)
    }
