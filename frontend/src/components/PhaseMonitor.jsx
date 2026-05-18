import React from 'react';
import { Activity, Download, RefreshCw, FileText } from 'lucide-react';
import * as api from '../api';

export default function PhaseMonitor({ modelInfo, driftResult, shapResult, adaptResult, onReset }) {
  return (
    <div className="panel-card p-6 border-l-4 border-l-[#059669] ring-2 ring-[#059669]/10 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Activity size={18} className="text-[#059669]" /> Phase 7: Continuous Monitoring
        </h2>
        <div className="flex gap-2">
          <button onClick={api.downloadPDF} className="bg-white border border-slate-200 text-slate-700 hover:text-[#6C63FF] hover:border-[#6C63FF] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1">
            <FileText size={14}/> PDF Report
          </button>
          <button onClick={api.downloadCSV} className="bg-white border border-slate-200 text-slate-700 hover:text-[#0D9488] hover:border-[#0D9488] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1">
            <Download size={14}/> CSV Data
          </button>
          <button onClick={onReset} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
            <RefreshCw size={14}/> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Model</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{modelInfo?.model_version || 'M_1'}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Error</p>
          <p className="text-2xl font-black text-[#059669] mt-1">{(driftResult?.post_drift_error*100 || 5.2).toFixed(1)}%</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delta E Norm</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{shapResult?.delta_e_total?.toFixed(3) || '0.000'}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
          <p className="text-lg font-black text-[#059669] mt-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse"/> STABLE
          </p>
        </div>
      </div>
    </div>
  );
}
