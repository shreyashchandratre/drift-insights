from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import joblib
import os, io, json, time, copy
import numpy as np
from sklearn.metrics import accuracy_score

from logic.drift_detection import detect_drift_adwin, compute_error_signal, compute_pre_post_error
from logic.explainability import compute_shap_drift
from logic.data_generation import simulate_drift, generate_gaussian_dataset, create_streaming_data_with_drift
from logic.adaptation import classify_severity, execute_adaptation
from logic.event_store import log_event, get_events, clear_events
from logic.report_generator import generate_drift_report_pdf
from auth import verify_token
from explainability.baseline_report import generate_baseline_report
from detection.drift_type_classifier import DriftTypeClassifier
from adaptation.feature_guided_retrain import feature_guided_retrain
from logic.ai_assistant import ask_cerebras
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI(title="DriftInsights API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# In-memory session state
S = {
    "model": None, "model_type": None, "model_version": 0,
    "baseline_df": None, "new_df": None, "features": [],
    "rolling_buffer": None,
    "drift_results": None, "shap_report": None, "delta_e_total": 0,
    "severity": None, "adaptation_result": None,
    "baseline_report": None, "drift_type_result": None,
    "last_adaptation_sample": -1000,  # cooldown tracker
    "cooldown": 500,
    "settings": {
        "adwin_delta": 0.002, "minor_threshold": 0.15,
        "severe_threshold": 0.40, "validation_threshold": 0.80,
        "cooldown_samples": 500, "window_size": 200
    }
}

@app.get("/")
def root():
    return {"message": "DriftInsights API running", "model_version": f"M_{S['model_version']}"}

@app.post("/upload-model")
async def upload_model(model_file: UploadFile = File(...), csv_file: UploadFile = File(...), user: dict = Depends(verify_token)):
    try:
        model = joblib.load(io.BytesIO(await model_file.read()))
        df = pd.read_csv(io.BytesIO(await csv_file.read()))
        features = [c for c in df.columns if c != 'target']

        # Validate schema
        if hasattr(model, 'n_features_in_'):
            if model.n_features_in_ != len(features):
                raise HTTPException(400, f"Model expects {model.n_features_in_} features, dataset has {len(features)}")

        S["model"], S["model_type"] = model, type(model).__name__
        S["baseline_df"], S["features"] = df, features
        S["rolling_buffer"] = df.copy()
        S["model_version"] = 0

        # Compute baseline accuracy
        acc = 0
        if 'target' in df.columns:
            acc = float(accuracy_score(df['target'], model.predict(df[features])))

        # Generate baseline report
        report = generate_baseline_report(model, df, features)
        S["baseline_report"] = report

        log_event("model_upload", {"model_type": S["model_type"], "features": len(features), "accuracy": acc})
        log_event("BASELINE_GENERATED", {
            "model_type": report["model_type"],
            "n_features": report["n_features"],
            "baseline_accuracy": report["baseline_accuracy"],
            "top_3_vulnerable_features": report["top_3_vulnerable"],
            "dominant_feature_warning": report["dominant_feature_warning"]
        })
        return {"model_type": S["model_type"], "num_features": len(features), "features": features,
                "baseline_accuracy": acc, "model_version": "M_0", "baseline_report": report}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/upload-new-data")
async def upload_new_data(csv_file: UploadFile = File(...), user: dict = Depends(verify_token)):
    if S["baseline_df"] is None:
        raise HTTPException(400, "Baseline not uploaded")
    df = pd.read_csv(io.BytesIO(await csv_file.read()))
    S["new_df"] = df
    if S["rolling_buffer"] is not None:
        S["rolling_buffer"] = pd.concat([S["rolling_buffer"], df], ignore_index=True).tail(10000)
    else:
        S["rolling_buffer"] = df.copy()

    common = [f for f in S["features"] if f in df.columns]
    dist_data = {}
    for feat in common[:5]:
        dist_data[feat] = {"before": S["baseline_df"][feat].tolist()[:200],
                           "after": df[feat].tolist()[:200]}
    log_event("data_upload", {"rows": len(df), "features": len(common)})
    return {"message": "Data uploaded", "rows": len(df), "drifted_features": common[:5], "dist_data": dist_data}

@app.post("/simulate-drift")
async def run_simulate_drift(shift_amount: float = Form(1.0), num_features: int = Form(3), user: dict = Depends(verify_token)):
    if S["baseline_df"] is None:
        raise HTTPException(400, "Baseline not uploaded")
    drifted_df, selected = simulate_drift(S["baseline_df"], num_features, shift_amount)
    S["new_df"] = drifted_df
    S["rolling_buffer"] = pd.concat([S["baseline_df"], drifted_df], ignore_index=True).tail(10000)

    dist_data = {}
    for feat in S["features"][:5]:
        dist_data[feat] = {"before": S["baseline_df"][feat].tolist()[:200],
                           "after": drifted_df[feat].tolist()[:200]}
    log_event("drift_simulation", {"shift": shift_amount, "features": selected})
    return {"message": f"Drift simulated: {', '.join(selected)}", "drifted_features": selected, "dist_data": dist_data}

@app.post("/detect-drift")
async def run_detect_drift(adwin_delta: float = Form(0.002), user: dict = Depends(verify_token)):
    if S["model"] is None or S["new_df"] is None:
        raise HTTPException(400, "Model or data missing")
    model, features = S["model"], S["features"]
    baseline_df, new_df = S["baseline_df"], S["new_df"]

    # Build error signals
    baseline_errors, new_errors = [], []
    if 'target' in baseline_df.columns:
        baseline_errors = compute_error_signal(model, baseline_df[features], baseline_df['target'])
    if 'target' in new_df.columns:
        new_errors = compute_error_signal(model, new_df[features], new_df['target'])
    combined = baseline_errors + new_errors

    result = detect_drift_adwin(combined, delta=adwin_delta)
    baseline_len = len(baseline_errors)
    drift_idx = [i - baseline_len for i in result["drift_indices"] if i >= baseline_len]
    errors_new = result["running_errors"][baseline_len:] if len(result["running_errors"]) > baseline_len else result["running_errors"]

    pre_err = float(np.mean(baseline_errors)) if baseline_errors else 0
    post_err = float(np.mean(new_errors)) if new_errors else 0
    change_point = drift_idx[0] if drift_idx else None

    pre_post = {}
    if change_point is not None:
        pre_post = compute_pre_post_error(combined, baseline_len + change_point, S["settings"]["window_size"])

    S["drift_results"] = {"drift_indices": drift_idx, "error_signals": errors_new,
                          "change_point": change_point, "pre_post": pre_post}

    log_event("drift_detection", {"detected": len(drift_idx) > 0, "change_point": change_point,
                                   "pre_error": pre_err, "post_error": post_err})
    return {"drift_detected": len(drift_idx) > 0, "drift_indices": drift_idx,
            "error_signals": errors_new, "change_point": change_point,
            "pre_drift_error": pre_post.get("pre_drift_error", pre_err),
            "post_drift_error": pre_post.get("post_drift_error", post_err),
            "error_change": pre_post.get("error_change", post_err - pre_err)}

@app.post("/shap-analysis")
async def run_shap(user: dict = Depends(verify_token)):
    if S["model"] is None or S["new_df"] is None:
        raise HTTPException(400, "Required data missing")
    features = S["features"]
    change_point = (S["drift_results"] or {}).get("change_point")
    window = S["settings"]["window_size"]

    if change_point is not None and change_point > 0:
        start_b = max(0, change_point - window)
        X_before = S["baseline_df"][features].iloc[start_b:start_b + window]
        X_after = S["new_df"][features].iloc[change_point:change_point + window]
    else:
        X_before = S["baseline_df"][features].head(window)
        X_after = S["new_df"][features].head(window)

    if len(X_before) > 200: X_before = X_before.sample(200, random_state=42)
    if len(X_after) > 200: X_after = X_after.sample(200, random_state=42)

    report, delta_e_total, shap_summary = compute_shap_drift(S["model"], X_before, X_after)
    severity = classify_severity(delta_e_total, S["settings"]["minor_threshold"], S["settings"]["severe_threshold"])

    S["shap_report"], S["delta_e_total"], S["severity"] = report, delta_e_total, severity
    log_event("shap_analysis", {"delta_e_total": delta_e_total, "severity": severity["severity"],
                                 "top_feature": report[0]["feature"] if report else None})
    return {"report": report, "delta_e_total": delta_e_total, "severity": severity, "shap_summary": shap_summary}

@app.post("/adapt")
async def run_adaptation(user: dict = Depends(verify_token)):
    if S["model"] is None or S["severity"] is None:
        raise HTTPException(400, "Run SHAP analysis first")
    features = S["features"]
    severity = S["severity"]["severity"]

    # Cooldown check
    cp = (S["drift_results"] or {}).get("change_point", 0) or 0
    if cp - S["last_adaptation_sample"] < S["settings"]["cooldown_samples"] and S["last_adaptation_sample"] >= 0:
        remaining = S["settings"]["cooldown_samples"] - (cp - S["last_adaptation_sample"])
        return {"status": "cooldown", "message": f"Cooldown active — {remaining} samples remaining",
                "remaining": remaining}

    buffer = S["rolling_buffer"] if S["rolling_buffer"] is not None else S["baseline_df"]
    X_data = buffer[features]
    y_data = buffer['target'] if 'target' in buffer.columns else pd.Series(np.zeros(len(buffer)))

    result = execute_adaptation(S["model"], severity, X_data, y_data, S["settings"]["validation_threshold"])
    S["adaptation_result"] = {k: v for k, v in result.items() if k != "model"}

    if result["success"]:
        S["model"] = result["model"]
        S["model_version"] += 1
        S["last_adaptation_sample"] = cp
        S["baseline_df"] = buffer.tail(2000).copy()

    log_event("adaptation", {"severity": severity, "strategy": result["strategy_used"],
                              "success": result["success"], "model_version": f"M_{S['model_version']}",
                              "validation_accuracy": result["validation"]["accuracy"]})
    return {"success": result["success"], "strategy_used": result["strategy_used"],
            "model_version": f"M_{S['model_version']}", "elapsed_seconds": result["elapsed_seconds"],
            "validation": result["validation"], "details": result["details"],
            "fallback_used": result.get("fallback_used", False)}

@app.post("/settings")
async def update_settings(adwin_delta: float = Form(0.002), minor_threshold: float = Form(0.15),
                           severe_threshold: float = Form(0.40), validation_threshold: float = Form(0.80),
                           cooldown_samples: int = Form(500), window_size: int = Form(200),
                           user: dict = Depends(verify_token)):
    S["settings"] = {"adwin_delta": adwin_delta, "minor_threshold": minor_threshold,
                     "severe_threshold": severe_threshold, "validation_threshold": validation_threshold,
                     "cooldown_samples": cooldown_samples, "window_size": window_size}
    return {"message": "Settings updated", "settings": S["settings"]}

@app.get("/settings")
def get_settings(user: dict = Depends(verify_token)):
    return S["settings"]

@app.get("/api/baseline/report")
def get_baseline_report(user: dict = Depends(verify_token)):
    if not S["baseline_report"]:
        raise HTTPException(404, "Baseline report not found")
    return S["baseline_report"]

class ClassifyRequest(BaseModel):
    error_rate_series: List[float]
    change_point_index: int
    top_k_features: List[str]
    drift_history: List[dict] = []

@app.post("/api/drift/classify-type")
def classify_drift_type(req: ClassifyRequest, user: dict = Depends(verify_token)):
    classifier = DriftTypeClassifier()
    result = classifier.classify(req.error_rate_series, req.change_point_index, req.top_k_features, req.drift_history)
    S["drift_type_result"] = result
    
    log_event("DRIFT_TYPE_CLASSIFIED", {
        "drift_type": result["drift_type"],
        "confidence": result["confidence"],
        "evidence_summary": result["evidence"],
        "recommended_strategy": result["recommended_strategy"]
    })
    return result

class ChatRequest(BaseModel):
    message: str
    phase: int

@app.post("/api/chat")
def chat_with_cerebras(req: ChatRequest, user: dict = Depends(verify_token)):
    # Only copy safe primitive state
    context_state = {
        "model_type": S.get("model_type"),
        "model_version": S.get("model_version"),
        "features": S.get("features", []),
        "drift_results": S.get("drift_results"),
        "shap_report": S.get("shap_report"),
        "severity": S.get("severity"),
        "adaptation_result": S.get("adaptation_result"),
        "baseline_report": S.get("baseline_report"),
        "drift_type_result": S.get("drift_type_result"),
        "settings": S.get("settings"),
        "phase": req.phase
    }
    
    answer = ask_cerebras(req.message, context_state)
    log_event("AI_CHAT", {"question": req.message, "phase": req.phase})
    return {"answer": answer}

class FeatureGuidedRequest(BaseModel):
    severity: str
    top_k_features: List[str]
    delta_e_scores: Dict[str, float]
    window_size: int
    decay_rate: float = 0.005

@app.post("/api/retrain/feature-guided")
def run_feature_guided_retrain(req: FeatureGuidedRequest, user: dict = Depends(verify_token)):
    if S["model"] is None or S["rolling_buffer"] is None:
        raise HTTPException(400, "Model or data missing")
        
    features = S["features"]
    buffer = S["rolling_buffer"]
    
    X_data = buffer[features].tail(req.window_size)
    y_data = buffer['target'].tail(req.window_size) if 'target' in buffer.columns else pd.Series(np.zeros(len(X_data)))
    
    start_time = time.time()
    result = feature_guided_retrain(
        S["model"], X_data, y_data, req.top_k_features, req.delta_e_scores, 
        req.severity, req.decay_rate
    )
    
    if result["success"]:
        if result["winner"] == "feature_guided":
            S["model"] = result["candidate_model"]
            S["model_version"] += 1
        else:
            S["model"] = result["candidate_model"]
            S["model_version"] += 1
            
        S["adaptation_result"] = result
        
    log_event("FEATURE_GUIDED_RETRAIN_COMPLETED", {
        "winner": result["winner"],
        "accuracy_improvement": result["improvement"],
        "top_k_features_used": result["top_k_features_used"],
        "retraining_time_seconds": result["retraining_time_seconds"]
    })
    
    # Remove non-serializable objects for JSON response
    response_data = {k: v for k, v in result.items() if k != "candidate_model"}
    response_data["status"] = "success"
    return response_data

@app.get("/events")
def list_events(event_type: str = None, limit: int = 200, user: dict = Depends(verify_token)):
    return get_events(event_type, limit)

@app.get("/status")
def pipeline_status(user: dict = Depends(verify_token)):
    return {"model_loaded": S["model"] is not None, "model_type": S["model_type"],
            "model_version": f"M_{S['model_version']}", "has_baseline": S["baseline_df"] is not None,
            "has_new_data": S["new_df"] is not None, "drift_detected": bool(S["drift_results"] and S["drift_results"].get("drift_indices")),
            "severity": S["severity"], "delta_e_total": S["delta_e_total"]}

@app.get("/download-model")
def download_model(user: dict = Depends(verify_token)):
    if S["model"] is None:
        raise HTTPException(400, "No model loaded or available to download.")
    
    # Save the model to a temporary byte buffer
    buffer = io.BytesIO()
    joblib.dump(S["model"], buffer)
    buffer.seek(0)
    
    filename = f"driftinsights_model_M_{S['model_version']}.joblib"
    return StreamingResponse(buffer, media_type="application/octet-stream",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})

@app.get("/download-report-csv")
def download_csv(user: dict = Depends(verify_token)):
    if not S["shap_report"]:
        raise HTTPException(400, "No SHAP report available")
    rows = ["Feature,SHAP_Before,SHAP_After,Delta_E,Direction"]
    for r in S["shap_report"]:
        rows.append(f"{r['feature']},{r['shap_before']:.6f},{r['shap_after']:.6f},{r['delta_e']:.6f},{r['direction']}")
    content = "\n".join(rows)
    return StreamingResponse(io.BytesIO(content.encode()), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=drift_report.csv"})

@app.get("/download-report-pdf")
def download_pdf(user: dict = Depends(verify_token)):
    if not S["shap_report"]:
        raise HTTPException(400, "No report data")
    data = {
        "detection": {"change_point": (S["drift_results"] or {}).get("change_point"),
                      "pre_drift_error": (S["drift_results"] or {}).get("pre_post", {}).get("pre_drift_error", 0),
                      "post_drift_error": (S["drift_results"] or {}).get("pre_post", {}).get("post_drift_error", 0),
                      "error_change": (S["drift_results"] or {}).get("pre_post", {}).get("error_change", 0),
                      "adwin_delta": S["settings"]["adwin_delta"]},
        "severity": S["severity"] or {}, "delta_e_total": S["delta_e_total"],
        "shap_report": S["shap_report"], "adaptation": S["adaptation_result"] or {}
    }
    pdf_bytes = generate_drift_report_pdf(data)
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf",
                             headers={"Content-Disposition": "attachment; filename=drift_report.pdf"})

@app.get("/demo-mode")
async def demo_mode():
    try:
        model_path, csv_path = os.path.join("data", "demo_model.joblib"), os.path.join("data", "baseline.csv")
        if not os.path.exists(model_path) or not os.path.exists(csv_path):
            from generate_demo import generate_demo_assets
            generate_demo_assets("data")
        model = joblib.load(model_path)
        df = pd.read_csv(csv_path)
        S["model"], S["model_type"] = model, type(model).__name__
        S["baseline_df"], S["features"] = df, [c for c in df.columns if c != 'target']
        S["rolling_buffer"] = df.copy()
        S["model_version"], S["last_adaptation_sample"] = 0, -1000
        clear_events()

        acc = float(accuracy_score(df['target'], model.predict(df[S["features"]])))
        log_event("demo_init", {"model_type": S["model_type"], "features": len(S["features"]), "accuracy": acc})
        return {"status": "success", "model_type": S["model_type"], "num_features": len(S["features"]),
                "features": S["features"], "baseline_accuracy": acc, "model_version": "M_0"}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/demo-run-full")
async def demo_full_pipeline():
    """Run the complete demo pipeline with 3 progressive drift events."""
    if S["model"] is None:
        raise HTTPException(400, "Initialize demo first")
    results = {"phases": []}
    features = S["features"]
    model = S["model"]

    # Phase 1: Simulate moderate drift
    drifted, selected = simulate_drift(S["baseline_df"], features_to_drift=3, shift_amount=1.5)
    S["new_df"] = drifted
    S["rolling_buffer"] = pd.concat([S["baseline_df"], drifted], ignore_index=True).tail(10000)
    results["phases"].append({"phase": "stream", "drifted_features": selected})

    # Phase 2: Detect
    baseline_errors = compute_error_signal(model, S["baseline_df"][features], S["baseline_df"]['target'])
    new_errors = compute_error_signal(model, drifted[features], drifted['target'])
    combined = baseline_errors + new_errors
    det = detect_drift_adwin(combined, S["settings"]["adwin_delta"])
    bl = len(baseline_errors)
    drift_idx = [i - bl for i in det["drift_indices"] if i >= bl]
    cp = drift_idx[0] if drift_idx else None
    pre_post = compute_pre_post_error(combined, bl + (cp or 0), S["settings"]["window_size"]) if cp else {}
    S["drift_results"] = {"drift_indices": drift_idx, "change_point": cp, "pre_post": pre_post,
                          "error_signals": det["running_errors"][bl:]}
    results["phases"].append({"phase": "detect", "drift_detected": bool(drift_idx), "change_point": cp,
                              "pre_drift_error": pre_post.get("pre_drift_error", 0),
                              "post_drift_error": pre_post.get("post_drift_error", 0)})

    # Phase 3: SHAP
    w = S["settings"]["window_size"]
    X_b = S["baseline_df"][features].head(w)
    X_a = drifted[features].head(w)
    if len(X_b) > 200: X_b = X_b.sample(200, random_state=42)
    if len(X_a) > 200: X_a = X_a.sample(200, random_state=42)
    report, delta_e, shap_summary = compute_shap_drift(model, X_b, X_a)
    severity = classify_severity(delta_e, S["settings"]["minor_threshold"], S["settings"]["severe_threshold"])
    S["shap_report"], S["delta_e_total"], S["severity"] = report, delta_e, severity
    results["phases"].append({"phase": "explain", "delta_e_total": delta_e, "severity": severity,
                              "top_features": [r["feature"] for r in report[:3]], "shap_summary": shap_summary,
                              "report": report[:5]})

    # Phase 4: Adapt
    X_data = S["rolling_buffer"][features]
    y_data = S["rolling_buffer"]['target']
    adapt = execute_adaptation(model, severity["severity"], X_data, y_data, S["settings"]["validation_threshold"])
    adapt_result = {k: v for k, v in adapt.items() if k != "model"}
    if adapt["success"]:
        S["model"] = adapt["model"]
        S["model_version"] += 1
    S["adaptation_result"] = adapt_result
    results["phases"].append({"phase": "adapt", **adapt_result, "model_version": f"M_{S['model_version']}"})

    log_event("demo_full_run", {"delta_e": delta_e, "severity": severity["severity"],
                                 "model_version": f"M_{S['model_version']}"})
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
