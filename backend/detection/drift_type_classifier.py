import numpy as np
from typing import List, Dict, Any
from sklearn.linear_model import LinearRegression

class DriftTypeClassifier:
    def classify(self, error_rate_series: List[float], change_point_index: int, top_k_features: List[str], drift_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Classifies drift into SUDDEN, GRADUAL, INCREMENTAL, RECURRING, or UNKNOWN based on error rate signals.
        """
        n_samples = len(error_rate_series)
        
        if n_samples == 0:
            return self._unknown("Empty error rate series.")
            
        error_array = np.array(error_rate_series)
        
        # 1. SUDDEN DRIFT Detection
        if change_point_index is not None and 0 < change_point_index < n_samples:
            pre_start = max(0, change_point_index - 20)
            post_end = min(n_samples, change_point_index + 20)
            
            pre_window = error_array[pre_start:change_point_index]
            post_window = error_array[change_point_index:post_end]
            
            if len(pre_window) > 0 and len(post_window) > 0:
                mean_pre = np.mean(pre_window)
                mean_post = np.mean(post_window)
                delta_error = mean_post - mean_pre
                
                if delta_error > 0.15:
                    confidence = min(1.0, delta_error / 0.40)
                    return {
                        "drift_type": "SUDDEN",
                        "confidence": float(confidence),
                        "evidence": {"error_rate_jump": float(delta_error), "slope": None, "r_squared": None, "segment_means": [], "recurring_match_event_id": None},
                        "recommended_strategy": "Full Batch Retraining immediately.",
                        "description": "A sharp jump in error rate was detected around the change point."
                    }
                    
        # 2. RECURRING DRIFT Detection
        if len(drift_history) >= 2 and top_k_features:
            for event in reversed(drift_history):
                # Ensure the event has feature info
                if 'top_features' in event:
                    prev_features = set(event['top_features'])
                    curr_features = set(top_k_features)
                    if prev_features and curr_features:
                        overlap = len(prev_features.intersection(curr_features)) / len(curr_features)
                        if overlap > 0.60:
                            return {
                                "drift_type": "RECURRING",
                                "confidence": float(overlap),
                                "evidence": {"error_rate_jump": None, "slope": None, "r_squared": None, "segment_means": [], "recurring_match_event_id": event.get('id')},
                                "recommended_strategy": "Retrieve and warm-start from the model version deployed after the matching drift event.",
                                "description": f"High feature overlap ({overlap*100:.0f}%) with a previous drift event."
                            }

        # 3. GRADUAL DRIFT Detection
        if n_samples > 10:
            X = np.arange(n_samples).reshape(-1, 1)
            y = error_array
            reg = LinearRegression().fit(X, y)
            slope = reg.coef_[0]
            r_squared = reg.score(X, y)
            
            if slope > 0.0005 and r_squared > 0.6:
                return {
                    "drift_type": "GRADUAL",
                    "confidence": float(r_squared),
                    "evidence": {"error_rate_jump": None, "slope": float(slope), "r_squared": float(r_squared), "segment_means": [], "recurring_match_event_id": None},
                    "recommended_strategy": "Incremental Retraining with increased frequency.",
                    "description": "Consistent, gradual increase in error rate over the monitoring window."
                }

        # 4. INCREMENTAL DRIFT Detection
        if n_samples >= 25:
            segment_size = n_samples // 5
            segments = [error_array[i*segment_size:(i+1)*segment_size] for i in range(5)]
            segment_means = [float(np.mean(seg)) for seg in segments]
            
            mono_count = sum(1 for i in range(4) if segment_means[i+1] > segment_means[i])
            if mono_count >= 4:
                return {
                    "drift_type": "INCREMENTAL",
                    "confidence": float(mono_count / 4.0),
                    "evidence": {"error_rate_jump": None, "slope": None, "r_squared": None, "segment_means": segment_means, "recurring_match_event_id": None},
                    "recommended_strategy": "Sample Reweighting first, monitor for escalation.",
                    "description": "Error rate shows an incremental step pattern across segments."
                }
                
        return self._unknown("Insufficient signal for classification.")

    def _unknown(self, reason: str) -> Dict[str, Any]:
        return {
            "drift_type": "UNKNOWN",
            "confidence": 0.0,
            "evidence": {"error_rate_jump": None, "slope": None, "r_squared": None, "segment_means": [], "recurring_match_event_id": None},
            "recommended_strategy": "Standard adaptation based on severity.",
            "description": reason
        }
