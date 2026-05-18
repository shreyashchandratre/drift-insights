import React, { useRef } from 'react';
import { Upload, Database, RefreshCw } from 'lucide-react';
import BaselineReport from './BaselineReport';

export default function PhaseUpload({ onUpload, onDemo, loading, modelInfo, report }) {
  const modelRef = useRef();
  const csvRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modelRef.current.files[0] && csvRef.current.files[0]) {
      onUpload(modelRef.current.files[0], csvRef.current.files[0]);
    }
  };

  return (
    <div className="panel-card p-6 border-l-4 border-l-[#6C63FF] ring-2 ring-[#6C63FF]/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Upload size={18} className="text-[#6C63FF]" /> Phase 0: System Initialization
        </h2>
        {modelInfo && <span className="bg-[#059669]/10 text-[#059669] text-xs font-bold px-2 py-1 rounded">LOADED</span>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <Database className="mx-auto text-slate-400 mb-2" size={32} />
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Model (.joblib, .pkl)</label>
              <input type="file" ref={modelRef} required className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6C63FF]/10 file:text-[#6C63FF] hover:file:bg-[#6C63FF]/20" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Baseline CSV</label>
              <input type="file" ref={csvRef} required className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6C63FF]/10 file:text-[#6C63FF] hover:file:bg-[#6C63FF]/20" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:border-[#6C63FF] disabled:opacity-50">
              Upload Files
            </button>
            <button type="button" onClick={onDemo} disabled={loading} className="flex-1 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-[#5B54E6] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Use Demo Data'}
            </button>
          </div>
        </form>

        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Current Pipeline Assets</h3>
          {modelInfo ? (
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100"><td className="py-2.5 text-slate-500">Model Type</td><td className="py-2.5 font-medium text-slate-800 text-right">{modelInfo.model_type}</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2.5 text-slate-500">Feature Count</td><td className="py-2.5 font-medium text-slate-800 text-right">{modelInfo.num_features}</td></tr>
                <tr><td className="py-2.5 text-slate-500">Base Accuracy</td><td className="py-2.5 font-bold text-[#059669] text-right">{(modelInfo.baseline_accuracy*100).toFixed(1)}%</td></tr>
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400 italic py-10">No assets loaded yet.</div>
          )}
        </div>
      </div>
      {report && <BaselineReport report={report} />}
    </div>
  );
}
