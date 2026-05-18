import React from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import * as api from '../api';

export default function SettingsDrawer({ open, onClose, settings, setSettings }) {
  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(s => ({ ...s, [name]: parseFloat(value) }));
  };

  const handleSave = async () => {
    await api.saveSettings(settings);
    onClose();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm z-[60]" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-[70] border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-[#0F172A] flex items-center gap-2"><Settings size={18} /> Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <label className="text-sm font-bold text-slate-700">ADWIN Delta</label>
            <p className="text-xs text-slate-500 mb-2">Sensitivity of drift detection.</p>
            <input type="range" name="adwin_delta" min="0.001" max="0.1" step="0.001" value={settings.adwin_delta} onChange={handleChange} className="w-full accent-[#6C63FF]" />
            <div className="text-right text-xs font-mono">{settings.adwin_delta}</div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Severe Drift Threshold (ΔE)</label>
            <input type="range" name="severe_threshold" min="0" max="1" step="0.05" value={settings.severe_threshold} onChange={handleChange} className="w-full accent-[#DC2626]" />
            <div className="text-right text-xs font-mono">{settings.severe_threshold}</div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Moderate Drift Threshold (ΔE)</label>
            <input type="range" name="minor_threshold" min="0" max="1" step="0.05" value={settings.minor_threshold} onChange={handleChange} className="w-full accent-[#D97706]" />
            <div className="text-right text-xs font-mono">{settings.minor_threshold}</div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Cooldown Period</label>
            <input type="number" name="cooldown_samples" value={settings.cooldown_samples} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded text-sm mt-1" />
          </div>
        </div>
        <div className="p-4 border-t border-slate-200">
          <button onClick={handleSave} className="w-full bg-[#6C63FF] text-white py-2 rounded-lg font-medium hover:bg-[#5B54E6]">Save Configuration</button>
        </div>
      </motion.div>
    </>
  );
}
