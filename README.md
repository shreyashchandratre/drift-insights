# 🌌 DriftInsights

**DriftInsights** is a full-stack, real-time dashboard for **Concept Drift Detection, Explainable AI (XAI) Analysis, and Automated Model Adaptation**. Built for data scientists and ML engineers to monitor how streaming data affects pre-trained models, understand why model behavior changes using SHAP, and automatically retrain using intelligent feature-guided strategies.

---

## 🚀 The 7-Step Explainable Drift Pipeline

1. **Model & Baseline Upload** — Load your `.joblib` model and training CSV. Generates a Baseline Health Report with initial SHAP importance, model confidence, and top drift vulnerabilities.
2. **New Data Injection** — Simulate synthetic drift or upload real post-deployment CSV streams.
3. **Drift Detection** — Pinpoints exact change points in model performance using ADWIN.
4. **Drift Type Classification** — Classifies drift pattern into **SUDDEN, GRADUAL, INCREMENTAL, or RECURRING** based on error signal trends.
5. **SHAP Explainability** — Computes explanation shifts (ΔE) to show how feature importance evolved after the drift event.
6. **Severity Classification** — Ranked analysis of top drifting features with actionable severity labels (Minor / Moderate / Severe).
7. **Feature-Guided Retraining** — Adapts the model by weighting training samples based on variance of top drifting features, deploying the superior candidate to memory.

---

## ✨ Key Features

- **Firebase Auth** — Secure login with email/password or Google Sign-In
- **Intelligent Drift Classification** — Distinguishes abrupt shocks (Sudden) from slow-moving evolutions (Gradual)
- **Feature-Guided Adaptation** — Weights samples based on drift-causing feature variance, not blind retraining
- **Baseline Explainability** — Locked SHAP reference vector on upload, highlighting vulnerable features before drift occurs
- **AI Chat Assistant** — Context-aware chat powered by Cerebras, aware of current pipeline phase and results
- **Interactive Visualizations** — ADWIN error signals, SHAP delta bar charts, retraining weight scatter plots
- **Event Log** — Full audit trail of every pipeline action
- **Export** — Download drift reports as CSV or PDF, and retrained models as `.joblib`
- **Demo Mode** — One-click full pipeline simulation with built-in datasets

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Backend | FastAPI, Python, SQLite, Uvicorn |
| Frontend | React 19, Vite, Tailwind CSS, Recharts, Framer Motion |
| ML / Drift | River (ADWIN), SHAP, Scikit-learn, XGBoost, Pandas |
| Auth | Firebase Authentication |
| AI | Cerebras (chat assistant) |

---

## 🏃 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+ & npm

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

API runs at `http://localhost:8000`

### 2. Frontend

Create `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Then:

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## 📂 Project Structure

```
drift-insights/
├── backend/
│   ├── app.py                          # FastAPI server & pipeline endpoints
│   ├── auth.py                         # Firebase token verification
│   ├── db.py                           # SQLite connection manager
│   ├── logic/
│   │   ├── drift_detection.py          # ADWIN logic
│   │   ├── explainability.py           # SHAP calculations
│   │   ├── data_generation.py          # Drift simulation
│   │   ├── event_store.py              # SQLite event logging
│   │   ├── ai_assistant.py             # Cerebras chat integration
│   │   └── report_generator.py         # PDF export
│   ├── adaptation/
│   │   └── feature_guided_retrain.py   # Feature-guided weighting & retraining
│   ├── detection/
│   │   └── drift_type_classifier.py    # Sudden/Gradual/Incremental classifier
│   ├── explainability/
│   │   └── baseline_report.py          # Phase 0 baseline generation
│   └── data/                           # Demo model & dataset (auto-generated)
└── frontend/
    └── src/
        ├── App.jsx                     # Main dashboard & pipeline orchestration
        ├── api.js                      # Axios API bindings
        ├── firebase/config.js          # Firebase initialization
        ├── context/AuthContext.jsx     # Auth state provider
        └── components/                 # Phase components, chat, event log
```

---

## 📊 SHAP Explanation Shift (ΔE)

The core metric driving adaptation decisions:

```
ΔEᵢ = |mean_abs_SHAP(W_after)ᵢ − mean_abs_SHAP(W_before)ᵢ|
```

Higher ΔE on a feature → that feature's influence on predictions has shifted significantly → it gets higher weight in the retraining process.

---

## 📄 License

MIT — free to use and adapt.
