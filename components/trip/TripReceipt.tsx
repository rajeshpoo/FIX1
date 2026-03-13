
import React from 'react';
import { Trip } from '../../types';
import { Truck, CheckCircle2, MapPin, IndianRupee, ArrowRight, ShieldCheck } from 'lucide-react';
import { safeNumber, getTripBreakdown } from '../../utils/tripUtils';

interface Props {
  trip: Trip;
  id: string; // DOM ID for capture
}

export const TripReceipt: React.FC<Props> = ({ trip, id }) => {
  const breakdown = getTripBreakdown(trip);
  const total = safeNumber(trip.freightAmount);
  const expense = safeNumber(trip.totalExpense);
  const profit = safeNumber(trip.netProfit);

  return (
    <div id={id} className="w-full bg-white text-slate-900 overflow-hidden relative font-sans pb-8">
      {/* Receipt Top Edge (Visual trick) */}
      <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>

      <div className="p-6 pb-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <Truck size={20} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight pb-0.5">FleetDost</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Secure Ledger</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md mb-1">
              <CheckCircle2 size={12} fill="currentColor" className="text-emerald-700" />
              <span className="text-[9px] font-black uppercase tracking-widest">Verified</span>
            </div>
            <p className="text-[9px] font-bold text-slate-400">{trip.startDate}</p>
          </div>
        </div>

        {/* Main Amount Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 text-center relative overflow-hidden">
           <div className="absolute -top-4 -right-4 text-slate-200 opacity-50"><ShieldCheck size={80} /></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Net Trip Profit</p>
           {/* Added pb-1 */}
           <h1 className={`text-4xl font-black tracking-tighter leading-normal pb-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
             ₹{profit.toLocaleString()}
           </h1>
           <div className="mt-3 flex justify-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>F: ₹{total.toLocaleString()}</span>
              <span className="text-slate-300">|</span>
              <span>E: ₹{expense.toLocaleString()}</span>
           </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-4 mb-6">
            {/* Route */}
            <div className="flex items-start gap-3">
                <div className="mt-1"><MapPin size={16} className="text-indigo-500"/></div>
                <div className="flex-1 border-b border-dashed border-slate-200 pb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Route</p>
                    {/* Added pb-1 */}
                    <p className="text-sm font-black text-slate-800 uppercase flex items-center gap-2 pb-1 leading-relaxed">
                        {trip.route?.from || 'Origin'} <ArrowRight size={12} className="text-slate-400"/> {trip.route?.to || 'Dest'}
                    </p>
                </div>
            </div>

            {/* Vehicle & Driver */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                    <div className="mt-1"><Truck size={16} className="text-indigo-500"/></div>
                    <div className="flex-1 border-b border-dashed border-slate-200 pb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</p>
                        {/* Added pb-1 */}
                        <p className="text-sm font-black text-slate-800 uppercase pb-1 leading-relaxed">{trip.vehicleNumber}</p>
                    </div>
                </div>
                <div className="flex-1 border-b border-dashed border-slate-200 pb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Driver</p>
                    {/* Added pb-1 */}
                    <p className="text-sm font-black text-slate-800 uppercase truncate pb-1 leading-relaxed">{trip.driverName || 'Unknown'}</p>
                </div>
            </div>

            {/* Transaction ID */}
            <div className="bg-slate-100 p-2 rounded-lg flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Trip ID</span>
                <span className="text-[10px] font-mono font-bold text-slate-700">#{trip.tripNumber}</span>
            </div>
        </div>

        {/* Footer */}
        <div className="text-center opacity-50">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Generated by FleetDost</p>
        </div>
      </div>

      {/* Zigzag Bottom */}
      <div className="w-full h-4 bg-slate-50 dark:bg-slate-950 relative" style={{
          maskImage: 'radial-gradient(circle, transparent 50%, black 50%)',
          maskSize: '20px 20px',
          maskPosition: '0 10px',
          WebkitMaskImage: 'radial-gradient(circle, transparent 50%, black 50%)',
          WebkitMaskSize: '20px 20px',
          WebkitMaskPosition: '0 10px'
      }}></div>
      
      {/* Spacer to prevent cutting */}
      <div className="h-4 w-full bg-white"></div>
    </div>
  );
};
