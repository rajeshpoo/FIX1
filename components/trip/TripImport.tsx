
import React, { useState, useRef } from 'react';
import { ArrowLeft, UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2, ArrowRight, Info, Download } from 'lucide-react';
import { parseExcelInWorker } from '../../utils/workerUtils';
import { notify } from '../../services/firebaseService';
import { safeNumber, parseAnyDate } from '../../utils/tripUtils';
import { Trip, TripExpense } from '../../types';
import * as XLSX from 'xlsx';
import { sendToNativeApp } from '../../utils/helpers';

interface Props {
  onBack: () => void;
  onConfirm: (trips: Trip[]) => Promise<void>;
}

export const TripImport: React.FC<Props> = ({ onBack, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [previewTrips, setPreviewTrips] = useState<Trip[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    // UPDATED TEMPLATE STRUCTURE
    const templateData = [
      {
        "Date": "2024-03-01",
        "Vehicle No": "MH 12 AB 1234",
        "Vehicle Owner Name": "Rajesh Kumar", // New
        "Driver Name": "Ramu Driver",         // New
        "From Location": "Delhi",
        "To Location": "Mumbai",
        "Party Name": "Reliance Logistics",
        "Freight Amount": 45000,
        "Diesel": 12000,
        "Toll Tax": 2500,
        "Driver Cash": 5000,
        "Repair": 0,
        "Other Exp": 500,
        "Bill Status": "PENDING"              // New
      },
      {
        "Date": "2024-03-05",
        "Vehicle No": "RJ 14 GC 9988",
        "Vehicle Owner Name": "Amit Singh",
        "Driver Name": "Suresh",
        "From Location": "Jaipur",
        "To Location": "Surat",
        "Party Name": "Cash Party",
        "Freight Amount": 22000,
        "Diesel": 8000,
        "Toll Tax": 1200,
        "Driver Cash": 2000,
        "Repair": 500,
        "Other Exp": 100,
        "Bill Status": "DONE"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 15 }, // Vehicle
      { wch: 20 }, // Owner Name
      { wch: 15 }, // Driver Name
      { wch: 15 }, // From
      { wch: 15 }, // To
      { wch: 20 }, // Party
      { wch: 15 }, // Freight
      { wch: 10 }, // Diesel
      { wch: 10 }, // Toll
      { wch: 12 }, // Driver Cash
      { wch: 10 }, // Repair
      { wch: 10 }, // Other
      { wch: 12 }  // Bill Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trip_Template");
    
    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    
    sendToNativeApp(blob, "FleetDost_Trip_Template.xlsx");
    notify("Template Downloaded", "Fill this file and upload it back.", "success");
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setLoadingText('Parsing Excel...');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const jsonData = await parseExcelInWorker(arrayBuffer);
        
        if (jsonData.length === 0) {
          notify("Error", "File is empty", "error");
          setIsProcessing(false);
          return;
        }

        setLoadingText('Mapping columns...');
        const headers = Object.keys(jsonData[0]).map(h => h.toLowerCase().trim());
        
        // Helper to find column name
        const findCol = (keywords: string[]) => {
            const match = headers.find(h => keywords.some(k => h.includes(k)));
            // Return original key from jsonData[0]
            return match ? Object.keys(jsonData[0]).find(k => k.toLowerCase().trim() === match) : null;
        };

        const colMap = {
            date: findCol(['date', 'dinank']),
            vehicle: findCol(['vehicle', 'truck', 'gadi', 'no']),
            owner: findCol(['owner', 'malik']),
            driverName: findCol(['driver name', 'drivername']), // Explicit Name
            party: findCol(['party', 'customer', 'name']),
            from: findCol(['from', 'source', 'loading']),
            to: findCol(['to', 'destination', 'unloading']),
            freight: findCol(['freight', 'bhada', 'amount', 'rate']),
            // Expenses
            diesel: findCol(['diesel', 'fuel', 'oil']),
            toll: findCol(['toll', 'tax', 'fasttag']),
            driverCash: findCol(['driver cash', 'cash', 'bhatta']), // Explicit Cash
            repair: findCol(['repair', 'maint']),
            other: findCol(['other', 'misc', 'kharcha']),
            billStatus: findCol(['bill', 'status'])
        };

        if (!colMap.vehicle || !colMap.date) {
            notify("Format Error", "Could not find Vehicle Number or Date columns", "error");
            setIsProcessing(false);
            return;
        }

        const parsedTrips: Trip[] = jsonData.map((row: any) => {
            const vehicleNum = String(row[colMap.vehicle!] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (!vehicleNum || vehicleNum.length < 4) return null;

            const dateStr = parseAnyDate(row[colMap.date!]);
            const expenses: TripExpense[] = [];
            let totalExp = 0;

            const addExp = (type: TripExpense['type'], val: any) => {
                const amt = safeNumber(val);
                if (amt > 0) {
                    expenses.push({
                        id: `exp-${Math.random()}`,
                        type,
                        amount: amt,
                        date: dateStr,
                        paidBy: 'OWNER',
                        notes: 'Imported'
                    });
                    totalExp += amt;
                }
            };

            if (colMap.diesel) addExp('FUEL', row[colMap.diesel!]);
            if (colMap.toll) addExp('TOLL', row[colMap.toll!]);
            if (colMap.driverCash) addExp('DRIVER_CASH', row[colMap.driverCash!]);
            if (colMap.repair) addExp('REPAIR', row[colMap.repair!]);
            if (colMap.other) addExp('OTHER', row[colMap.other!]);

            const freight = safeNumber(row[colMap.freight!]);
            
            // Extract Driver Name
            let driverName = 'Imported';
            if (colMap.driverName) {
                driverName = String(row[colMap.driverName!] || '').trim().toUpperCase();
            }
            if (!driverName) driverName = 'Unknown';

            // Extract Bill Status
            let billStatus: 'PENDING' | 'DONE' = 'PENDING';
            if (colMap.billStatus) {
                const statusStr = String(row[colMap.billStatus!] || '').toUpperCase();
                if (statusStr.includes('DONE') || statusStr.includes('PAID') || statusStr.includes('YES')) {
                    billStatus = 'DONE';
                }
            }

            return {
                id: `trip-imp-${Math.random().toString(36).substr(2, 9)}`,
                tripNumber: Math.floor(1000 + Math.random() * 9000),
                vehicleNumber: String(row[colMap.vehicle!] || '').toUpperCase(),
                startDate: dateStr,
                driverName: driverName,
                partyName: colMap.party ? String(row[colMap.party!] || 'Cash') : 'Cash',
                route: {
                    from: colMap.from ? String(row[colMap.from!] || 'LOC') : 'LOC',
                    to: colMap.to ? String(row[colMap.to!] || 'LOC') : 'LOC'
                },
                freightAmount: freight,
                totalExpense: totalExp,
                netProfit: freight - totalExp,
                expenses,
                status: 'COMPLETED',
                billStatus: billStatus,
                lastUpdated: Date.now()
            } as Trip;
        }).filter(t => t !== null) as Trip[];

        setPreviewTrips(parsedTrips);
        notify("Analysis Complete", `Found ${parsedTrips.length} trips`, "success");

      } catch (err) {
        console.error(err);
        notify("Import Failed", "Could not parse file", "error");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in overflow-y-auto no-scrollbar pt-24 pb-10">
       {/* HEADER */}
       <div className="px-5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors shadow-sm">
                <ArrowLeft size={20} />
             </button>
             <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Bulk Trip Import</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Excel / CSV Parser</p>
             </div>
          </div>
       </div>

       <div className="flex-1 px-6 flex flex-col items-center max-w-xl mx-auto w-full">
          {previewTrips.length === 0 ? (
             <div className="w-full space-y-6 mt-4">
                
                {/* 1. DOWNLOAD TEMPLATE SECTION */}
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">Step 1: Get Template</h3>
                            <p className="text-[10px] text-indigo-700/70 dark:text-indigo-300/70 font-medium">Download the updated format with Driver & Bill Status.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleDownloadTemplate}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Download size={16} /> Download New Template
                    </button>
                </div>

                {/* 2. UPLOAD SECTION */}
                <div 
                   onClick={() => !isProcessing && fileInputRef.current?.click()}
                   className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                >
                   <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform">
                      {isProcessing ? <Loader2 className="animate-spin" size={28} /> : <UploadCloud size={28} />}
                   </div>
                   <h3 className="text-sm font-black text-slate-900 dark:text-white mb-1 uppercase tracking-wide">
                      Step 2: Upload Data
                   </h3>
                   <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                      {isProcessing ? loadingText : 'Select your filled Excel file here'}
                   </p>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} 
                   />
                </div>

                {/* 3. INSTRUCTIONS */}
                <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                   <div className="flex items-center gap-2 mb-4 text-slate-500 dark:text-slate-400">
                      <Info size={16} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Important Instructions</h4>
                   </div>
                   <ul className="space-y-3">
                        <li className="flex gap-3 text-xs text-slate-600 dark:text-slate-300">
                            <span className="w-5 h-5 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                            <span>Do not change the <b>Column Headers</b>. The system needs them to read data.</span>
                        </li>
                        <li className="flex gap-3 text-xs text-slate-600 dark:text-slate-300">
                            <span className="w-5 h-5 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                            <span><b>Driver Name</b> and <b>Driver Cash</b> are separate columns now.</span>
                        </li>
                        <li className="flex gap-3 text-xs text-slate-600 dark:text-slate-300">
                            <span className="w-5 h-5 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                            <span><b>Bill Status</b> can be 'PENDING' or 'DONE'.</span>
                        </li>
                   </ul>
                </div>
             </div>
          ) : (
             <div className="w-full max-w-lg space-y-6">
                <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/20 flex justify-between items-center">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Trips Found</p>
                      <h3 className="text-4xl font-black tracking-tighter">{previewTrips.length}</h3>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Revenue</p>
                      <h3 className="text-xl font-black tracking-tighter">₹{previewTrips.reduce((s, t) => s + t.freightAmount, 0).toLocaleString()}</h3>
                   </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 max-h-[40vh] overflow-y-auto no-scrollbar">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Preview Data</h4>
                   <div className="space-y-3">
                      {previewTrips.slice(0, 10).map((t, i) => (
                         <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="flex-1 min-w-0 pr-2">
                               <div className="flex items-center gap-2 mb-1">
                                   <span className="text-[10px] font-bold text-slate-400">{t.startDate}</span>
                                   {t.billStatus === 'DONE' && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-black">BILLED</span>}
                               </div>
                               <span className="text-xs font-black text-slate-800 dark:text-white block">{t.vehicleNumber}</span>
                               <span className="text-[9px] font-bold text-slate-400 block truncate">{t.driverName}</span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 whitespace-nowrap">₹{t.freightAmount}</span>
                         </div>
                      ))}
                      {previewTrips.length > 10 && (
                         <p className="text-center text-[10px] text-slate-400 font-bold py-2">...and {previewTrips.length - 10} more</p>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setPreviewTrips([])} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
                   <button onClick={() => onConfirm(previewTrips)} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> Confirm Import
                   </button>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};
