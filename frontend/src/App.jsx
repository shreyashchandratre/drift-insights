import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  FileText, 
  ChevronRight, 
  Download, 
  RefreshCw,
  Info,
  CheckCircle2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
  AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data State
  const [modelInfo, setModelInfo] = useState(null);
  const [driftSimulation, setDriftSimulation] = useState(null);
  const [driftResults, setDriftResults] = useState(null);
  const [shapResults, setShapResults] = useState(null);
  
  // Simulation params
  const [shiftAmount, setShiftAmount] = useState(1.0);

  const steps = [
    { id: 1, label: 'Upload', icon: <Upload size={18} /> },
    { id: 2, label: 'Inject Data', icon: <Activity size={18} /> },
    { id: 3, label: 'Detect Drift', icon: <AlertTriangle size={18} /> },
    { id: 4, label: 'SHAP Analysis', icon: <BarChart3 size={18} /> },
    { id: 5, label: 'Report', icon: <FileText size={18} /> }
  ];

  const handleDemoMode = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/demo-mode`);
      setModelInfo(res.data);
      setStep(2);
    } catch (err) {
      setError("Failed to initialize demo mode");
    } finally {
      setLoading(false);
    }
  };

  const handleModelUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('model_file', e.target.model.files[0]);
    formData.append('csv_file', e.target.csv.files[0]);
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/upload-model`, formData);
      setModelInfo(res.data);
      setStep(2);
    } catch (err) {
      setError("Upload failed. Check file formats.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewDataUpload = async (e) => {
    e.preventDefault();
    const file = e.target.new_csv.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('csv_file', file);
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/upload-new-data`, formData);
      setDriftSimulation(res.data);
      setStep(3);
    } catch (err) {
      setError("New data upload failed. Check schema compatibility.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDrift = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('shift_amount', shiftAmount);
      const res = await axios.post(`${API_BASE}/simulate-drift`, formData);
      setDriftSimulation(res.data);
      setStep(3);
    } catch (err) {
      setError("Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const [detectionMetric, setDetectionMetric] = useState('performance');

  const handleDetectDrift = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('metric', detectionMetric);
      const res = await axios.post(`${API_BASE}/detect-drift`, formData);
      setDriftResults(res.data);
      setStep(4);
      // Automatically trigger SHAP after a small delay
      setTimeout(() => triggerShap(), 1000);
    } catch (err) {
      setError("Detection failed");
      setLoading(false);
    }
  };

  const triggerShap = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/shap-analysis`);
      setShapResults(res.data);
      setStep(5);
    } catch (err) {
      setError("SHAP analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!shapResults) return;
    const headers = "Feature,SHAP Before,SHAP After,Delta E,Direction\n";
    const rows = shapResults.report.map(r => 
      `${r.feature},${r.shap_before.toFixed(4)},${r.shap_after.toFixed(4)},${r.delta_e.toFixed(4)},${r.direction}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drift_report.csv';
    a.click();
  };

  return (
    <div className="app-container">
      <header>
        <h1>DriftInsights</h1>
        <p className="subtitle">Real-time Concept Drift Detection & XAI Pipeline</p>
      </header>

      {/* Progress Indicator */}
      <div className="progress-container">
        {steps.map(s => (
          <div key={s.id} className={`progress-step ${step === s.id ? 'active' : ''} ${step > s.id ? 'completed' : ''}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {s.icon} {s.label}
            </span>
          </div>
        ))}
      </div>

      <main>
        {error && (
          <div className="alert alert-danger" onClick={() => setError(null)}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="panel"
            >
              <h2 className="panel-title"><Upload /> Step 1: Model & Baseline Data</h2>
              <form onSubmit={handleModelUpload}>
                <div className="file-input-group">
                  <label>Pre-trained Model (.joblib / .pkl)</label>
                  <input type="file" name="model" required />
                </div>
                <div className="file-input-group">
                  <label>Baseline CSV Dataset (Training Data)</label>
                  <input type="file" name="csv" required />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <RefreshCw className="spinner-icon" /> : 'Upload & Initialize'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleDemoMode} disabled={loading}>
                    Try Demo Mode
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="panel"
            >
              <h2 className="panel-title"><Activity /> Step 2: New Data Injection</h2>
              <div className="alert alert-success">
                <CheckCircle2 size={20} />
                Model Loaded: {modelInfo.model_type} | Features: {modelInfo.num_features}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '2rem' }}>
                  <h3>Option A: Simulate Drift</h3>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label>Drift Intensity (Shift Mean): {shiftAmount}</label>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="2.0" 
                      step="0.1" 
                      value={shiftAmount} 
                      onChange={(e) => setShiftAmount(e.target.value)} 
                      style={{ width: '100%', accentColor: 'var(--purple-main)' }}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleSimulateDrift} disabled={loading}>
                    Simulate Drift
                  </button>
                </div>

                <div>
                  <h3>Option B: Upload New Stream</h3>
                  <form onSubmit={handleNewDataUpload}>
                    <div className="file-input-group">
                      <label>New Incoming CSV File</label>
                      <input type="file" name="new_csv" required />
                    </div>
                    <button type="submit" className="btn btn-secondary" disabled={loading}>
                      Upload CSV Data
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="panel"
            >
              <h2 className="panel-title"><AlertTriangle /> Step 3: Drift Detection</h2>
              <p>Monitoring prediction error rates across the incoming stream...</p>
              
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <label>Detection Metric</label>
                  <select 
                    value={detectionMetric} 
                    onChange={(e) => setDetectionMetric(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  >
                    <option value="performance">Performance (Error Rate / Confidence)</option>
                    <option value="feature">Feature Drift (Distribution Shift)</option>
                  </select>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                    {detectionMetric === 'performance' 
                      ? "Best for detecting 'Concept Drift' where model accuracy actually drops." 
                      : "Best for detecting 'Covariate Shift' where data distributions change but model might still be accurate."}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={handleDetectDrift} disabled={loading} style={{ height: '45px' }}>
                  Run {detectionMetric === 'performance' ? 'ADWIN' : 'Feature'} Analysis
                </button>
              </div>

              {driftSimulation && driftSimulation.dist_data && (
                <div className="chart-container" style={{ marginTop: '2rem', height: 'auto' }}>
                  <h3>Feature Distribution Shift (Top 3 Drifting)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    {driftSimulation.drifted_features.map(feat => (
                      <div key={feat} style={{ height: '200px' }}>
                        <p style={{ fontSize: '0.8rem', textAlign: 'center' }}>{feat}</p>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={driftSimulation.dist_data[feat].before.slice(0, 50).map((v, i) => ({ 
                            index: i, 
                            before: v, 
                            after: driftSimulation.dist_data[feat].after[i] 
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <Tooltip contentStyle={{ backgroundColor: '#1b1b3a', border: 'none' }} />
                            <Area type="monotone" dataKey="before" stroke="var(--teal-accent)" fill="var(--teal-accent)" fillOpacity={0.1} />
                            <Area type="monotone" dataKey="after" stroke="var(--purple-main)" fill="var(--purple-main)" fillOpacity={0.1} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {(step === 4 || (step === 5 && loading)) && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="panel"
            >
              <div className="loading-overlay">
                <div className="spinner"></div>
                <h2 style={{ marginTop: '1.5rem' }}>Computing SHAP Explainability Shift...</h2>
                <p style={{ color: 'var(--text-dim)' }}>Analyzing model internal logic changes</p>
              </div>

              {driftResults && (
                <div className="chart-container">
                  <h3>{detectionMetric === 'performance' ? 'Model Error Rate Signal' : 'Feature Distribution Signal'}</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={driftResults.error_signals.map((v, i) => ({ x: i, y: v }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="x" hide />
                      <YAxis domain={[0, 1]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="y" stroke="var(--amber-accent)" dot={false} strokeWidth={2} />
                      {driftResults.drift_indices.map(idx => (
                        <ReferenceLine key={idx} x={idx} stroke="var(--red-accent)" label={{ value: 'Drift', position: 'top', fill: 'var(--red-accent)' }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>
          )}

          {step === 5 && !loading && shapResults && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel"
            >
              <h2 className="panel-title"><FileText /> Step 5: Feature Importance Report</h2>
              
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div className={`alert ${driftResults.drift_indices.length > 0 ? 'alert-warning' : 'alert-success'}`} style={{ flex: 1 }}>
                  <Info size={20} />
                  <div>
                    <strong>Drift Status:</strong> {driftResults.drift_indices.length > 0 ? `Detected at sample ${driftResults.drift_indices[0]}` : "No Significant Drift"}
                    <br />
                    Pre-drift Error: {(driftResults.pre_drift_error * 100).toFixed(1)}% | Post-drift Error: {(driftResults.post_drift_error * 100).toFixed(1)}%
                  </div>
                </div>
                
                <div className="alert" style={{ background: 'rgba(255,255,255,0.05)', flex: 0.5 }}>
                  <strong>Severity Index:</strong>
                  <span className={`badge ${shapResults.delta_e_total < 0.15 ? 'badge-minor' : shapResults.delta_e_total < 0.40 ? 'badge-moderate' : 'badge-severe'}`}>
                    {shapResults.delta_e_total < 0.15 ? 'MINOR' : shapResults.delta_e_total < 0.40 ? 'MODERATE' : 'SEVERE'}
                  </span>
                  <span style={{ marginLeft: '10px' }}>ΔE = {shapResults.delta_e_total.toFixed(3)}</span>
                </div>
              </div>

              <div className="chart-container" style={{ height: '400px', marginTop: '2rem' }}>
                <h3>Feature Importance Shift (Delta E)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shapResults.report.slice(0, 10)} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="var(--text-dim)" />
                    <YAxis dataKey="feature" type="category" stroke="var(--text-dim)" fontSize={11} width={120} />
                    <Tooltip contentStyle={{ backgroundColor: '#1b1b3a', border: 'none' }} />
                    <Bar dataKey="delta_e" radius={[0, 4, 4, 0]}>
                      {shapResults.report.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.direction === 'Up' ? 'var(--red-accent)' : 'var(--blue-accent)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <p>
                  <strong>Summary:</strong> The top drifting feature is <span style={{color: 'var(--purple-main)'}}>{shapResults.report[0].feature}</span> with a Delta E of {shapResults.report[0].delta_e.toFixed(3)}, indicating the model has become <strong>{shapResults.report[0].direction === 'Up' ? 'more' : 'less'}</strong> reliant on this feature after the drift event.
                </p>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Feature Name</th>
                    <th>SHAP Before</th>
                    <th>SHAP After</th>
                    <th>Delta E</th>
                    <th>Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {shapResults.report.slice(0, 5).map(r => (
                    <tr key={r.feature}>
                      <td>{r.feature}</td>
                      <td>{r.shap_before.toFixed(4)}</td>
                      <td>{r.shap_after.toFixed(4)}</td>
                      <td>{r.delta_e.toFixed(4)}</td>
                      <td>
                        {r.direction === 'Up' ? 
                          <span style={{color: 'var(--red-accent)', display: 'flex', alignItems: 'center', gap: '4px'}}><ArrowUp size={14}/> Up</span> : 
                          <span style={{color: 'var(--blue-accent)', display: 'flex', alignItems: 'center', gap: '4px'}}><ArrowDown size={14}/> Down</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={downloadCSV}>
                  <Download size={18} /> Download Full Report
                </button>
                <button className="btn btn-outline" onClick={() => setStep(1)}>
                  <RefreshCw size={18} /> Restart Pipeline
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
