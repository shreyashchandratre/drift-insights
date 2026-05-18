import React, { useState, useCallback } from 'react';
import { Activity, Settings, Play, RefreshCw, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from './api';
import Stepper from './components/Stepper';
import SettingsDrawer from './components/SettingsDrawer';
import PhaseUpload from './components/PhaseUpload';
import PhaseStream from './components/PhaseStream';
import PhaseDetect from './components/PhaseDetect';
import PhaseExplain from './components/PhaseExplain';
import PhaseClassify from './components/PhaseClassify';
import PhaseRetrain from './components/PhaseRetrain';
import PhaseMonitor from './components/PhaseMonitor';
import EventLog from './components/EventLog';
import DriftTypeClassifier from './components/DriftTypeClassifier';

export default function App() {
  const [phase, setPhase] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  // Pipeline data
  const [modelInfo, setModelInfo] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [driftResult, setDriftResult] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [shapResult, setShapResult] = useState(null);
  const [adaptResult, setAdaptResult] = useState(null);
  const [settings, setSettings] = useState({
    adwin_delta: 0.002, minor_threshold: 0.15,
    severe_threshold: 0.40, validation_threshold: 0.80,
    cooldown_samples: 500, window_size: 200
  });

  const advance = (p) => {
    setCompleted(prev => [...new Set([...prev, phase])]);
    setPhase(p);
  };

  const handleDemo = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.initDemo();
      setModelInfo(r.data);
      advance(1);
    } catch (e) { setError('Demo init failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setLoading(false); }
  }, [phase]);

  const handleUpload = useCallback(async (modelFile, csvFile) => {
    setLoading(true); setError(null);
    const fd = new FormData();
    fd.append('model_file', modelFile);
    fd.append('csv_file', csvFile);
    try {
      const r = await api.uploadModel(fd);
      setModelInfo(r.data);
      advance(1);
    } catch (e) { setError('Upload failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setLoading(false); }
  }, [phase]);

  const handleStream = useCallback(async (mode, opts) => {
    setLoading(true); setError(null);
    try {
      let r;
      if (mode === 'simulate') {
        r = await api.simulateDrift(opts.shift, opts.numFeatures);
      } else {
        const fd = new FormData();
        fd.append('csv_file', opts.file);
        r = await api.uploadNewData(fd);
      }
      setStreamData(r.data);
      advance(2);
    } catch (e) { setError('Streaming failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setLoading(false); }
  }, [phase]);

  const handleDetect = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.detectDrift(settings.adwin_delta);
      setDriftResult(r.data);
      if (r.data.drift_detected) {
        try {
          const classRes = await api.classifyDriftType({
            error_rate_series: r.data.error_signals,
            change_point_index: r.data.change_point,
            top_k_features: [],
            drift_history: []
          });
          setClassificationResult(classRes.data);
        } catch (e) { console.error('Classification failed:', e); }
      }
      advance(3);
    } catch (e) { setError('Detection failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setLoading(false); }
  }, [phase, settings]);

  const handleShap = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.runShap();
      setShapResult(r.data);
      advance(4);
    } catch (e) { setError('SHAP failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setLoading(false); }
  }, [phase]);

  const handleAdapt = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const payload = {
        severity: shapResult?.severity?.severity || 'MODERATE',
        top_k_features: shapResult?.report?.slice(0, 3).map(r => r.feature) || [],
        delta_e_scores: shapResult?.report?.slice(0, 3).reduce((acc, curr) => ({...acc, [curr.feature]: curr.delta_e}), {}) || {},
        window_size: settings.window_size,
        decay_rate: 0.005
      };
      const r = await api.runFeatureGuidedRetrain(payload);
      setAdaptResult(r.data);
      if (r.data.success) {
        setModelInfo(prev => ({ ...prev, model_version: r.data.model_version }));
      }
      advance(6);
    } catch (e) { setError('Adaptation failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setLoading(false); }
  }, [phase]);

  const handleRunFullDemo = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const init = await api.initDemo();
      setModelInfo(init.data);
      setCompleted([0]); setPhase(1);
      await new Promise(r => setTimeout(r, 800));

      const full = await api.runDemoFull();
      const p = full.data.phases;

      setStreamData({ drifted_features: p[0].drifted_features, message: 'Demo drift simulated' });
      setCompleted(c => [...c, 1]); setPhase(2);
      await new Promise(r => setTimeout(r, 600));

      setDriftResult({ drift_detected: p[1].drift_detected, change_point: p[1].change_point,
        pre_drift_error: p[1].pre_drift_error, post_drift_error: p[1].post_drift_error,
        error_change: (p[1].post_drift_error||0) - (p[1].pre_drift_error||0), drift_indices: [p[1].change_point] });
      setCompleted(c => [...c, 2]); setPhase(3);
      await new Promise(r => setTimeout(r, 600));

      setShapResult({ report: p[2].report, delta_e_total: p[2].delta_e_total, severity: p[2].severity, shap_summary: p[2].shap_summary });
      setCompleted(c => [...c, 3]); setPhase(4);
      await new Promise(r => setTimeout(r, 600));

      setCompleted(c => [...c, 4]); setPhase(5);
      await new Promise(r => setTimeout(r, 600));

      setAdaptResult(p[3]);
      setModelInfo(prev => ({ ...prev, model_version: p[3].model_version }));
      setCompleted(c => [...c, 5]); setPhase(6);
    } catch (e) { setError('Demo failed: ' + (e.response?.data?.detail || e.message)); }
    finally { setLoading(false); }
  }, []);

  const reset = () => {
    setPhase(0); setCompleted([]); setModelInfo(null); setStreamData(null);
    setDriftResult(null); setClassificationResult(null); setShapResult(null); setAdaptResult(null); setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#6C63FF] p-2 rounded-lg text-white"><Activity size={20} /></div>
          <div>
            <h1 className="text-lg font-bold text-[#0F172A] leading-tight">DriftInsights</h1>
            <p className="text-xs text-[#64748B]">Explainable Drift-Aware Adaptive ML Framework</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {modelInfo && <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 text-[#64748B]">
            {modelInfo.model_version || 'M_0'} • {modelInfo.model_type}
          </span>}
          <button onClick={() => setEventsOpen(true)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded border border-slate-200 text-[#64748B] transition-colors">
            <Clock size={14} className="inline mr-1" />Event Log
          </button>
          <button onClick={handleRunFullDemo} disabled={loading}
            className="flex items-center gap-2 bg-[#6C63FF] hover:bg-[#5B54E6] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? 'Running...' : 'Run Full Demo'}
          </button>
          <button onClick={() => setSettingsOpen(true)} className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <Stepper phase={phase} completed={completed} onSelect={setPhase} />

      <main className="max-w-6xl mx-auto mt-6 px-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2 cursor-pointer" onClick={() => setError(null)}>
            ⚠️ {error} <span className="ml-auto text-xs text-red-400">Click to dismiss</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={phase} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            {phase === 0 && <PhaseUpload onUpload={handleUpload} onDemo={handleDemo} loading={loading} modelInfo={modelInfo} />}
            {phase === 1 && <PhaseStream onStream={handleStream} loading={loading} modelInfo={modelInfo} features={modelInfo?.features || []} />}
            {phase === 2 && (
              <>
                <PhaseDetect onDetect={handleDetect} loading={loading} streamData={streamData} driftResult={driftResult} />
                {classificationResult && <DriftTypeClassifier classification={classificationResult} driftResult={driftResult} />}
              </>
            )}
            {phase === 3 && <PhaseExplain onRunShap={handleShap} loading={loading} driftResult={driftResult} shapResult={shapResult} />}
            {phase === 4 && <PhaseClassify shapResult={shapResult} onNext={() => advance(5)} />}
            {phase === 5 && <PhaseRetrain onAdapt={handleAdapt} loading={loading} shapResult={shapResult} adaptResult={adaptResult} />}
            {phase === 6 && <PhaseMonitor modelInfo={modelInfo} driftResult={driftResult} shapResult={shapResult} adaptResult={adaptResult} onReset={reset} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} setSettings={setSettings} />
      <EventLog open={eventsOpen} onClose={() => setEventsOpen(false)} />
    </div>
  );
}
