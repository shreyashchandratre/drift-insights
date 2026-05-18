import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import * as api from '../api';

export default function EventLog({ open, onClose }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (open) {
      api.getEvents().then(res => setEvents(res.data.reverse())).catch(console.error);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0F172A]/30 backdrop-blur-sm z-[80]" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl bg-white shadow-2xl z-[90] rounded-t-2xl border border-slate-200 flex flex-col h-[60vh]">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <h2 className="font-bold text-[#0F172A] flex items-center gap-2"><Clock size={18} /> System Audit Log</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold px-2">&times;</button>
        </div>
        <div className="overflow-y-auto p-4 flex-1 bg-slate-50/50">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="text-[10px] uppercase bg-slate-100 text-slate-500 sticky top-0">
              <tr><th className="py-2 px-3 rounded-l-lg">Time</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Details</th><th className="py-2 px-3 rounded-r-lg">ID</th></tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 px-3 font-mono font-bold text-[#6C63FF]">{e.type}</td>
                  <td className="py-2 px-3"><pre className="m-0 font-sans text-[10px] whitespace-pre-wrap">{JSON.stringify(e.payload)}</pre></td>
                  <td className="py-2 px-3 font-mono text-[9px] text-slate-400">{e.id}</td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-slate-400">No events logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </motion.div>
    </>
  );
}
