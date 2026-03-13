
import React from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';

interface Props {
  onBack: () => void;
  onOpenFilter: () => void;
  dateLabel: string;
}

export const TripBookHeader: React.FC<Props> = ({ onBack, onOpenFilter, dateLabel }) => {
  return (
    <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-slate-100 dark:border-slate-800/50 shadow-sm mb-6 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={onBack}>
            <div className="p-3 rounded-[1.2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm active:scale-90 transition-all group-hover:border-indigo-500">
              <ArrowLeft size={22} strokeWidth={3} className="text-slate-600 dark:text-slate-300"/>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Trip Manager</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Cloud Ledger System</p>
            </div>
          </div>
          <button 
            onClick={onOpenFilter} 
            className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 active:scale-95 transition-all"
          >
            <CalendarDays size={16} /> {dateLabel}
          </button>
        </div>
    </div>
  );
};
