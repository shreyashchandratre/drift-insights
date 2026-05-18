import React from 'react';
import { BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PhaseExplain({ onRunShap, loading, shapResult }) {
  const data = shapResult?.report?.slice(0, 5) || [];
  
  return (
    <div className="panel-card p-6 border-l-4 border-l-[#D97706] ring-2 ring-[#D97706]/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <BarChart3 size={18} className="text-[#D97706]" /> Phase 3: SHAP Explainability
        </h2>
        <button onClick={onRunShap} disabled={loading} className="bg-[#D97706] text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-[#B45309] disabled:opacity-50 flex items-center gap-2">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Compute SHAP Delta'}
        </button>
      </div>

      {loading && <div className="h-48 flex flex-col items-center justify-center text-slate-500"><RefreshCw className="animate-spin mb-2" size={24}/>Computing SHAP values...</div>}
      
      {!loading && !shapResult && <div className="h-48 flex items-center justify-center text-sm text-slate-400 border border-dashed rounded-xl">Run SHAP to analyze model behavior shift.</div>}

      {!loading && shapResult && (
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 h-72 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 mb-4">Explanation Shift Delta E (|SHAP_after| - |SHAP_before|)</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 30, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis dataKey="feature" type="category" tick={{fontSize: 11, fill: '#334155', fontWeight: 600}} width={90} />
                <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                <Bar dataKey="delta_e" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.direction === 'Up' ? '#DC2626' : '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="w-full md:w-64 flex flex-col justify-start space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Top Drifting Feature</h4>
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-amber-900 truncate pr-2">{data[0]?.feature}</span>
                {data[0]?.direction === 'Up' ? <ArrowUpRight className="text-[#DC2626]" size={24} /> : <ArrowDownRight className="text-[#3B82F6]" size={24} />}
              </div>
              <p className="text-xs text-amber-700 mt-2">Model reliance {data[0]?.direction === 'Up' ? 'increased' : 'decreased'} by <span className="font-bold">{data[0]?.delta_e.toFixed(3)}</span> ΔE</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-500 leading-relaxed border border-slate-200 shadow-inner">
              <strong className="text-slate-700">Disclaimer:</strong> Delta E characterises model-level behaviour change — how the model's reliance on features has shifted. It does not assert direct real-world causation of the distributional shift.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
