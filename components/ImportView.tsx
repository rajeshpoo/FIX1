
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, FileUp, Download, UploadCloud, ChevronDown, ChevronUp, Loader2, AlertCircle, CalendarCheck, ShieldCheck, CheckCircle2, SearchSlash, Zap, FileSpreadsheet, Plus, Share2, Lock, Crown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Vehicle } from '../types';
import { notify } from '../services/firebaseService';
import { parseExcelInWorker } from '../utils/workerUtils';
import { sendToNativeApp } from '../utils/helpers';

interface Props {
  onBack: () => void;
  onImport: (vehicles: Vehicle[]) => Promise<void>;
  isPremium?: boolean;
  onOpenPricing?: () => void;
}

export const ImportView: React.FC<Props> = ({ onBack, onImport, isPremium = false, onOpenPricing }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [previewVehicles, setPreviewVehicles] = useState<Vehicle[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAnyDate = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    
    // 1. Handle Excel Serial Numbers (Most Accurate)
    if (typeof val === 'number') {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
             return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
        }
      } catch (e) { return ''; }
    }

    // 2. Handle Strings
    let str = String(val).trim();
    if (!str || str.length < 5) return '';

    str = str.replace(/[./\\\s|]/g, '-').replace(/-+/g, '-');
    
    if (str.includes('T')) str = str.split('T')[0];
    if (str.includes(' ')) str = str.split(' ')[0];

    const parts = str.split('-');

    if (parts.length === 3) {
      let d = 0, m = 0, y = 0;
      const p0 = parseInt(parts[0]);
      const p1 = parseInt(parts[1]);
      const p2 = parseInt(parts[2]);

      if (isNaN(p0) || isNaN(p1) || isNaN(p2)) return '';

      if (parts[0].length === 4) {
          y = p0; m = p1; d = p2;
      } else {
          y = p2; 
          if (parts[2].length === 2) y += 2000;
          if (p1 > 12) { d = p1; m = p0; } else { d = p0; m = p1; }
      }

      if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return ''; 
  };

  const downloadTemplate = () => {
    const templateData = [
      { "Vehicle Number": "MH 12 AB 1234", "Owner Name": "Amit Kumar", "RC Expiry": "31-12-2025", "Insurance Expiry": "15-05-2024", "Fitness Expiry": "01-01-2025", "National Permit": "30-06-2024", "State Permit": "30-06-2024", "PUC Expiry": "20-11-2023", "Road Tax": "01-04-2024" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{wch: 15}, {wch: 20}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import Template");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    sendToNativeApp(blob, "FleetDost_Template.xlsx");
    notify("Downloading...", "Check notifications or share sheet", "info");
  };

  const handleUploadClick = () => {
      if (!isPremium) {
          if(onOpenPricing) onOpenPricing();
          return;
      }
      if (!isProcessing && fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setLoadingText('Reading file...');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoadingText('Processing in background...');
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const jsonData = await parseExcelInWorker(arrayBuffer);
        if (jsonData.length === 0) { notify("Empty Sheet", "Excel has no data rows", "warning"); setIsProcessing(false); return; }
        setLoadingText('Analyzing columns...');
        const allHeaders = Object.keys(jsonData[0]);
        const lockedHeaders = new Set<string>();
        const getBestColumn = (primary: string[], secondary: string[] = ['exp', 'date', 'val', 'upto', 'valid']) => {
          let bestMatch = { header: '', score: -1 };
          allHeaders.forEach(h => {
            if (lockedHeaders.has(h)) return;
            const norm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            let score = 0;
            primary.forEach(k => { if (norm === k) score += 100; else if (norm.includes(k)) score += 40; });
            secondary.forEach(k => { if (norm.includes(k)) score += 20; });
            if (score > bestMatch.score && score >= 25) { bestMatch = { header: h, score }; }
          });
          if (bestMatch.header) { lockedHeaders.add(bestMatch.header); return bestMatch.header; }
          return null;
        };
        const colMap = { truck: getBestColumn(['truck', 'vehicle', 'number', 'regn', 'regis', 'gadi', 'vno', 'no', 'trucknumber']), owner: getBestColumn(['owner', 'party', 'name', 'malik', 'customer'], []), rc: getBestColumn(['rc', 'registration', 'reg'], ['exp', 'date', 'val', 'upto']), ins: getBestColumn(['insurance', 'ins', 'policy', 'bima', 'icompany'], ['exp', 'date', 'val', 'upto']), fit: getBestColumn(['fitness', 'fit', 'fitnessvalid'], ['exp', 'date', 'val', 'upto']), np: getBestColumn(['national', 'nppermit', 'np', 'permit'], ['exp', 'date', 'val']), sp: getBestColumn(['state', 'local', 'sp', 'statepermit'], ['exp', 'date', 'val']), puc: getBestColumn(['puc', 'pollution', 'env', 'pollutionexp'], ['exp', 'date']), tax: getBestColumn(['tax', 'roadtax', 'quarterly', 'token', 'rtotax'], ['exp', 'date', 'val']) };
        if (!colMap.truck) { notify("Header Error", "Could not find 'Truck Number' column", "error"); setIsProcessing(false); return; }
        const importedVehicles: Vehicle[] = jsonData.map((row) => {
          const vNum = String(row[colMap.truck!]).trim();
          if (!vNum || vNum.length < 4) return null;
          const cleanNumber = vNum.toUpperCase().replace(/[^A-Z0-9]/g, '');
          return { id: `v-${cleanNumber}`, number: vNum.toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim(), ownerName: colMap.owner ? String(row[colMap.owner]).trim() : 'Imported Owner', lastUpdated: Date.now(), documents: { rc: { name: 'RC', expiryDate: colMap.rc ? parseAnyDate(row[colMap.rc]) : '' }, insurance: { name: 'Insurance', expiryDate: colMap.ins ? parseAnyDate(row[colMap.ins]) : '' }, fitness: { name: 'Fitness', expiryDate: colMap.fit ? parseAnyDate(row[colMap.fit]) : '' }, permit: { name: 'National Permit', expiryDate: colMap.np ? parseAnyDate(row[colMap.np]) : '' }, statePermit: { name: 'State Permit', expiryDate: colMap.sp ? parseAnyDate(row[colMap.sp]) : '' }, puc: { name: 'PUC', expiryDate: colMap.puc ? parseAnyDate(row[colMap.puc]) : '' }, tax: { name: 'Road Tax', expiryDate: colMap.tax ? parseAnyDate(row[colMap.tax]) : '' } } };
        }).filter(v => v !== null) as Vehicle[];
        if (importedVehicles.length > 0) { setPreviewVehicles(importedVehicles); notify("Preview Ready", `${importedVehicles.length} vehicles found. Review and confirm.`, "info"); } else { notify("No Data", "Check if your Excel has actual data", "warning"); }
      } catch (err) { notify("Format Error", "Cannot read this Excel file structure", "error"); } finally { setIsProcessing(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmImport = async () => {
      notify("Saving Fleet", `${previewVehicles.length} vehicles are being saved in background.`, "success");
      onImport(previewVehicles).catch(err => {
          console.error("Delayed vehicle import error", err);
          notify("Cloud Sync Failed", "Some data could not be backed up. Try syncing manually from settings.", "error");
      });
      setPreviewVehicles([]);
      // Removed onBack() to keep user on the same screen
  };

  // USE PORTAL TO BREAK OUT OF STACKING CONTEXT
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto no-scrollbar animate-fade-in font-sans">
      <div className="px-6 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] flex items-center justify-between border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Power Import</h2>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                <Zap size={10} fill="currentColor" /> Instant-Merge Active
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-md mx-auto w-full space-y-6">
        <div 
            className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed shadow-sm overflow-hidden py-10 px-6 text-center relative group cursor-pointer transition-all ${
                !isPremium 
                ? 'border-slate-200 dark:border-slate-800 opacity-80' 
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`} 
            onClick={handleUploadClick}
        >
            {!isPremium && (
                <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-amber-200 dark:border-amber-800">
                    <Lock size={10} strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Premium</span>
                </div>
            )}

            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner transition-transform duration-300 ${!isPremium ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 group-hover:scale-110'}`}>
                {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <UploadCloud size={32} strokeWidth={2} />}
            </div>
            
            {previewVehicles.length > 0 ? (
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{previewVehicles.length} Found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Ready to merge instantly</p>
                </div>
            ) : (
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">{!isPremium ? 'Unlock Bulk Import' : (isProcessing ? 'Processing...' : 'Upload Excel')}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">
                        {!isPremium ? 'Upgrade to import unlimited vehicles at once via Excel.' : 'Fastest Import: Updates phone cache first, cloud second.'}
                    </p>
                </div>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileChange} disabled={!isPremium} />
        </div>

        {previewVehicles.length === 0 && (
            <button onClick={downloadTemplate} disabled={isProcessing} className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                <FileSpreadsheet size={14} /> Download Sample Template
            </button>
        )}

        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] p-6 border border-emerald-100 dark:border-emerald-900/30 flex gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl h-fit">
                <ShieldCheck size={20} />
            </div>
            <div>
                <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide mb-2">Zero-Wait Import</h4>
                <p className="text-[10px] font-bold text-emerald-700/70 dark:text-emerald-400/70 leading-relaxed">
                    Data will be added to your screen in 1 second. The cloud synchronization will finish in the background automatically.
                </p>
            </div>
        </div>
      </div>

      {previewVehicles.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 animate-slide-up z-[10000] safe-area-bottom">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">{previewVehicles.length} Vehicles Detected</span>
                </div>
                <button onClick={() => setPreviewVehicles([])} className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-wider transition-colors">Cancel</button>
            </div>
            <button 
                onClick={handleConfirmImport}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                Confirm & Import Instantly
            </button>
        </div>
      )}
    </div>,
    document.body
  );
};
