"""
Adaptation Module — Severity-aware model retraining strategies.
Implements MINOR (reweighting), MODERATE (incremental retrain),
and SEVERE (full batch retrain) with validation and hot-swap deployment.
"""
import numpy as np
import pandas as pd
import time
import copy
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


def classify_severity(delta_e_total: float, 
                      minor_threshold: float = 0.15,
                      severe_threshold: float = 0.40) -> dict:
    """
    Classify drift severity based on total Delta E.
    
    Returns dict with severity level, strategy, and thresholds.
    """
    if delta_e_total < minor_threshold:
        return {
            "severity": "MINOR",
            "strategy": "Sample Reweighting",
            "description": f"ΔE_total = {delta_e_total:.4f} → Apply exponential decay weights to training buffer. No structural model changes.",
            "color": "green"
        }
    elif delta_e_total < severe_threshold:
        return {
            "severity": "MODERATE",
            "strategy": "Incremental Batch Retraining",
            "description": f"ΔE_total = {delta_e_total:.4f} → Warm-start retrain on last 1000 labelled samples with existing hyperparameters.",
            "color": "amber"
        }
    else:
        return {
            "severity": "SEVERE",
            "strategy": "Full Batch Retraining",
            "description": f"ΔE_total = {delta_e_total:.4f} → Train new model from scratch on last 5000 recent samples.",
            "color": "red"
        }


def apply_sample_reweighting(model, X_train: pd.DataFrame, y_train,
                              decay_rate: float = 0.005) -> dict:
    """
    MINOR strategy: Apply exponential decay weights to training samples.
    Most recent samples get higher weight.
    """
    start = time.time()
    n = len(X_train)
    weights = np.exp(-decay_rate * np.arange(n)[::-1])
    weights /= weights.sum()
    
    # For tree-based models, refit with sample_weight
    try:
        model_copy = copy.deepcopy(model)
        model_copy.fit(X_train, y_train, sample_weight=weights)
        elapsed = time.time() - start
        return {
            "success": True,
            "model": model_copy,
            "elapsed_seconds": elapsed,
            "method": "sample_reweighting",
            "details": f"Applied exponential decay (rate={decay_rate}) to {n} samples"
        }
    except Exception as e:
        return {
            "success": False,
            "model": model,
            "elapsed_seconds": time.time() - start,
            "error": str(e)
        }


def apply_incremental_retrain(model, X_recent: pd.DataFrame, y_recent,
                               n_samples: int = 1000) -> dict:
    """
    MODERATE strategy: Incremental retrain with warm start on recent samples.
    """
    start = time.time()
    
    # Take the most recent N samples
    X_train = X_recent.tail(n_samples)
    y_train = y_recent.tail(n_samples) if hasattr(y_recent, 'tail') else y_recent[-n_samples:]
    
    try:
        model_copy = copy.deepcopy(model)
        model_name = type(model_copy).__name__
        
        # Enable warm start for compatible models
        if hasattr(model_copy, 'warm_start'):
            model_copy.warm_start = True
            if hasattr(model_copy, 'n_estimators'):
                model_copy.n_estimators += 50  # Add more trees
        
        model_copy.fit(X_train, y_train)
        elapsed = time.time() - start
        
        return {
            "success": True,
            "model": model_copy,
            "elapsed_seconds": elapsed,
            "method": "incremental_retrain",
            "details": f"Warm-start retrain on {len(X_train)} samples ({model_name})"
        }
    except Exception as e:
        return {
            "success": False,
            "model": model,
            "elapsed_seconds": time.time() - start,
            "error": str(e)
        }


def apply_full_retrain(model, X_recent: pd.DataFrame, y_recent,
                        n_samples: int = 5000) -> dict:
    """
    SEVERE strategy: Full model retrain from scratch on recent data.
    """
    start = time.time()
    
    X_train = X_recent.tail(n_samples)
    y_train = y_recent.tail(n_samples) if hasattr(y_recent, 'tail') else y_recent[-n_samples:]
    
    try:
        # Create a fresh model of the same type with same params
        model_copy = copy.deepcopy(model)
        if hasattr(model_copy, 'warm_start'):
            model_copy.warm_start = False
        
        model_copy.fit(X_train, y_train)
        elapsed = time.time() - start
        
        return {
            "success": True,
            "model": model_copy,
            "elapsed_seconds": elapsed,
            "method": "full_retrain",
            "details": f"Full retrain from scratch on {len(X_train)} samples"
        }
    except Exception as e:
        return {
            "success": False,
            "model": model,
            "elapsed_seconds": time.time() - start,
            "error": str(e)
        }


def validate_candidate(model, X_val: pd.DataFrame, y_val, 
                        min_accuracy: float = 0.80) -> dict:
    """
    Validate candidate model M_t+1 against a held-out recent dataset.
    """
    preds = model.predict(X_val)
    accuracy = accuracy_score(y_val, preds)
    passed = accuracy >= min_accuracy
    
    return {
        "passed": passed,
        "accuracy": float(accuracy),
        "min_threshold": min_accuracy,
        "message": f"Candidate model {'validated' if passed else 'FAILED validation'} — Accuracy: {accuracy:.1%} (threshold: {min_accuracy:.0%})"
    }


def execute_adaptation(model, severity: str, X_data: pd.DataFrame, y_data,
                        validation_threshold: float = 0.80) -> dict:
    """
    Execute the full adaptation pipeline for a given severity level.
    Includes fallback to less aggressive strategy on validation failure.
    """
    features = [c for c in X_data.columns if c != 'target']
    X = X_data[features] if 'target' not in features else X_data
    y = y_data
    
    # Split for validation
    if len(X) > 100:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    else:
        X_train, X_val, y_train, y_val = X, X, y, y
    
    strategies = {
        "SEVERE": [apply_full_retrain, apply_incremental_retrain, apply_sample_reweighting],
        "MODERATE": [apply_incremental_retrain, apply_sample_reweighting],
        "MINOR": [apply_sample_reweighting]
    }
    
    strategy_chain = strategies.get(severity, strategies["MINOR"])
    
    for strategy_fn in strategy_chain:
        result = strategy_fn(model, X_train, y_train)
        
        if result["success"]:
            validation = validate_candidate(result["model"], X_val, y_val, validation_threshold)
            
            if validation["passed"]:
                return {
                    "success": True,
                    "model": result["model"],
                    "strategy_used": result["method"],
                    "elapsed_seconds": result["elapsed_seconds"],
                    "validation": validation,
                    "details": result["details"],
                    "fallback_used": strategy_fn != strategy_chain[0]
                }
            else:
                # Fallback to next strategy
                continue
    
    # All strategies failed — return original model
    return {
        "success": False,
        "model": model,
        "strategy_used": "none",
        "elapsed_seconds": 0,
        "validation": {"passed": False, "accuracy": 0, "message": "All strategies failed validation."},
        "details": "All adaptation strategies failed. Keeping current model.",
        "fallback_used": True
    }
