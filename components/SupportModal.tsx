
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, AlertTriangle, Bug, RefreshCw, Zap, HelpCircle, Image as ImageIcon, Loader2, Send, Paperclip, CheckCircle2 } from 'lucide-react';
import { notify, uploadSupportScreenshot, saveSupportTicket } from '../services/firebaseService';
import { FirebaseUser } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
}

const CategoryButton = ({ id, label, icon: Icon, active, onClick, colorClass }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
            active 
            ? `bg-slate-900 text-white border-slate-900 shadow-lg` 
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
        }`}
    >
        <div className={`mb-1.5 ${active ? 'text-white' : colorClass}`}>
            <Icon size={20} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{label}</span>
    </button>
);

export const SupportModal: React.FC<Props> = ({ isOpen, onClose, user }) => {
  const [category, setCategory] = useState<string>('OTHER');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FIX: Image Compression Logic
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Scale down logic
                const maxSize = 800; 
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                            resolve(newFile);
                        } else {
                            reject(new Error("Compression failed"));
                        }
                    }, 'image/jpeg', 0.8); // 80% Quality
                } else {
                    reject(new Error("Canvas context failed"));
                }
            };
            img.src = event.target?.result as string;
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 10 * 1024 * 1024) { // Check initial size (10MB limit)
              notify("Too Large", "Image must be under 10MB", "warning");
              return;
          }
          
          try {
              // Compress before setting state
              const compressedFile = await compressImage(file);
              setImage(compressedFile);
              setPreviewUrl(URL.createObjectURL(compressedFile));
          } catch (err) {
              console.error("Compression failed", err);
              // Fallback to original if compression fails, but warn
              setImage(file);
              setPreviewUrl(URL.createObjectURL(file));
          }
      }
  };

  const handleSubmit = async () => {
      if (!description.trim()) {
          notify("Missing Info", "Please describe your issue", "warning");
          return;
      }

      setSubmitting(true);
      
      let imageUrl = '';

      try {
          // 1. Upload Image if present
          if (image) {
              try {
                  imageUrl = await uploadSupportScreenshot(image);
              } catch (e) {
                  console.error("Image upload failed", e);
                  notify("Upload Warning", "Could not attach image. Sending text only.", "warning");
              }
          }

          // 2. Create Ticket ID
          const ticketId = `TICKET-${Date.now().toString().slice(-6)}`;

          // 3. Save to Firestore (Non-blocking attempt)
          try {
              await saveSupportTicket(user.uid, {
                  id: ticketId,
                  category,
                  description,
                  imageUrl,
                  status: 'OPEN',
                  userEmail: user.email,
                  userPhone: user.phoneNumber,
                  platform: 'WEB'
              });
          } catch (dbErr) {
              console.warn("DB Save skipped (likely permission), proceeding to WhatsApp", dbErr);
          }

          // 4. Construct Message
          const text = `*Help Request #${ticketId}*\n\n` +
                       `👤 *User:* ${user.displayName || 'Fleet Owner'}\n` +
                       `📂 *Category:* ${category}\n` +
                       `📝 *Issue:* ${description}\n` +
                       (imageUrl ? `🔗 *Screenshot:* ${imageUrl}` : '');
          
          const encodedText = encodeURIComponent(text);
          // Use the specific support number
          const whatsappUrl = `https://wa.me/917852005541?text=${encodedText}`;

          // 5. Direct Navigation (Bypasses Popup Blockers)
          window.location.href = whatsappUrl;
          
          notify("Ticket Created", "Opening WhatsApp Support...", "success");
          
          setTimeout(() => {
              onClose();
              setSubmitting(false);
          }, 1000);

      } catch (e) {
          console.error(e);
          notify("Error", "Failed to process request", "error");
          setSubmitting(false);
      }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 animate-fade-in font-sans">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] shadow-2xl animate-pop-in border border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-[2.5rem] border-b border-slate-100 dark:border-slate-800">
            <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Help Desk</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Support & Feedback</p>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-6 flex-1">
            
            {/* 1. Category Grid */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">What's the issue?</label>
                <div className="grid grid-cols-3 gap-2">
                    <CategoryButton id="PAYMENT" label="Payment" icon={AlertTriangle} active={category === 'PAYMENT'} onClick={() => setCategory('PAYMENT')} colorClass="text-red-500" />
                    <CategoryButton id="APP_BUG" label="App Bug" icon={Bug} active={category === 'APP_BUG'} onClick={() => setCategory('APP_BUG')} colorClass="text-amber-500" />
                    <CategoryButton id="DATA_SYNC" label="Data Sync" icon={RefreshCw} active={category === 'DATA_SYNC'} onClick={() => setCategory('DATA_SYNC')} colorClass="text-blue-500" />
                    <CategoryButton id="FEATURE" label="Feature" icon={Zap} active={category === 'FEATURE'} onClick={() => setCategory('FEATURE')} colorClass="text-indigo-500" />
                    <CategoryButton id="ACCOUNT" label="Account" icon={CheckCircle2} active={category === 'ACCOUNT'} onClick={() => setCategory('ACCOUNT')} colorClass="text-emerald-500" />
                    <CategoryButton id="OTHER" label="Other" icon={HelpCircle} active={category === 'OTHER'} onClick={() => setCategory('OTHER')} colorClass="text-slate-500" />
                </div>
            </div>

            {/* 2. Description */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Explain Details</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your issue specifically..."
                    className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-medium text-sm text-slate-700 dark:text-slate-300 h-32 resize-none shadow-sm"
                />
            </div>

            {/* 3. Attachment */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Screenshot (Optional)</label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-16 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                        previewUrl ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                >
                    {previewUrl ? (
                        <div className="flex items-center gap-3 text-emerald-600">
                            <img src={previewUrl} className="w-10 h-10 rounded-lg object-cover border border-emerald-200" />
                            <span className="text-xs font-bold">Image Attached</span>
                            <button onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setImage(null); }} className="p-1 bg-white rounded-full shadow-sm"><X size={12}/></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                            <Paperclip size={16} />
                            <span className="text-xs font-bold">Tap to Attach Image</span>
                        </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 rounded-b-[2.5rem]">
            <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-emerald-700"
            >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} fill="currentColor" />}
                {submitting ? 'Processing...' : 'Start WhatsApp Chat'}
            </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
