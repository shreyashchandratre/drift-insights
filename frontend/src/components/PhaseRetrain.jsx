import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import FeatureGuidedAnalysis from './FeatureGuidedAnalysis';

export default function PhaseRetrain({ onAdapt, loading, shapResult, adaptResult }) {
  const [logIdx, setLogIdx] = useState(0);

  useEffect(() => {
    if (loading) {
      setLogIdx(0);
      const i = setInterval(() => setLogIdx(x => (x < 4 ? x + 1 : x)), 500);
      return () => clearInterval(i);
    } else if (adaptResult) {
      setLogIdx(5);
    }
  }, [loading, adaptResult]);

  const strategy = shapResult?.severity?.strategy || 'Waiting...';

  return (
    <div className="panel-card p-6 border-l-4 border-l-[#6C63FF] ring-2 ring-[#6C63FF]/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Cpu size={18} className="text-[#6C63FF]" /> Phase 6: Adaptation Module
        </h2>
        {!adaptResult && (
          <button onClick={onAdapt} disabled={loading} className="bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5B54E6] disabled:opacity-50 flex items-center gap-2 shadow-sm">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Execute Adaptation'}
          </button>
        )}
        {adaptResult && (
          <div className="flex items-center gap-3">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 size={14}/> DEPLOYED
            </span>
            <a 
              href="http://localhost:8000/download-model" 
              className="bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors shadow-sm"
              download
            >
              Download M_t+1
            </a>
          </div>
        )}
      </div>

      <div className="bg-[#0F172A] rounded-xl p-5 font-mono text-xs text-slate-300 shadow-inner overflow-hidden relative min-h-[160px]">
        {loading && <motion.div className="absolute top-0 left-0 h-1 bg-[#6C63FF]" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2.5 }} />}
        
        <div className="space-y-1.5 mt-2">
          <p className="text-slate-400">[SYSTEM] Initiating Strategy: <span className="text-[#6C63FF] font-bold">{strategy}</span></p>
          {logIdx >= 1 && <p>[DATA] Retrieving samples from rolling buffer...</p>}
          {logIdx >= 2 && <p>[MODEL] Initializing adaptation environment...</p>}
          {logIdx >= 3 && <p className="text-white">&gt; Fitting candidate model M_t+1 ...</p>}
          {logIdx >= 4 && <p className="text-white">&gt; Validating against held-out set...</p>}
          
          {adaptResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 bg-white/10 rounded-lg border border-white/20">
              <p className={adaptResult.success ? "font-bold text-[#10B981]" : "font-bold text-[#EF4444]"}>
                {adaptResult.success ? '✓' : '✗'} {adaptResult.validation?.message}
              </p>
              <p className="mt-1 text-slate-400 text-[10px]">Time: {adaptResult.elapsed_seconds?.toFixed(2)}s | Method: {adaptResult.strategy_used}</p>
            </motion.div>
          )}
        </div>
      </div>
      
      {adaptResult && adaptResult.validation_accuracy_feature_guided && (
        <FeatureGuidedAnalysis adaptResult={adaptResult} />
      )}
    </div>
  );
}
