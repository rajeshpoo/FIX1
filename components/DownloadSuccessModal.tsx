
import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Share2, FolderOpen } from 'lucide-react';
import { notify } from '../services/firebaseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fileData: { filename: string; path: string; uri: string } | null;
}

export const DownloadSuccessModal: React.FC<Props> = ({ isOpen, onClose, fileData }) => {
  if (!isOpen || !fileData) return null;

  const handleShare = async () => {
      try {
          if (navigator.share) {
              await navigator.share({
                  title: 'Share File',
                  text: `Here is the file: ${fileData.filename}`,
                  url: fileData.uri,
              });
          } else {
              // Fallback for browsers without share API using Custom Toast
              notify("Info", "Sharing not supported on this browser. File is downloaded.", "info");
          }
      } catch (e) {
          console.error("Share failed", e);
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 animate-fade-in font-sans">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-[320px] bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 text-center shadow-2xl animate-pop-in border border-slate-100 dark:border-white/5">
        
        {/* Animated Checkmark */}
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20 animate-slide-up">
            <CheckCircle2 size={40} strokeWidth={2.5} />
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2">
            Download Complete
        </h3>
        
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2 justify-center text-slate-400">
                <FolderOpen size={12} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Saved Location</span>
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 break-words leading-relaxed">
                Downloads / {fileData.filename}
            </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
            <button 
                onClick={handleShare} 
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-indigo-700"
            >
                <Share2 size={16} /> Share Link
            </button>
            <button 
                onClick={onClose} 
                className="py-3 rounded-2xl bg-transparent text-slate-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-100 dark:hover:bg-slate-900"
            >
                Done
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
