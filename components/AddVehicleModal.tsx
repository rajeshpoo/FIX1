
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle } from '../types';
import { X, Camera, Save, Loader2, Calendar, ScanLine, FileText, AlertCircle } from 'lucide-react';
import { notify, analyzeDocumentImage } from '../services/firebaseService';
import { useFormValidation } from '../hooks/useFormValidation';
import { hapticFeedback } from '../utils/haptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Vehicle) => Promise<void>;
  initialData?: Vehicle | null;
}

const ErrorLabel: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1 mt-1.5 ml-1 text-red-500 animate-slide-up">
      <AlertCircle size={10} />
      <span className="text-[10px] font-bold uppercase tracking-wide">{message}</span>
    </div>
  );
};

export const AddVehicleModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);

  const defaultValues: Vehicle = {
    id: '',
    number: '',
    ownerName: '',
    documents: {
      rc: { name: 'RC', expiryDate: '' },
      insurance: { name: 'Insurance', expiryDate: '' },
      fitness: { name: 'Fitness', expiryDate: '' },
      permit: { name: 'Permit', expiryDate: '' },
      statePermit: { name: 'State Permit', expiryDate: '' },
      puc: { name: 'PUC', expiryDate: '' },
      tax: { name: 'Road Tax', expiryDate: '' },
    },
    lastUpdated: Date.now()
  };

  const { values, errors, handleChange, isValid, setValues } = useFormValidation<Vehicle>(
    initialData || defaultValues,
    {
      number: { 
        required: true, 
        minLength: 6,
        custom: (v) => /^[A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{0,3}\s?[0-9]{4}$/.test(v.replace(/\s+/g, '')) 
      },
      ownerName: { required: true, minLength: 3 }
    }
  );

  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialData) setValues(initialData);
      else setValues(defaultValues);
    } else {
      document.body.style.overflow = 'unset';
      setDocErrors({});
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, initialData, setValues]);

  const validateDoc = (key: string, date: string) => {
    if (key === 'rc' && !date) return 'RC Expiry is mandatory';
    if (date && isNaN(new Date(date).getTime())) return 'Invalid date format';
    return '';
  };

  const handleDocChange = (key: keyof Vehicle['documents'], date: string) => {
    const error = validateDoc(key, date);
    setDocErrors(prev => ({ ...prev, [key]: error }));
    setValues(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [key]: { ...prev.documents[key], expiryDate: date }
      }
    }));
  };

  const compressForOCR = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Return just base64 data without prefix
                resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
        const file = e.target.files?.[0];
        if (!file) return;

        setOcrScanning(true);
        // 1. Compress Image
        const base64Data = await compressForOCR(file);
        
        // 2. Call Secure Backend Function (Cloud Function)
        const rawResult = await analyzeDocumentImage(base64Data, 'image/jpeg');
        
        // FIX: Explicitly cast 'unknown' to 'any' first to completely bypass strict type checking for this operation
        const parsed: any = rawResult;

        // 3. Apply Results (Using optional chaining for safety)
        if (parsed?.number) handleChange('number', parsed.number.toUpperCase());
        if (parsed?.owner) handleChange('ownerName', parsed.owner.toUpperCase());
        if (parsed?.expiry) handleDocChange('rc', parsed.expiry);
        
        notify("Scan Successful", "Verified and filled details.", "success");
    } catch (err: any) {
      console.error(err);
      notify("Scan Failed", err.message || "Could not read document.", "error");
    } finally {
      setOcrScanning(false);
      // Reset input value to allow re-selection
      e.target.value = '';
    }
  };

  const isFormValid = useMemo(() => {
    return isValid() && !docErrors.rc && values.documents.rc.expiryDate !== '';
  }, [isValid, docErrors, values.documents.rc.expiryDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    hapticFeedback(30);
    setLoading(true);
    const cleanId = values.number.toUpperCase().replace(/[^A-Z0-9]/g, '');
    await onSave({ ...values, id: initialData?.id || `v-${cleanId}`, lastUpdated: Date.now() });
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
          <div>
             <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{initialData ? 'Update Record' : 'Enroll Vehicle'}</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fleet Master Hub</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-slate-950 no-scrollbar">
          <form id="vehicleForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
                <div className="relative">
                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block ml-1">Registration No. (Ex: MH 12 AB 1234)</label>
                    <div className="relative group">
                        <input 
                          required 
                          type="text" 
                          value={values.number} 
                          onChange={(e) => handleChange('number', e.target.value.toUpperCase())} 
                          className={`w-full pl-5 pr-12 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none font-black text-xl transition-all uppercase ${errors.number ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-indigo-500'}`} 
                        />
                        <label className="absolute right-3 top-3 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm cursor-pointer hover:scale-105 transition-all text-slate-400">
                            {ocrScanning ? <Loader2 className="animate-spin" size={20} /> : <ScanLine size={20} />}
                            <input type="file" accept="image/*" className="hidden" onChange={handleOCR} />
                        </label>
                    </div>
                    <ErrorLabel message={errors.number ? "Invalid Registration Format" : undefined} />
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Owner Name</label>
                    <input 
                      required 
                      type="text" 
                      value={values.ownerName} 
                      onChange={(e) => handleChange('ownerName', e.target.value.toUpperCase())} 
                      placeholder="E.G. RAJESH POONIA" 
                      className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 rounded-2xl outline-none font-bold transition-all ${errors.ownerName ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-indigo-500'}`} 
                    />
                    <ErrorLabel message={errors.ownerName ? "Name must be at least 3 characters" : undefined} />
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 px-1"><FileText size={14} /> Critical Expiry Records</h3>
              <div className="space-y-4">
                <div className={`bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border-2 flex items-center gap-4 transition-all ${docErrors.rc ? 'border-red-500/30' : 'border-transparent'}`}>
                   <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500"><Calendar size={20} /></div>
                   <div className="flex-1">
                       <label className="block text-[10px] font-black text-red-500 uppercase mb-1">RC Expiry *</label>
                       <input 
                        required 
                        type="date" 
                        value={values.documents.rc.expiryDate} 
                        onChange={(e) => handleDocChange('rc', e.target.value)} 
                        className="w-full bg-transparent outline-none font-bold text-slate-900 dark:text-white text-sm" 
                       />
                   </div>
                </div>
                <ErrorLabel message={docErrors.rc} />

                <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(values.documents) as Array<keyof Vehicle['documents']>).filter(k => k !== 'rc').map((key) => (
                    <div key={key} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:border-indigo-500 transition-colors">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{values.documents[key].name}</label>
                        <input 
                          type="date" 
                          value={values.documents[key].expiryDate} 
                          onChange={(e) => handleDocChange(key, e.target.value)} 
                          className="w-full bg-transparent outline-none font-bold text-slate-900 dark:text-white text-xs" 
                        />
                    </div>
                    ))}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <button 
            type="submit" 
            form="vehicleForm" 
            disabled={loading || !isFormValid} 
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-40 disabled:grayscale ${isFormValid ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 shadow-none'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            {initialData ? 'Update Record' : 'Save Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
};
