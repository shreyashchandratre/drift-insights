# 🌌 DriftInsights

**DriftInsights** is an interactive, real-time dashboard designed for **Concept Drift Detection** and **XAI (Explainable AI) analysis**. It provides a seamless pipeline for data scientists and ML engineers to monitor how streaming data affects pre-trained models and interpret why model behavior changes over time using SHAP.

---

## 🚀 5-Step Detection Pipeline

1.  **Model & Baseline Upload**: Load your `.joblib` model and training data to establish a performance baseline.
2.  **New Data Injection**: Simulate synthetic drift or upload real post-deployment CSV streams.
3.  **Drift Detection (ADWIN)**: Automatically pinpoint exact change points in model performance or feature distributions.
4.  **SHAP Explainability**: Compute explanation shifts to see how feature importance has evolved after the drift event.
5.  **Drift Severity Report**: Get a ranked analysis of top drifting features with a severity classification (Minor, Moderate, Severe).

---

## ✨ Key Features

-   **Dual Detection Metrics**: Toggle between **Performance-based** (accuracy/confidence) and **Feature-based** (distribution shift) detection.
-   **Interactive Visualizations**: Real-time histograms, error rate signals, and SHAP delta bar charts.
-   **Automated Interpretation**: Generates a text summary identifying the top feature responsible for the drift.
-   **Demo Mode**: One-click initialization with the Breast Cancer dataset and a pre-trained RandomForest model.
-   **Premium Dark UI**: Modern dashboard built with React and Vite for a high-end visual experience.

---

## 🛠️ Technology Stack

-   **Backend**: FastAPI (Python)
-   **Frontend**: React (Vite), Recharts, Framer Motion
-   **ML & Drift**: River (ADWIN), SHAP, Scikit-learn, Pandas
-   **Icons**: Lucide React

---

## 🏃 Getting Started

### Prerequisites
- Python 3.8+
- Node.js & npm

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt # Or install: fastapi uvicorn river shap pandas scikit-learn joblib xgboost
python app.py
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
│   ├── app.py              # FastAPI Server
│   ├── logic/
│   │   ├── drift_detection.py  # ADWIN Logic
│   │   ├── explainability.py   # SHAP Calculations
│   │   └── data_generation.py  # Simulation Logic
│   └── data/               # Demo Assets
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React Dashboard
│   │   └── App.css         # Custom Styles
│   └── index.html
└── README.md
```

---

## 📊 SHAP Explanation Shift ($\Delta E$)

The core innovation of DriftInsights is the calculation of **Delta E**:
$$\Delta E_i = |\text{mean\_abs\_SHAP}(W_{after})_i - \text{mean\_abs\_SHAP}(W_{before})_i|$$
This metric identifies not just that the data changed, but how the model's "internal logic" changed in response.

---

## 📄 License
MIT License - feel free to use and adapt this for your own monitoring needs.
