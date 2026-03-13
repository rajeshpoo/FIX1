
import React from 'react';
import { Download, X, Smartphone, Zap } from 'lucide-react';

interface Props {
  onInstall: () => void;
  onDismiss: () => void;
}

export const InstallAppCard: React.FC<Props> = ({ onInstall, onDismiss }) => {
  return (
    <div className="mb-6 relative group animate-slide-up mx-1">
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
      
      <div className="relative bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 border border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-between overflow-hidden">
        
        {/* Background Decor */}
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] rotate-12 pointer-events-none">
            <Smartphone size={100} />
        </div>

        <div className="flex items-center gap-4 z-10">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Download size={24} strokeWidth={2.5} className="animate-bounce" />
            </div>
            <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Install App</h3>
                    <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Free</span>
                </div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Zap size={10} className="text-amber-500 fill-amber-500" /> Faster • Offline Mode
                </p>
            </div>
        </div>

        <div className="flex items-center gap-2 z-10">
            <button 
                onClick={onInstall}
                className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-2 hover:bg-indigo-700"
            >
                Get <Smartphone size={12} />
            </button>
            <button 
                onClick={onDismiss}
                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90"
            >
                <X size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};
