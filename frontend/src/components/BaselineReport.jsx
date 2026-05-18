import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

export default function BaselineReport({ report }) {
  if (!report) return null;

  const shapData = report.feature_rankings.slice(0, 10).map(f => ({
    name: f.feature,
    value: f.shap_importance
  }));

  return (
    <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="text-purple-600" size={20} />
        <h3 className="text-lg font-bold text-slate-800">Model Health Baseline Report</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Model Type</p>
          <p className="text-lg font-bold text-slate-800">{report.model_type}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Features</p>
          <p className="text-lg font-bold text-slate-800">{report.n_features}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Base Accuracy</p>
          <p className="text-lg font-bold text-[#059669]">{(report.baseline_accuracy * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Low Confidence</p>
          <p className="text-lg font-bold text-amber-600">{report.low_confidence_sample_count} samples</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 mb-4">SHAP Feature Importance Baseline</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-500" /> Top Drift Vulnerabilities
            </h4>
            <div className="space-y-2">
              {report.vulnerability_ranking.slice(0, 3).map((v, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-100">
                  <span className="text-sm font-medium text-red-900">{v.feature}</span>
                  <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded">Score: {v.vulnerability_score.toFixed(4)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 italic">These features are highly susceptible to causing significant model behavior change if their distribution shifts.</p>
          </div>

          {(report.dominant_feature_warning || report.low_impact_features.length > 0) && (
            <div className="space-y-2">
              {report.dominant_feature_warning && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Dominant Feature Warning:</span> {report.dominant_feature_warning}
                  </div>
                </div>
              )}
              {report.low_impact_features.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800">
                  <span className="font-bold">Low Impact Features ({report.low_impact_features.length}):</span> Consider removing them in future versions.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-green-600" />
          <div>
            <p className="text-sm font-bold text-green-900">Baseline locked successfully.</p>
            <p className="text-xs text-green-700">SHAP reference vector is now active for Delta E computation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
