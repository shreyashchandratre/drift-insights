import React, { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export default function PhaseStream({ onStream, loading, features }) {
  const [shift, setShift] = useState(1.5);
  const [numFeatures, setNumFeatures] = useState(3);
  const [file, setFile] = useState(null);

  return (
    <div className="panel-card p-6 border-l-4 border-l-[#0D9488] ring-2 ring-[#0D9488]/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Activity size={18} className="text-[#0D9488]" /> Phase 1: Streaming Ingestion
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Simulate Concept Drift</h3>
          <p className="text-xs text-slate-500">Injects Gaussian mean shift into selected features to simulate real-world data drift.</p>
          <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <label className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Drift Magnitude (Shift)</span><span className="font-mono text-[#0D9488]">{shift}</span>
              </label>
              <input type="range" min="0.1" max="3.0" step="0.1" value={shift} onChange={(e)=>setShift(e.target.value)} className="w-full accent-[#0D9488]" />
            </div>
            <div>
              <label className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Features Affected</span><span className="font-mono text-[#0D9488]">{numFeatures} / {features.length}</span>
              </label>
              <input type="range" min="1" max={Math.max(1, features.length)} step="1" value={numFeatures} onChange={(e)=>setNumFeatures(e.target.value)} className="w-full accent-[#0D9488]" />
            </div>
            <button onClick={() => onStream('simulate', { shift, numFeatures })} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded text-sm font-medium hover:bg-[#0F766E] flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Simulate Drift'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Upload Data Stream</h3>
          <p className="text-xs text-slate-500">Provide a new dataset representing post-deployment streaming data.</p>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
             <input type="file" onChange={(e)=>setFile(e.target.files[0])} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#0D9488]/10 file:text-[#0D9488]" />
             <button onClick={() => file && onStream('upload', { file })} disabled={!file || loading} className="w-full bg-white border border-slate-300 text-slate-700 py-2 rounded text-sm font-medium hover:border-[#0D9488] hover:text-[#0D9488] flex justify-center items-center gap-2 disabled:opacity-50">
               {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Process Stream'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
