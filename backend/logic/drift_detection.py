from river import drift
import numpy as np

def detect_drift_adwin(error_signals):
    """
    error_signals: List of 0s and 1s or confidence scores.
    Returns: List of indices where drift was detected.
    """
    # Increased sensitivity (delta=0.01 instead of 0.002)
    adwin = drift.ADWIN(delta=0.01)
    drift_indices = []
    
    for i, val in enumerate(error_signals):
        adwin.update(val)
        if adwin.drift_detected:
            drift_indices.append(i)
            
    return drift_indices
