import React from 'react';
import { Upload, Activity, Search, BarChart3, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';

const PHASES = [
  { id: 0, label: 'Upload', color: 'purple', icon: <Upload size={16} /> },
  { id: 1, label: 'Stream', color: 'teal', icon: <Activity size={16} /> },
  { id: 2, label: 'Detect', color: 'teal', icon: <Search size={16} /> },
  { id: 3, label: 'Explain', color: 'amber', icon: <BarChart3 size={16} /> },
  { id: 4, label: 'Classify', color: 'amber', icon: <ShieldAlert size={16} /> },
  { id: 5, label: 'Retrain', color: 'purple', icon: <Cpu size={16} /> },
  { id: 6, label: 'Monitor', color: 'green', icon: <Activity size={16} /> }
];

const STYLES = {
  purple: 'text-[#6C63FF] border-[#6C63FF] bg-[#6C63FF]/10',
  teal: 'text-[#0D9488] border-[#0D9488] bg-[#0D9488]/10',
  amber: 'text-[#D97706] border-[#D97706] bg-[#D97706]/10',
  green: 'text-[#059669] border-[#059669] bg-[#059669]/10',
  default: 'text-slate-400 border-slate-200 bg-white'
};

export default function Stepper({ phase, completed, onSelect }) {
  const getBadge = (pid) => {
    if (phase === pid) return STYLES[PHASES[pid].color];
    if (completed.includes(pid)) return 'text-slate-600 border-slate-300 bg-slate-100';
    return STYLES.default;
  };

  return (
    <div className="max-w-6xl mx-auto mt-6 px-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 right-0 h-0.5 bg-slate-200 top-1/2 -z-10" />
        {PHASES.map((p) => (
          <div key={p.id} onClick={() => completed.includes(p.id) || phase === p.id ? onSelect(p.id) : null}
            className={`flex flex-col items-center gap-2 px-2 bg-[#F8FAFC] transition-all duration-300 ${phase === p.id ? 'scale-110' : ''} ${completed.includes(p.id) || phase === p.id ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${getBadge(p.id)}`}>
              {completed.includes(p.id) && phase !== p.id ? <CheckCircle2 size={18} /> : p.icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${phase === p.id ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
