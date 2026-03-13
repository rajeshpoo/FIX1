
import React, { useState, useEffect, useRef } from 'react';
import { FirebaseUser } from '../types';
import { X, User as UserIcon, Mail, Camera, Save, Loader2, Sparkles, Upload } from 'lucide-react';
import { notify, uploadProfileImage } from '../services/firebaseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
  initialPhoto?: string;
  onUpdate: (displayName: string, photoURL: string) => Promise<void>;
}

// Utility to convert Base64 string to Blob
const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose, user, initialPhoto, onUpdate }) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(initialPhoto || user.photoURL || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setDisplayName(user.displayName || '');
        setPhotoURL(initialPhoto || user.photoURL || '');
        document.body.style.overflow = 'hidden'; 
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, user, initialPhoto]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        let finalPhotoURL = photoURL;

        // If photoURL is a Base64 string (meaning it was freshly selected by the user)
        // We must upload it to Firebase Storage first to get a short URL.
        if (photoURL.startsWith('data:')) {
             try {
                 const imageBlob = dataURLtoBlob(photoURL);
                 // Upload to Firebase Storage
                 finalPhotoURL = await uploadProfileImage(user.uid, imageBlob);
             } catch (uploadError) {
                 console.error("Image upload failed:", uploadError);
                 notify("Upload Error", "Failed to upload image to cloud", "error");
                 setLoading(false);
                 return;
             }
        }

        await onUpdate(displayName, finalPhotoURL);
        setLoading(false);
        onClose();
        notify("Success", "Profile Updated", "success");
    } catch (err) {
        console.error("Profile update error:", err);
        notify("Save Failed", "Could not update profile information", "error");
        setLoading(false);
    }
  };

  const regenerateAvatar = () => {
    const randomColor = Math.floor(Math.random()*16777215).toString(16);
    const newUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=${randomColor}&color=fff&bold=true`;
    setPhotoURL(newUrl);
  };

  // Image Compression Utility - UPDATED FOR HD CLARITY
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max dimensions (Optimized for sharp HD display)
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
                
                // Use imageSmoothingEnabled for cleaner resize
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                // Increase quality to 0.9 (90%) for crystal clear look
                resolve(canvas.toDataURL('image/jpeg', 0.9)); 
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // Increased limit to 10MB for high-res source
        notify("File too large", "Image must be under 10MB", "warning");
        return;
      }
      
      try {
        const compressedBase64 = await compressImage(file);
        setPhotoURL(compressedBase64);
        notify("Ready", "Photo processed in HD", "success");
      } catch (e) {
        notify("Error", "Could not process image", "error");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[2rem] shadow-2xl overflow-hidden animate-pop-in border border-slate-100 dark:border-slate-800">
        
        {/* Decorative Header Background */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-violet-600 relative">
             <div className="absolute top-4 right-4 z-10">
                <button type="button" onClick={onClose} className="p-2 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full text-white transition-colors cursor-pointer">
                    <X size={20} />
                </button>
             </div>
             <div className="absolute inset-0 bg-white/5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
        </div>

        <div className="px-8 pb-8 -mt-16 relative z-10">
            <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
                <div className="relative group">
                    <div className="p-1.5 bg-white dark:bg-slate-900 rounded-full overflow-hidden shadow-2xl">
                        <img 
                            src={photoURL || 'https://via.placeholder.com/150'} 
                            alt="Profile" 
                            className="w-28 h-28 rounded-full border-4 border-slate-50 dark:border-slate-800 object-cover bg-slate-100"
                        />
                    </div>
                    
                    {/* Random Generate Button */}
                    <button 
                        type="button"
                        onClick={regenerateAvatar}
                        className="absolute bottom-1 right-0 p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full shadow-lg hover:scale-110 transition-all border-4 border-white dark:border-slate-900 z-20"
                        title="Random Avatar"
                    >
                        <Sparkles size={14} fill="currentColor" />
                    </button>

                    {/* Upload Button */}
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-1 left-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:scale-110 transition-all border-4 border-white dark:border-slate-900 z-20"
                        title="Upload Photo"
                    >
                        <Camera size={14} />
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                    />
                </div>
                <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Edit Profile</h2>
                <p className="text-xs text-slate-400">Update your personal details</p>
            </div>

            <div className="space-y-5 mt-2">
                <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Display Name</label>
                <div className="relative group">
                    <UserIcon className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-bold"
                    placeholder="Enter your name"
                    required
                    />
                </div>
                </div>

                <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 font-medium cursor-not-allowed"
                    />
                </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 text-lg"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {loading ? 'Uploading...' : 'Save Changes'}
            </button>
            </form>
        </div>
      </div>
    </div>
  );
};
