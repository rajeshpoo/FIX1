
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Book, Receipt, FileSpreadsheet, Download, Lock } from 'lucide-react';
import { handleExportFleet, handleExportAllTrips } from '../utils/tripUtils';
import { generateLedgerPDF } from '../utils/ledgerUtils'; 
import { generateBiltyPDF } from '../utils/biltyUtils'; 
import { Vehicle, Trip, LedgerAccount, Bilty } from '../types';
import { notify } from '../services/firebaseService';
import * as XLSX from 'xlsx';
import { sendToNativeApp } from '../utils/helpers';

// Helper for Bulk Ledger/Bilty Export (Simple Excel)
const exportSimpleExcel = (data: any[], filename: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    sendToNativeApp(blob, filename);
    notify("Export Success", `${filename} downloaded.`, "success");
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  trips: Trip[];
  ledgers: LedgerAccount[];
  bilties: Bilty[];
  user: any;
  userProfile: any;
}

const HubCard: React.FC<{ icon: React.ReactNode; title: string; count: number; onClick: () => void; colorClass: string }> = ({ icon, title, count, onClick, colorClass }) => (
    <div 
        onClick={onClick}
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 flex flex-col justify-between cursor-pointer active:scale-95 transition-all hover:shadow-lg group relative overflow-hidden h-36"
    >
        <div className={`absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform ${colorClass}`}>{icon}</div>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass} bg-opacity-10 text-opacity-100`}>
            {/* FIX: Cast to any to bypass TS overload error on size prop */}
            {React.cloneElement(icon as React.ReactElement, { size: 20 } as any)}
        </div>
        <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1">{count}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        </div>
    </div>
);

export const ExportHubModal: React.FC<Props> = ({ isOpen, onClose, vehicles, trips, ledgers, bilties, user, userProfile }) => {
  if (!isOpen) return null;

  const exportVehicles = () => handleExportFleet(vehicles, 'xlsx', userProfile);
  const exportTrips = () => handleExportAllTrips(trips, 'xlsx', user, 'All_Time', userProfile);
  
  const exportLedger = () => {
      const data = ledgers.map(l => ({
          "Name": l.name,
          "Type": l.type,
          "Mobile": l.mobile,
          "City": l.address,
          "GSTIN": l.gst,
          "Opening Balance": l.openingBalance,
          "Current Balance": l.balance,
          "Status": l.balance > 0 ? "Receivable" : "Payable"
      }));
      exportSimpleExcel(data, 'Ledger_Master.xlsx', 'Accounts');
  };

  const exportBilties = () => {
      const data = bilties.map(b => ({
          "LR No": b.biltyNumber,
          "Date": b.date,
          "Vehicle": b.vehicleNumber,
          "Consignor": b.consignor.name,
          "Consignee": b.consignee.name,
          "From": b.fromStation,
          "To": b.toStation,
          "Item": b.itemDetails.description,
          "Weight": b.itemDetails.weight,
          "Packages": b.itemDetails.packages,
          "Freight": b.freight.amount,
          "Total": (b.freight.amount || 0) + (b.freight.labour || 0) + (b.freight.otherCh || 0),
          "Advance": b.freight.advance,
          "Balance": b.freight.balance
      }));
      exportSimpleExcel(data, 'Bilty_Register.xlsx', 'LR_Book');
  };

  const exportAll = () => {
      notify("Processing", "Generating full backup file...", "info");
      // Create a multi-sheet Excel
      const wb = XLSX.utils.book_new();
      
      // Vehicles
      const vWs = XLSX.utils.json_to_sheet(vehicles.map(v => ({ "No": v.number, "Owner": v.ownerName })));
      XLSX.utils.book_append_sheet(wb, vWs, "Vehicles");
      
      // Ledgers
      const lWs = XLSX.utils.json_to_sheet(ledgers.map(l => ({ "Name": l.name, "Balance": l.balance })));
      XLSX.utils.book_append_sheet(wb, lWs, "Ledger");
      
      // Trips
      const tWs = XLSX.utils.json_to_sheet(trips.map(t => ({ "Date": t.startDate, "Vehicle": t.vehicleNumber, "Profit": t.netProfit })));
      XLSX.utils.book_append_sheet(wb, tWs, "Trips");
      
      // Bilties
      const bWs = XLSX.utils.json_to_sheet(bilties.map(b => ({ "LR": b.biltyNumber, "Vehicle": b.vehicleNumber, "Freight": b.freight.amount })));
      XLSX.utils.book_append_sheet(wb, bWs, "Bilties");

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      sendToNativeApp(blob, "Full_Data_Export.xlsx");
      notify("Complete", "Multi-sheet Excel saved.", "success");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 animate-fade-in font-sans">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl animate-pop-in border border-slate-100 dark:border-white/5 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-center bg-white dark:bg-slate-950 rounded-t-[2.5rem]">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg">
                    <FileSpreadsheet size={20} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Export Hub</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Lock size={8} className="text-amber-500"/> Premium Feature</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-6 bg-slate-50 dark:bg-slate-900/50 flex-1">
            <div className="grid grid-cols-2 gap-4">
                <HubCard icon={<Truck />} title="Vehicles" count={vehicles.length} onClick={exportVehicles} colorClass="text-indigo-600 bg-indigo-500" />
                <HubCard icon={<Book />} title="Ledger" count={ledgers.length} onClick={exportLedger} colorClass="text-emerald-600 bg-emerald-500" />
                <HubCard icon={<Truck />} title="Trips" count={trips.length} onClick={exportTrips} colorClass="text-amber-600 bg-amber-500" />
                <HubCard icon={<Receipt />} title="Bilties" count={bilties.length} onClick={exportBilties} colorClass="text-blue-600 bg-blue-500" />
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
            <button 
                onClick={exportAll}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:opacity-90"
            >
                <Download size={16} /> Export Everything
            </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
