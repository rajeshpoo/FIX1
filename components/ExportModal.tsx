import React, { useEffect } from 'react';
import { X, FileSpreadsheet, FileText, File, Share2, Download, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: (type: 'xlsx' | 'csv' | 'pdf' | 'share') => void;
  isPremium?: boolean;
}

const ExportOption: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  desc: string; 
  colorClass: string; 
  onClick: () => void;
  isLocked?: boolean;
}> = ({ icon, title, desc, colorClass, onClick, isLocked }) => (
  <div 
    onClick={isLocked ? undefined : onClick}
    className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all shadow-sm ${
      isLocked 
        ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-60 grayscale cursor-not-allowed' 
        : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/50 cursor-pointer active:scale-95 hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/80'
    }`}
  >
    <div className={`p-3.5 rounded-2xl shadow-inner ${isLocked ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : colorClass} group-hover:scale-110 transition-transform duration-300`}>
      {isLocked ? <Lock size={20} /> : icon}
    </div>
    <div className="flex-1">
      <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">
        {title}
        {isLocked && <span className="text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase">Pro</span>}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{isLocked ? 'Upgrade to unlock bulk data formats' : desc}</p>
    </div>
  </div>
);

export const ExportModal: React.FC<Props> = ({ isOpen, onClose, onExport, isPremium = false }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl p-6 animate-pop-in border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Download size={20} />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Export Data</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Format</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-3">
          <ExportOption 
            isLocked={!isPremium}
            icon={<FileSpreadsheet size={24} className="text-green-600" />}
            title="Excel Sheet (.xlsx)"
            desc="Formatted spreadsheet for Excel"
            colorClass="bg-green-100 dark:bg-green-900/30"
            onClick={() => onExport('xlsx')}
          />
          <ExportOption 
            isLocked={!isPremium}
            icon={<FileText size={24} className="text-slate-600 dark:text-slate-300" />}
            title="CSV File (.csv)"
            desc="Raw data for imports"
            colorClass="bg-slate-200 dark:bg-slate-800"
            onClick={() => onExport('csv')}
          />
          <ExportOption 
            icon={<File size={24} className="text-red-600" />}
            title="PDF Report (.pdf)"
            desc="Professional printable document"
            colorClass="bg-red-100 dark:bg-red-900/30"
            onClick={() => onExport('pdf')}
          />
          <ExportOption 
            isLocked={!isPremium}
            icon={<Share2 size={24} className="text-violet-600" />}
            title="Share Link"
            desc="Send summary via WhatsApp"
            colorClass="bg-violet-100 dark:bg-violet-900/30"
            onClick={() => onExport('share')}
          />
        </div>
      </div>
    </div>
  );
};