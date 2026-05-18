import React from 'react';
import { Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function PhaseDetect({ onDetect, loading, streamData, driftResult }) {
  
  // Format dist data for chart
  let distChartData = [];
  let topFeat = '';
  if (streamData?.dist_data && Object.keys(streamData.dist_data).length > 0) {
    topFeat = Object.keys(streamData.dist_data)[0];
    const data = streamData.dist_data[topFeat];
    distChartData = data.before.map((v, i) => ({ val: i, baseline: v, current: data.after[i] }));
  }

  let lineData = [];
  if (driftResult?.error_signals) {
    lineData = driftResult.error_signals.map((v, i) => ({ x: i, error: v }));
  }

  return (
    <div className="panel-card p-6 border-l-4 border-l-[#0D9488] ring-2 ring-[#0D9488]/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Search size={18} className="text-[#0D9488]" /> Phase 2: Concept Drift Detection (ADWIN)
        </h2>
        <button onClick={onDetect} disabled={loading} className="bg-[#0D9488] text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-[#0F766E] disabled:opacity-50 flex items-center gap-2">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Run ADWIN'}
        </button>
      </div>

      {driftResult && driftResult.drift_detected && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="text-[#DC2626] flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-[#DC2626] font-bold text-sm">DRIFT DETECTED at Sample #{driftResult.change_point}</h3>
            <p className="text-sm text-red-800 mt-1">Pre-drift Error: {(driftResult.pre_drift_error*100).toFixed(1)}% &nbsp;|&nbsp; Post-drift Error: {(driftResult.post_drift_error*100).toFixed(1)}% &nbsp;|&nbsp; Change: <span className="font-bold">+{(driftResult.error_change*100).toFixed(1)}%</span></p>
          </div>
        </div>
      )}
      {driftResult && !driftResult.drift_detected && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-green-800 text-sm font-medium">
          Model Stable — No Drift Detected by ADWIN.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 h-64">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 mb-2">Feature Distribution: {topFeat || 'N/A'}</h4>
          {distChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={distChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                <Area type="monotone" dataKey="baseline" name="Baseline" stroke="#64748b" fill="#64748b" fillOpacity={0.1} />
                <Area type="monotone" dataKey="current" name="Stream" stroke="#0D9488" fill="#0D9488" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="text-xs text-slate-400">Run phase 1 to view data.</div>}
        </div>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 mb-2">ADWIN Running Error Rate</h4>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <YAxis tick={{fontSize: 10, fill: '#64748b'}} width={35} />
                <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                {driftResult.change_point && <ReferenceLine x={driftResult.change_point} stroke="#DC2626" strokeDasharray="3 3" label={{ value: 'Drift', fill: '#DC2626', fontSize: 10, position: 'top' }} />}
                <Line type="stepAfter" dataKey="error" stroke="#0f172a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="text-xs text-slate-400">Run ADWIN to plot error signal.</div>}
        </div>
      </div>
    </div>
  );
}
