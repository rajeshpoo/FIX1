
import React from 'react';
import { Plus, Upload, Download, Lock, Zap } from 'lucide-react';

interface Props {
  onStartTrip: () => void;
  onImport: () => void;
  onExport: () => void;
  isPremium: boolean;
}

export const TripBookQuickActions: React.FC<Props> = ({ onStartTrip, onImport, onExport, isPremium }) => {
  return (
    <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
            <Zap size={12} className="text-amber-500 fill-amber-500" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trip Actions</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
            {/* Start Trip */}
            <div 
                onClick={onStartTrip} 
                className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-4 cursor-pointer border border-slate-100 dark:border-white/5 active:scale-95 transition-all aspect-square"
            >
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Plus size={24} strokeWidth={3} />
                </div>
                <span className="text-[9px] font-black uppercase text-center leading-tight text-slate-900 dark:text-slate-300 tracking-wider">Start<br/>Trip</span>
            </div>
            
            {/* Import Data */}
            <div 
                onClick={onImport} 
                className={`bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-4 cursor-pointer border border-slate-100 dark:border-white/5 relative group active:scale-95 transition-all aspect-square ${!isPremium ? 'opacity-80' : ''}`}
            >
                {!isPremium && <div className="absolute top-3 right-3"><Lock size={10} className="text-amber-500" /></div>}
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Upload size={24} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black uppercase text-center leading-tight text-slate-900 dark:text-slate-300 tracking-wider">Import<br/>Data</span>
            </div>

            {/* Export Books */}
            <div 
                onClick={onExport} 
                className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-4 cursor-pointer border border-slate-100 dark:border-white/5 active:scale-95 transition-all aspect-square"
            >
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center">
                    <Download size={24} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-black uppercase text-center leading-tight text-slate-900 dark:text-slate-300 tracking-wider">Export<br/>Books</span>
            </div>
        </div>
    </div>
  );
};
