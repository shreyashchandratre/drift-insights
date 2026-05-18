# 🌌 DriftInsights

**DriftInsights** is an advanced, interactive, real-time dashboard designed for **Concept Drift Detection, XAI (Explainable AI) Analysis, and Automated Model Adaptation**. It provides a seamless full-stack pipeline for data scientists and ML engineers to monitor how streaming data affects pre-trained models, interpret why model behavior changes over time using SHAP, and automatically adapt the model using intelligent retraining strategies.

---

## 🚀 The 7-Step Explainable Drift Pipeline

1.  **Model & Baseline Upload (Phase 0)**: Load your `.joblib` model and training data. Generates a comprehensive **Baseline Health Report** detailing initial SHAP feature importance, model confidence, and top drift vulnerabilities.
2.  **New Data Injection (Phase 1)**: Simulate synthetic drift or upload real post-deployment CSV streams.
3.  **Drift Detection (Phase 2)**: Automatically pinpoint exact change points in model performance using ADWIN.
4.  **Drift Type Classification**: Upon ADWIN detection, the system immediately classifies the drift pattern into **SUDDEN, GRADUAL, INCREMENTAL, or RECURRING** based on error signal trends and historical overlap.
5.  **SHAP Explainability (Phase 4)**: Compute explanation shifts ($\Delta E$) to see exactly how feature importance has evolved after the drift event.
6.  **Severity Classification (Phase 5)**: Get a ranked analysis of top drifting features with an actionable severity classification (Minor, Moderate, Severe).
7.  **Feature-Guided Retraining (Phase 6)**: The system automatically adapts your model by applying **Feature-Guided Retraining**. This process weights training samples dynamically based on the variance of the top drifting features, deploying the superior candidate (Standard vs. Feature-Guided) to memory and providing a downloadable `M_t+1` model.

---

## ✨ Advanced Capabilities

-   **Intelligent Drift Classification**: Automatically distinguishes between abrupt system shocks (Sudden) and slow-moving concept evolutions (Gradual).
-   **Feature-Guided Adaptation**: Doesn't just retrain blindly—weights specific samples based on how much the crucial, drift-causing features have varied.
-   **Baseline Explainability**: Creates a locked SHAP reference vector upon upload, highlighting highly skewed or vulnerable features before drift even happens.
-   **Interactive Visualizations**: Real-time histograms, ADWIN error rate signals, SHAP delta bar charts, and Retraining Weight Distribution scatter plots.
-   **Demo Mode**: One-click full pipeline simulation with built-in datasets and pre-trained models.

---

## 🛠️ Technology Stack

-   **Backend**: FastAPI (Python), SQLite
-   **Frontend**: React (Vite), Recharts, Framer Motion
-   **ML & Drift**: River (ADWIN), SHAP, Scikit-learn, Pandas, XGBoost
-   **Styling**: Tailwind CSS, Lucide React

---

## 🏃 Getting Started

### Prerequisites
- Python 3.8+
- Node.js & npm

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt # Requires: fastapi uvicorn river shap pandas scikit-learn joblib xgboost reportlab
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```
*The API will be available at `http://localhost:8000`.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 📂 Project Structure

```text
drift-insights/
├── backend/
│   ├── app.py                     # FastAPI Server
│   ├── db.py                      # SQLite Database Connection Manager
│   ├── logic/
│   │   ├── drift_detection.py     # ADWIN Logic
│   │   ├── explainability.py      # SHAP Calculations
│   │   ├── data_generation.py     # Simulation Logic
│   │   ├── event_store.py         # SQLite Event Logging 
│   │   └── report_generator.py    # PDF Export
│   ├── adaptation/                
│   │   └── feature_guided_retrain.py # Feature-Guided Weighting & Retraining
│   ├── detection/                 
│   │   └── drift_type_classifier.py  # Sudden/Gradual/Incremental Classifier
│   ├── explainability/            
│   │   └── baseline_report.py        # Phase 0 Baseline Generation
│   └── tests/                     # Pytest Unit Tests
└── frontend/
    └── src/
        ├── App.jsx                # Main React Dashboard
        ├── index.css              # Custom Tailwind & Styles
        ├── api.js                 # Axios API bindings
        └── components/            # Phase and Panel Components
```

---

## 📊 SHAP Explanation Shift ($\Delta E$)

The core innovation of DriftInsights is the calculation of **Delta E**:
$$\Delta E_i = |\text{mean\_abs\_SHAP}(W_{after})_i - \text{mean\_abs\_SHAP}(W_{before})_i|$$
This metric drives the *Feature-Guided Retraining* engine by indicating exactly which feature shifts demand the most model-adaptation attention.

---

## 📄 License
MIT License - feel free to use and adapt this for your own monitoring needs.
