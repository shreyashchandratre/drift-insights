import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Target, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function FeatureGuidedAnalysis({ adaptResult }) {
  if (!adaptResult || !adaptResult.validation_accuracy_feature_guided) return null;

  const {
    winner,
    validation_accuracy_feature_guided: accFG,
    validation_accuracy_standard: accStd,
    improvement,
    top_k_features_used,
    final_weights
  } = adaptResult;

  const fgWins = winner === 'feature_guided';

  const accuracyData = [
    { name: 'Standard', accuracy: accStd * 100 },
    { name: 'Feature-Guided', accuracy: accFG * 100 }
  ];

  // For scatter plot, sample a few points if there are too many
  const sampledWeights = final_weights ? final_weights.slice(-200).map((w, i) => ({
    index: final_weights.length - 200 + i,
    weight: w,
    intensity: w > 1.5 ? 'high' : (w > 1.0 ? 'medium' : 'low')
  })) : [];

  return (
    <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-[#6C63FF]" size={20} />
        <h3 className="text-md font-bold text-slate-800">Feature-Guided Retraining Analysis</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-4">
        {/* Comparison Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 text-center">Feature-Guided vs Standard Accuracy</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} tickFormatter={v => `${v.toFixed(1)}%`} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {accuracyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry.name === 'Feature-Guided' && fgWins) || (entry.name === 'Standard' && !fgWins) ? '#10B981' : '#94A3B8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weight Distribution Scatter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 text-center">Sample Weight Distribution (Recent)</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis type="number" dataKey="index" name="Sample Index" tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="weight" name="Weight" tick={{ fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={sampledWeights} fill="#6C63FF">
                  {sampledWeights.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.intensity === 'high' ? '#EF4444' : (entry.intensity === 'medium' ? '#F59E0B' : '#3B82F6')} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-4">
        {/* Winner Badge */}
        <div className="flex flex-col justify-center">
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${fgWins ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            {fgWins ? <CheckCircle2 className="text-green-600 mt-1" size={24} /> : <AlertCircle className="text-amber-600 mt-1" size={24} />}
            <div>
              <h4 className={`font-bold ${fgWins ? 'text-green-900' : 'text-amber-900'}`}>
                {fgWins ? `Feature-Guided Retraining outperformed Standard by ${improvement}` : 'Standard Retraining was retained this time'}
              </h4>
              <p className={`text-sm mt-1 ${fgWins ? 'text-green-700' : 'text-amber-700'}`}>
                Candidate model M_t+1 was deployed based on validation accuracy.
              </p>
            </div>
          </div>
          
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 flex items-start gap-2">
            <Info size={16} className="text-[#6C63FF] mt-0.5 shrink-0" />
            <p>
              Feature-Guided Retraining assigns higher influence to samples where the most drift-affected features vary most significantly, making the retrained model more focused on learning the new patterns that caused drift.
            </p>
          </div>
        </div>

        {/* Feature Weights Table */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Feature Contribution to Weights</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs">
                <tr>
                  <th className="px-3 py-2 rounded-tl-lg">Feature Name</th>
                  <th className="px-3 py-2 text-right">Delta E</th>
                  <th className="px-3 py-2 rounded-tr-lg">Role</th>
                </tr>
              </thead>
              <tbody>
                {top_k_features_used?.map((feat, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-800">{feat.feature}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{feat.delta_e.toFixed(4)}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full whitespace-nowrap">Weight Anchor</span>
                    </td>
                  </tr>
                ))}
                {(!top_k_features_used || top_k_features_used.length === 0) && (
                  <tr><td colSpan="3" className="px-3 py-4 text-center text-slate-400 italic text-xs">No specific feature weights applied</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
