from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
import os
import io
import json
import numpy as np
from logic.drift_detection import detect_drift_adwin
from logic.explainability import compute_shap_drift
from logic.data_generation import simulate_drift

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for the current session (simplified for demo)
STORAGE = {
    "model": None,
    "model_type": None,
    "baseline_df": None,
    "new_df": None,
    "features": [],
    "drift_results": None,
    "shap_report": None,
    "delta_e_total": 0
}

@app.get("/")
def read_root():
    return {"message": "DriftInsights API is running"}

@app.post("/upload-model")
async def upload_model(model_file: UploadFile = File(...), csv_file: UploadFile = File(...)):
    try:
        # Load Model
        model_bytes = await model_file.read()
        model = joblib.load(io.BytesIO(model_bytes))
        
        # Load CSV
        csv_bytes = await csv_file.read()
        df = pd.read_csv(io.BytesIO(csv_bytes))
        
        STORAGE["model"] = model
        STORAGE["model_type"] = type(model).__name__
        STORAGE["baseline_df"] = df
        STORAGE["features"] = [col for col in df.columns if col != 'target']
        
        return {
            "model_type": STORAGE["model_type"],
            "num_features": len(STORAGE["features"]),
            "features": STORAGE["features"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/upload-new-data")
async def upload_new_data(csv_file: UploadFile = File(...)):
    if STORAGE["baseline_df"] is None:
        raise HTTPException(status_code=400, detail="Baseline data not uploaded")
    try:
        csv_bytes = await csv_file.read()
        df = pd.read_csv(io.BytesIO(csv_bytes))
        STORAGE["new_df"] = df
        
        # Prepare distribution data for the chart
        dist_data = {}
        # Only take features that exist in both
        common_features = [f for f in STORAGE["features"] if f in df.columns]
        
        for feat in common_features[:3]: # Show top 3 for visualization
            dist_data[feat] = {
                "before": STORAGE["baseline_df"][feat].tolist(),
                "after": df[feat].tolist()
            }
            
        return {
            "message": "New data stream uploaded successfully",
            "drifted_features": common_features[:3],
            "dist_data": dist_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/simulate-drift")
async def run_simulate_drift(shift_amount: float = Form(...)):
    if STORAGE["baseline_df"] is None:
        raise HTTPException(status_code=400, detail="Baseline data not uploaded")
    
    drifted_df, selected_features = simulate_drift(STORAGE["baseline_df"], features_to_drift=3, shift_amount=shift_amount)
    STORAGE["new_df"] = drifted_df
    
    # Prepare distribution data for the chart
    dist_data = {}
    for feat in STORAGE["features"]:
        dist_data[feat] = {
            "before": STORAGE["baseline_df"][feat].tolist(),
            "after": drifted_df[feat].tolist()
        }
        
    return {
        "message": f"Drift simulated in features: {', '.join(selected_features)}",
        "drifted_features": selected_features,
        "dist_data": dist_data
    }

@app.post("/detect-drift")
async def run_detect_drift(metric: str = Form("performance")):
    if STORAGE["model"] is None or STORAGE["new_df"] is None or STORAGE["baseline_df"] is None:
        raise HTTPException(status_code=400, detail="Model, baseline or new data missing")
    
    model = STORAGE["model"]
    features = STORAGE["features"]
    
    # Function to get detection signal
    def get_signal(df, metric_type):
        X = df[features]
        if metric_type == "performance":
            y_true = df['target'] if 'target' in df.columns else None
            preds = model.predict(X)
            if y_true is not None:
                return (preds != y_true).astype(int).tolist()
            elif hasattr(model, "predict_proba"):
                probs = model.predict_proba(X)
                return (1 - np.max(probs, axis=1)).tolist()
            return [0] * len(preds)
        else:
            # Feature-based signal: use the mean of normalized features
            # This is a proxy for detecting distribution shift in data
            X_norm = (X - X.mean()) / (X.std() + 1e-6)
            return X_norm.mean(axis=1).tolist()

    # Calculate signals for both baseline and new
    baseline_signals = get_signal(STORAGE["baseline_df"], metric)
    new_signals = get_signal(STORAGE["new_df"], metric)
    
    # Concatenate to give ADWIN a reference
    combined_signals = baseline_signals + new_signals
    
    # Run ADWIN on combined signals
    raw_drift_indices = detect_drift_adwin(combined_signals)
    
    # Filter drift indices that occur in the 'new data' part
    baseline_len = len(baseline_signals)
    drift_indices = [idx - baseline_len for idx in raw_drift_indices if idx >= baseline_len]
    
    STORAGE["drift_results"] = {
        "error_signals": new_signals, # This is the signal plotted
        "drift_indices": drift_indices
    }
    
    # Calculate pre/post error for reporting
    y_true_new = STORAGE["new_df"]['target'] if 'target' in STORAGE["new_df"].columns else None
    y_true_base = STORAGE["baseline_df"]['target'] if 'target' in STORAGE["baseline_df"].columns else None
    
    def get_err(df):
        if 'target' not in df.columns: return 0
        p = model.predict(df[features])
        return np.mean(p != df['target'])

    pre_drift_error = get_err(STORAGE["baseline_df"])
    post_drift_error = get_err(STORAGE["new_df"])
    
    return {
        "error_signals": new_signals,
        "drift_indices": drift_indices,
        "pre_drift_error": float(pre_drift_error),
        "post_drift_error": float(post_drift_error),
        "metric_used": metric
    }

@app.post("/shap-analysis")
async def run_shap_analysis():
    if STORAGE["model"] is None or STORAGE["new_df"] is None or STORAGE["drift_results"] is None:
        raise HTTPException(status_code=400, detail="Required data for SHAP missing")
    
    drift_indices = STORAGE["drift_results"]["drift_indices"]
    if not drift_indices:
        # If no drift detected, compare baseline vs whole new data
        X_before = STORAGE["baseline_df"][STORAGE["features"]]
        X_after = STORAGE["new_df"][STORAGE["features"]]
    else:
        # Compare baseline vs data after the first drift point
        split = drift_indices[0]
        X_before = STORAGE["baseline_df"][STORAGE["features"]]
        X_after = STORAGE["new_df"].iloc[split:][STORAGE["features"]]

    # Take a sample if too large for speed
    if len(X_before) > 100: X_before = X_before.sample(100)
    if len(X_after) > 100: X_after = X_after.sample(100)
    
    report, delta_e_total = compute_shap_drift(STORAGE["model"], X_before, X_after)
    
    STORAGE["shap_report"] = report
    STORAGE["delta_e_total"] = delta_e_total
    
    return {
        "report": report,
        "delta_e_total": delta_e_total
    }

@app.get("/demo-mode")
async def initialize_demo():
    try:
        model_path = os.path.join("data", "demo_model.joblib")
        csv_path = os.path.join("data", "baseline.csv")
        
        if not os.path.exists(model_path) or not os.path.exists(csv_path):
             # Run the generator if files missing
             from generate_demo import generate_demo_assets
             generate_demo_assets('data')

        model = joblib.load(model_path)
        df = pd.read_csv(csv_path)
        
        STORAGE["model"] = model
        STORAGE["model_type"] = type(model).__name__
        STORAGE["baseline_df"] = df
        STORAGE["features"] = [col for col in df.columns if col != 'target']
        
        return {
            "status": "success",
            "model_type": STORAGE["model_type"],
            "num_features": len(STORAGE["features"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
