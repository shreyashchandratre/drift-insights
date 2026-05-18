import React from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function PhaseClassify({ shapResult, onNext }) {
  if (!shapResult) return null;

  const { delta_e_total, severity } = shapResult;
  const isMinor = severity?.severity === 'MINOR';
  const isMod = severity?.severity === 'MODERATE';
  const isSev = severity?.severity === 'SEVERE';

  return (
    <div className="panel-card p-6 border-l-4 border-l-[#D97706] ring-2 ring-[#D97706]/10 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#D97706]" /> Phase 4: Severity Classification
        </h2>
        <button onClick={onNext} className="text-xs font-bold text-[#D97706] hover:bg-amber-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
          Proceed to Retrain <ArrowRight size={14} />
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-center">
        <div className="col-span-1 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="text-5xl font-black text-slate-900 mb-2">{delta_e_total?.toFixed(3)}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Delta E Norm</div>
          <div className={`mt-5 px-4 py-1.5 font-black text-sm rounded-full border ${isMinor ? 'bg-green-100 text-green-800 border-green-300' : isMod ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
            {severity?.severity}
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-xl">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Decision Matrix</h3>
          <div className="space-y-2">
            <div className={`flex items-center p-3 rounded-xl transition-all ${isMinor ? 'border-2 border-[#059669] bg-green-50 shadow-sm scale-[1.02]' : 'border border-slate-100 bg-slate-50 opacity-50 grayscale'}`}>
              <div className={`w-3 h-3 rounded-full bg-[#059669] mr-3 ${isMinor?'animate-pulse':''}`} />
              <div className="flex-1 text-sm"><span className="font-bold">MINOR</span> (&lt; 0.15)</div>
              <div className="text-xs font-mono font-bold bg-white px-2 py-1 rounded">Sample Reweighting</div>
            </div>
            <div className={`flex items-center p-3 rounded-xl transition-all ${isMod ? 'border-2 border-[#D97706] bg-amber-50 shadow-sm scale-[1.02]' : 'border border-slate-100 bg-slate-50 opacity-50 grayscale'}`}>
              <div className={`w-3 h-3 rounded-full bg-[#D97706] mr-3 ${isMod?'animate-pulse':''}`} />
              <div className="flex-1 text-sm"><span className="font-bold">MODERATE</span> (0.15 - 0.40)</div>
              <div className="text-xs font-mono font-bold bg-white px-2 py-1 rounded">Incremental Retrain</div>
            </div>
            <div className={`flex items-center p-3 rounded-xl transition-all ${isSev ? 'border-2 border-[#DC2626] bg-red-50 shadow-sm scale-[1.02]' : 'border border-slate-100 bg-slate-50 opacity-50 grayscale'}`}>
              <div className={`w-3 h-3 rounded-full bg-[#DC2626] mr-3 ${isSev?'animate-pulse':''}`} />
              <div className="flex-1 text-sm"><span className="font-bold">SEVERE</span> (&gt; 0.40)</div>
              <div className="text-xs font-mono font-bold bg-white px-2 py-1 rounded">Full Batch Retrain</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
