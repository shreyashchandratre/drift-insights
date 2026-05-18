import React, { useEffect, useState } from 'react';
import { Zap, TrendingUp, BarChart2, RefreshCw, HelpCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

export default function DriftTypeClassifier({ classification, driftResult }) {
  if (!classification || !driftResult) return null;

  const type = classification.drift_type;
  const conf = classification.confidence;
  
  const getBadgeStyle = () => {
    switch (type) {
      case 'SUDDEN': return 'bg-red-100 text-red-800 border-red-200';
      case 'GRADUAL': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'INCREMENTAL': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RECURRING': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'SUDDEN': return <Zap size={24} className="text-red-600" />;
      case 'GRADUAL': return <TrendingUp size={24} className="text-orange-600" />;
      case 'INCREMENTAL': return <BarChart2 size={24} className="text-yellow-600" />;
      case 'RECURRING': return <RefreshCw size={24} className="text-purple-600" />;
      default: return <HelpCircle size={24} className="text-gray-600" />;
    }
  };

  const confColor = conf > 0.75 ? 'bg-green-500' : (conf > 0.5 ? 'bg-orange-500' : 'bg-red-500');
  
  let lineData = [];
  if (driftResult.error_signals) {
    lineData = driftResult.error_signals.map((v, i) => ({ x: i, error: v }));
  }

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Drift Type Classification</h3>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${getBadgeStyle()}`}>
            {getIcon()}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">Detected Pattern</p>
              <p className="text-xl font-black">{type}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
              <span>Confidence</span>
              <span>{(conf * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full ${confColor} transition-all duration-1000`} style={{ width: `${conf * 100}%` }} />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-900">
            <span className="font-bold">Recommendation:</span> {classification.recommended_strategy}
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <div className="h-40 bg-slate-50 border border-slate-100 rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip contentStyle={{ fontSize: '12px' }} />
                {driftResult.change_point && (
                  <ReferenceLine x={driftResult.change_point} stroke="#DC2626" strokeDasharray="3 3" />
                )}
                {type === 'SUDDEN' && driftResult.change_point && (
                  <ReferenceArea x1={Math.max(0, driftResult.change_point - 10)} x2={Math.min(lineData.length, driftResult.change_point + 10)} fill="red" fillOpacity={0.1} />
                )}
                {type === 'GRADUAL' && (
                  <ReferenceArea x1={0} x2={lineData.length} fill="orange" fillOpacity={0.1} />
                )}
                <Line type="monotone" dataKey="error" stroke="#334155" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <p className="text-slate-500 font-bold mb-1">Error Jump</p>
              <p className="font-medium">{classification.evidence.error_rate_jump !== null ? classification.evidence.error_rate_jump.toFixed(3) : 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <p className="text-slate-500 font-bold mb-1">Trend Slope</p>
              <p className="font-medium">{classification.evidence.slope !== null ? classification.evidence.slope.toFixed(4) : 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <p className="text-slate-500 font-bold mb-1">R-Squared</p>
              <p className="font-medium">{classification.evidence.r_squared !== null ? classification.evidence.r_squared.toFixed(2) : 'N/A'}</p>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <p className="text-slate-500 font-bold mb-1">History Match</p>
              <p className="font-medium">{classification.evidence.recurring_match_event_id ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
