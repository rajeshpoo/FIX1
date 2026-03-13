
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Vehicle, VehicleDocument } from '../types';
import { getStatusColor, getDaysRemaining, generateWhatsAppLink } from '../utils/helpers';
import { Trash2, Edit2, CheckCircle, AlertCircle, ArrowUpDown, AlertTriangle, FileQuestion, Truck, MessageSquareShare, X, Loader2, Send, Printer, Share2, ChevronDown } from 'lucide-react';
import { VehicleReceipt } from './VisualReceipts';
import { shareElementAsImage } from '../utils/shareUtils';
import { DeleteModal } from './DeleteModal';
import { generateFleetReportPDF } from '../utils/pdfGenerator';
import { useUser } from '../context/UserContext';
import { VehicleCardSkeleton } from './SkeletonLoader';
import { notify } from '../services/firebaseService';

interface Props {
  vehicles: Vehicle[];
  expiryDays: number;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  loading?: boolean; // Added loading prop
}

const DocStatusPill: React.FC<{ label: string; date?: string; expiryDays: number }> = ({ label, date, expiryDays }) => {
  const expiryDate = date || '';
  const status = getStatusColor(expiryDate, expiryDays);
  const days = getDaysRemaining(expiryDate);
  
  let Icon = CheckCircle;
  let iconColor = "text-emerald-500";
  let statusText = `${days}d`;
  let pillClass = "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200";

  let tooltipContent = "";
  if (!date || date.trim() === '') {
    Icon = FileQuestion;
    iconColor = "text-slate-300";
    statusText = "-";
    tooltipContent = "No date set";
  } else if (status === 'red') {
    Icon = AlertTriangle;
    iconColor = "text-red-500";
    statusText = days < 0 ? `${Math.abs(days)}d!` : `Exp`;
    tooltipContent = days < 0 ? `Expired ${Math.abs(days)} days ago` : "Expires today";
  } else if (status === 'yellow') {
    Icon = AlertCircle;
    iconColor = "text-amber-500";
    statusText = `${days}d`;
    tooltipContent = `${days} days remaining (Window: ${expiryDays}d)`;
  } else {
    tooltipContent = `${days} days remaining`;
  }

  return (
    <div className={`relative flex items-center justify-between px-2 py-1.5 rounded-lg border ${pillClass} shadow-sm group/pill transition-all duration-200 hover:border-indigo-500/50 cursor-help`}>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[8px] font-black uppercase tracking-widest rounded-md whitespace-nowrap opacity-0 group-hover/pill:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-xl border border-white/10 translate-y-1 group-hover/pill:translate-y-0">
        {tooltipContent}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
      </div>

      <div className="flex items-center gap-1 min-w-0">
        <Icon size={10} strokeWidth={2.5} className={`${iconColor} shrink-0`} />
        <span className="text-[8px] font-black uppercase tracking-tight truncate">{label}</span>
      </div>
      <span className={`text-[8px] font-black whitespace-nowrap ml-1 ${status === 'red' ? 'text-red-500' : status === 'yellow' ? 'text-amber-600' : status === 'green' ? 'text-emerald-600' : 'text-slate-400'}`}>
        {statusText}
      </span>
    </div>
  );
};

export const VehicleList: React.FC<Props> = ({ vehicles, expiryDays, onEdit, onDelete, loading = false }) => {
  const { userProfile } = useUser();
  const [shareVehicle, setShareVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [sharing, setSharing] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);

  const handleShareClick = async () => {
      if (!shareVehicle) return;
      setSharing(true);
      await new Promise(r => setTimeout(r, 100));
      await shareElementAsImage('vehicle-receipt-capture', `Vehicle_${shareVehicle.number}.png`);
      setSharing(false);
  };

  const handleDeleteConfirm = () => {
      if (vehicleToDelete) {
          onDelete(vehicleToDelete.id);
          setVehicleToDelete(null);
      }
  };

  const visibleVehicles = useMemo(() => vehicles.slice(0, displayLimit), [vehicles, displayLimit]);

  if (loading) {
      return (
          <div className="space-y-3 pb-24">
              <VehicleCardSkeleton />
              <VehicleCardSkeleton />
              <VehicleCardSkeleton />
          </div>
      );
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 animate-fade-in">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mb-5 shadow-inner">
            <Truck className="w-10 h-10 opacity-20" />
        </div>
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-500">No matching vehicles found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {visibleVehicles.map((vehicle) => {
        const docs = vehicle.documents ? (Object.values(vehicle.documents) as VehicleDocument[]) : [];
        const hasExpired = docs.some(d => d && d.expiryDate && d.expiryDate.trim() !== '' && getStatusColor(d.expiryDate, expiryDays) === 'red');
        const hasWarning = !hasExpired && docs.some(d => d && d.expiryDate && d.expiryDate.trim() !== '' && getStatusColor(d.expiryDate, expiryDays) === 'yellow');
        
        let statusBadge = "SAFE";
        let statusColorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
        let cardBorder = "border-slate-100 dark:border-slate-800";
        let statusStrip = "bg-emerald-500";
        
        if (hasExpired) {
          statusBadge = "EXPIRED";
          statusColorClass = "bg-red-500 text-white shadow-md shadow-red-500/10";
          cardBorder = "border-red-50 dark:border-red-900/20";
          statusStrip = "bg-red-500";
        } else if (hasWarning) {
          statusBadge = "ALERT";
          statusColorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
          cardBorder = "border-amber-50 dark:border-amber-900/20";
          statusStrip = "bg-amber-500";
        }

        return (
          <div 
            key={vehicle.id}
            className={`bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border ${cardBorder} relative overflow-visible transition-all duration-300 hover:shadow-md active:scale-[0.99] group/card`}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusStrip} rounded-l-full`} />

            <div className="p-4 pl-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[clamp(14px,5vw,18px)] font-black text-slate-900 dark:text-white tracking-tighter leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                              {vehicle.number}
                          </h3>
                        </div>
                        <p className="text-[clamp(9px,3vw,11px)] font-black text-slate-400 uppercase tracking-widest truncate">{vehicle.ownerName || 'UNASSIGNED'}</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-1 rounded-md text-[8px] font-black tracking-widest ${statusColorClass}`}>
                            {statusBadge}
                        </span>
                        
                        {/* Compact Action Menu with Light Backgrounds */}
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => onEdit(vehicle)} className="w-8 h-8 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all active:scale-90 border border-indigo-100 dark:border-indigo-900/30" title="Edit">
                                <Edit2 size={14}/>
                            </button>
                            <button onClick={() => setShareVehicle(vehicle)} className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-all active:scale-90 border border-slate-100 dark:border-slate-700" title="Share">
                                <Share2 size={14}/>
                            </button>
                            <button onClick={() => setVehicleToDelete(vehicle)} className="w-8 h-8 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 transition-all active:scale-90 border border-red-100 dark:border-red-900/30" title="Delete">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    </div>
                </div>

                {vehicle.documents ? (
                    <div className="grid grid-cols-3 gap-1.5">
                        <DocStatusPill label="RC" date={vehicle.documents.rc?.expiryDate} expiryDays={expiryDays} />
                        <DocStatusPill label="INS" date={vehicle.documents.insurance?.expiryDate} expiryDays={expiryDays} />
                        <DocStatusPill label="FIT" date={vehicle.documents.fitness?.expiryDate} expiryDays={expiryDays} />
                        <DocStatusPill label="PMT" date={vehicle.documents.permit?.expiryDate} expiryDays={expiryDays} />
                        <DocStatusPill label="SPM" date={vehicle.documents.statePermit?.expiryDate} expiryDays={expiryDays} />
                        <DocStatusPill label="PUC" date={vehicle.documents.puc?.expiryDate} expiryDays={expiryDays} />
                        <div className="col-span-3">
                            <DocStatusPill label="TAX" date={vehicle.documents.tax?.expiryDate} expiryDays={expiryDays} />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Data Unavailable</p>
                    </div>
                )}
            </div>
          </div>
        );
      })}

      {vehicles.length > displayLimit && (
        <div className="flex justify-center pt-2">
            <button 
                onClick={() => setDisplayLimit(prev => prev + 20)}
                className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center gap-2"
            >
                Load More <ChevronDown size={14} />
            </button>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareVehicle && createPortal(
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in font-sans">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShareVehicle(null)} />
              <div className="relative w-full max-w-[350px] bg-white rounded-[2rem] shadow-2xl animate-pop-in overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-100">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Share Status</h3>
                      <button onClick={() => setShareVehicle(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={16}/></button>
                  </div>
                  
                  <div className="bg-slate-200 p-4 flex justify-center overflow-auto no-scrollbar">
                      <div className="shadow-xl rounded-xl overflow-hidden inline-block">
                          <VehicleReceipt vehicle={shareVehicle} id="vehicle-receipt-capture" expiryDays={expiryDays} />
                      </div>
                  </div>

                  <div className="p-5 bg-white border-t border-slate-100">
                      <button 
                          onClick={handleShareClick}
                          disabled={sharing}
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          {sharing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                          {sharing ? 'Generating...' : 'Share Status Card'}
                      </button>
                      <button 
                          onClick={() => { const url = generateWhatsAppLink(shareVehicle, expiryDays); window.open(url, '_blank'); }}
                          className="w-full mt-3 py-3 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 rounded-xl transition-all"
                      >
                          Share as Text Only
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* DELETE MODAL */}
      <DeleteModal 
        isOpen={!!vehicleToDelete} 
        onClose={() => setVehicleToDelete(null)} 
        onDelete={handleDeleteConfirm}
        title="Delete Vehicle?"
        itemName={vehicleToDelete?.number}
      />
    </div>
  );
};
