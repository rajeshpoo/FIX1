
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Share2 } from 'lucide-react';
import { shareElementAsImage } from '../utils/shareUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode; // The receipt content
  captureId: string;
  title?: string;
  fileName?: string;
  textShareContent?: string; // If provided, shows "Share Text" button
}

export const ShareWrapper: React.FC<Props> = ({ 
  isOpen, onClose, children, captureId, title = "Share Receipt", fileName = "receipt.jpg", textShareContent 
}) => {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    // WAIT 300ms: Ensures the modal animation is fully complete and DOM is stable 
    // before the heavy canvas operation starts. This reduces crash risk.
    await new Promise(r => setTimeout(r, 300));
    
    const finalFileName = fileName.endsWith('.jpg') ? fileName : fileName.replace(/\.[^/.]+$/, "") + ".jpg";
    await shareElementAsImage(captureId, finalFileName);
    
    setSharing(false);
  };

  const handleTextShare = () => {
      if(textShareContent) {
          const url = `https://wa.me/?text=${encodeURIComponent(textShareContent)}`;
          window.open(url, '_blank');
      }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in font-sans">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl animate-pop-in overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* 
           MODIFIED: Added overflow-x-auto to parent container.
           Removed 'w-full' and 'overflow-hidden' from inner wrapper to allow full width receipt 
           to exist without being squashed/clipped by parent width.
        */}
        <div className="bg-slate-200 p-6 flex justify-center overflow-auto no-scrollbar flex-1">
          <div className="shadow-xl rounded-xl inline-block">
            {children}
          </div>
        </div>

        <div className="p-5 bg-white border-t border-slate-100 space-y-3 shrink-0">
          <button 
            onClick={handleShare}
            disabled={sharing}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {sharing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            {sharing ? 'Processing...' : 'Share Image'}
          </button>
          
          {textShareContent && (
              <button 
                onClick={handleTextShare}
                className="w-full py-3 bg-white text-indigo-600 border-2 border-indigo-50 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-indigo-50"
              >
                <Share2 size={14} /> Share Text Only
              </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
