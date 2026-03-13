
import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  title: string;
  itemName?: string;
  warningText?: string;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ 
  isOpen, onClose, onDelete, title, itemName, 
  warningText = "This action is permanent and cannot be undone." 
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-fade-in font-sans">
      {/* Blurred Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-[320px] bg-white dark:bg-slate-950 rounded-[2.5rem] p-8 text-center shadow-2xl animate-pop-in border border-slate-100 dark:border-white/5 overflow-hidden">
        
        {/* Red Warning Strip at Top */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>

        {/* Icon */}
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100 dark:border-red-900/30 rotate-3 transform transition-transform hover:rotate-6">
            <Trash2 size={36} strokeWidth={2.5} />
        </div>

        {/* Text Content */}
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">
            {title}
        </h3>
        
        <div className="mb-8 px-2">
            {itemName && (
                <div className="inline-block bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 mb-3">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 break-all line-clamp-2">
                        {itemName}
                    </span>
                </div>
            )}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {warningText}
            </p>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={onClose} 
                className="py-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-800"
            >
                Cancel
            </button>
            <button 
                onClick={onDelete} 
                className="py-4 rounded-2xl bg-red-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-700"
            >
                <Trash2 size={14} /> Delete
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
