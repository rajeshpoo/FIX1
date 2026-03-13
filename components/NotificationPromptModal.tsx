import React from 'react';
import { createPortal } from 'react-dom';
import { X, BellRing, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEnable: () => void;
}

export const NotificationPromptModal: React.FC<Props> = ({ isOpen, onClose, onEnable }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 animate-fade-in font-sans">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 rounded-[2.5rem] p-8 text-center shadow-2xl animate-pop-in border border-slate-100 dark:border-white/5 overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500"></div>

        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30 transform rotate-3">
            <BellRing size={36} strokeWidth={2.5} />
        </div>

        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">
            Enable Smart Alerts
        </h3>
        
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-8 px-4">
            Get timely reminders for document expiries to avoid heavy RTO fines.
        </p>

        <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left">Real-time RC, Insurance & Permit alerts.</span>
            </div>
             <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 text-left">We don't send promotional spam. Ever.</span>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
            <button 
                onClick={onEnable} 
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-indigo-700"
            >
                Enable Alerts
            </button>
            <button 
                onClick={onClose} 
                className="py-3 rounded-2xl bg-transparent text-slate-400 font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-100 dark:hover:bg-slate-900"
            >
                Maybe Later
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};