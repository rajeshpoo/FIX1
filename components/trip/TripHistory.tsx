
import React, { useState, useMemo } from 'react';
import { Trip, Vehicle } from '../../types';
import { ArrowLeft, Printer, Edit2, Trash2, Share2, X, Loader2, Send, IndianRupee, Table2, TrendingUp, TrendingDown, Wallet, ArrowRight, Lock, Crown } from 'lucide-react';
import { safeNumber } from '../../utils/tripUtils';
import { TripReceipt } from './TripReceipt';
import { shareElementAsImage } from '../../utils/shareUtils';
import { createPortal } from 'react-dom';

interface Props {
    selectedVehicle: Vehicle;
    activeTrip: Trip | null;
    // Updated: Accept global filter props instead of string month
    dateFilter: any;
    onFilterChange: (newFilter: any) => void;
    vehicleHistoryTrips: Trip[];
    onBack: () => void;
    onViewEditor: (t: Trip) => void;
    onStartTrip: () => void;
    onPrintHistory: () => void;
    onEditTrip: (t: Trip) => void;
    onDeleteTrip: (id: string) => void;
    onPrintSingleTrip: (t: Trip) => void;
    onAddExpense: (t: Trip) => void;
    onGenerateBill?: (t: Trip) => void;
    isPremium?: boolean;
    onUnlockPremium?: () => void;
}

export const TripHistory: React.FC<Props> = ({ 
    selectedVehicle, dateFilter, onFilterChange, vehicleHistoryTrips, activeTrip,
    onBack, onViewEditor, onStartTrip, onPrintHistory, onEditTrip, onDeleteTrip, onPrintSingleTrip,
    isPremium, onUnlockPremium
}) => {
    
    const [shareTrip, setShareTrip] = useState<Trip | null>(null);
    const [sharing, setSharing] = useState(false);

    const handleShareClick = async () => {
        if (!shareTrip) return;
        setSharing(true);
        try {
            await shareElementAsImage('trip-receipt-capture', `Trip_${shareTrip.vehicleNumber}_${Date.now()}.png`);
        } finally {
            setSharing(false);
        }
    };

    const totals = useMemo(() => {
        return vehicleHistoryTrips.reduce((acc, t) => {
            acc.freight += safeNumber(t.freightAmount);
            acc.expense += safeNumber(t.totalExpense);
            acc.profit += safeNumber(t.netProfit);
            return acc;
        }, { freight: 0, expense: 0, profit: 0 });
    }, [vehicleHistoryTrips]);

    // Breakdown Helper
    const getDetailedBreakdown = (t: Trip) => {
        const exps = t.expenses || [];
        return {
            fuel: exps.filter(e => e.type === 'FUEL').reduce((s,e) => s + (e.amount||0), 0),
            toll: exps.filter(e => e.type === 'TOLL').reduce((s,e) => s + (e.amount||0), 0),
            driverCash: exps.filter(e => e.type === 'DRIVER_CASH').reduce((s,e) => s + (e.amount||0), 0),
            repair: exps.filter(e => e.type === 'REPAIR').reduce((s,e) => s + (e.amount||0), 0),
            police: exps.filter(e => e.type === 'POLICE').reduce((s,e) => s + (e.amount||0), 0),
            other: exps.filter(e => !['FUEL','TOLL','DRIVER_CASH','REPAIR','POLICE'].includes(e.type)).reduce((s,e) => s + (e.amount||0), 0),
            paidByDriver: exps.filter(e => e.paidBy === 'DRIVER').reduce((s,e) => s + (e.amount||0), 0), 
        };
    };

    // Global Month Sync Handler
    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!val) return;
        const date = new Date(val + '-01');
        const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        // Updates global state in TripBook, keeping context synced
        onFilterChange({ type: 'MONTH', value: val, start: '', end: '', label });
    };

    const displayMonth = dateFilter.type === 'MONTH' ? dateFilter.value : '';

    // Calculate cutoff date for free users (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

    // Single Line Excel Styles - Thinner Padding
    const cellBase = "px-2 py-2.5 text-xs font-bold border-r border-b border-slate-200 dark:border-slate-800 whitespace-nowrap text-center text-slate-700 dark:text-slate-300";
    const headerBase = "px-2 py-2.5 text-[10px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 z-20 select-none shadow-sm whitespace-nowrap";

    return createPortal(
        <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-950 flex flex-col animate-fade-in font-sans">
            {/* 1. HEADER */}
            <div className="shrink-0 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950/90 backdrop-blur-md z-30">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 active:scale-95 transition-all">
                        <ArrowLeft size={20} strokeWidth={2.5}/>
                    </button>
                    <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-white leading-none">{selectedVehicle.number}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                                {dateFilter.label}
                            </span>
                            {activeTrip && <span className="text-[9px] font-black text-white bg-emerald-500 px-2 py-0.5 rounded-md animate-pulse shadow-lg shadow-emerald-500/30">LIVE TRIP</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="month" 
                        value={displayMonth} 
                        onChange={handleMonthChange} 
                        className="bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 outline-none w-32" 
                    />
                    <button onClick={onPrintHistory} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl active:scale-95 transition-all">
                        <Printer size={18}/>
                    </button>
                </div>
            </div>

            {/* 2. STYLISH STATS BUTTONS */}
            <div className="shrink-0 p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-3 gap-3">
                    {/* Freight Button */}
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1.5 bg-indigo-50 dark:bg-indigo-900/50 rounded-bl-xl text-indigo-500">
                            <TrendingUp size={14} />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fare</p>
                        <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">₹{totals.freight.toLocaleString()}</p>
                    </div>

                    {/* Expense Button */}
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1.5 bg-red-50 dark:bg-red-900/50 rounded-bl-xl text-red-500">
                            <TrendingDown size={14} />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expenses</p>
                        <p className="text-lg font-black text-red-500 dark:text-red-400">₹{totals.expense.toLocaleString()}</p>
                    </div>

                    {/* Profit Button */}
                    <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1.5 bg-white/20 rounded-bl-xl text-white">
                            <Wallet size={14} />
                        </div>
                        <p className="text-[9px] font-black text-emerald-100 uppercase tracking-widest mb-1">Net Profit</p>
                        <p className="text-xl font-black">₹{totals.profit.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* 3. SPACIOUS EXCEL TABLE (Scrollable Area) */}
            <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 relative w-full">
                <table className="border-collapse w-full min-w-max text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr>
                            <th className={`${headerBase} sticky left-0 z-30 border-r-2 shadow-[4px_0_10px_rgba(0,0,0,0.05)] min-w-[70px]`}>Date</th>
                            <th className={headerBase}>Route</th>
                            <th className={headerBase}>Party Name</th>
                            <th className={`${headerBase} text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10`}>Freight</th>
                            
                            {/* Detailed Expenses */}
                            <th className={`${headerBase} text-amber-600`}>Diesel</th>
                            <th className={`${headerBase} text-blue-600`}>Toll</th>
                            <th className={`${headerBase} text-slate-600`}>Driver Cash</th>
                            <th className={headerBase}>Repair</th>
                            <th className={`${headerBase} text-red-500`}>RTO/Police</th>
                            <th className={headerBase}>Other Exp</th>
                            
                            {/* Aggregates */}
                            <th className={`${headerBase} bg-red-50/50 dark:bg-red-900/10 text-red-600`}>Total Exp</th>
                            <th className={`${headerBase} bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700`}>Net Profit</th>
                            <th className={`${headerBase} sticky right-0 z-30 border-l-2 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] min-w-[120px]`}>Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {vehicleHistoryTrips.length > 0 ? vehicleHistoryTrips.map((trip, idx) => {
                            const isLive = trip.status === 'RUNNING';
                            const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/30 dark:bg-slate-900/50';
                            const bd = getDetailedBreakdown(trip);
                            
                            // PREMIUM LOCK LOGIC
                            const isLocked = !isPremium && trip.startDate < cutoffDate;
                            const blurClass = isLocked ? 'blur-[4px] opacity-40 select-none grayscale' : '';
                            
                            return (
                                <tr 
                                    key={trip.id} 
                                    onClick={() => isLocked && onUnlockPremium ? onUnlockPremium() : onViewEditor(trip)} 
                                    className={`group cursor-pointer transition-colors relative ${rowBg} ${isLocked ? 'hover:bg-slate-100 dark:hover:bg-slate-900' : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10'}`}
                                >
                                    {/* Date (Sticky) */}
                                    <td className={`${cellBase} sticky left-0 z-10 ${rowBg} border-r-2 font-bold text-slate-800 dark:text-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.02)]`}>
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-sm">{trip.startDate.split('-')[2]}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(trip.startDate).toLocaleString('default', { month: 'short' })}</span>
                                            {isLive && <div className="text-[8px] text-white bg-emerald-500 px-1 py-0.5 rounded font-black animate-pulse">LIVE</div>}
                                        </div>
                                    </td>

                                    {/* Route - FLATTENED TO SINGLE LINE */}
                                    <td className={`${cellBase} ${blurClass}`}>
                                        <span className="uppercase">{trip.route.from} <span className="text-slate-400 mx-1">➜</span> {trip.route.to}</span>
                                    </td>

                                    {/* Party - FLATTENED */}
                                    <td className={`${cellBase} ${blurClass}`} title={trip.partyName}>
                                        {trip.partyName || 'CASH'}
                                    </td>

                                    {/* Freight */}
                                    <td className={`${cellBase} font-bold text-indigo-600 bg-indigo-50/20 dark:bg-indigo-900/10 text-sm ${blurClass}`}>
                                        {trip.freightAmount.toLocaleString()}
                                    </td>

                                    {/* Expenses Breakdown */}
                                    <td className={`${cellBase} text-amber-600 ${blurClass}`}>{bd.fuel ? bd.fuel.toLocaleString() : '-'}</td>
                                    <td className={`${cellBase} text-blue-600 ${blurClass}`}>{bd.toll ? bd.toll.toLocaleString() : '-'}</td>
                                    <td className={`${cellBase} font-bold text-slate-600 ${blurClass}`}>{bd.driverCash ? bd.driverCash.toLocaleString() : '-'}</td>
                                    <td className={`${cellBase} ${blurClass}`}>{bd.repair ? bd.repair.toLocaleString() : '-'}</td>
                                    <td className={`${cellBase} text-red-500 ${blurClass}`}>{bd.police ? bd.police.toLocaleString() : '-'}</td>
                                    <td className={`${cellBase} ${blurClass}`}>{bd.other ? bd.other.toLocaleString() : '-'}</td>

                                    {/* Totals */}
                                    <td className={`${cellBase} font-bold text-red-600 bg-red-50/20 dark:bg-red-900/10 ${blurClass}`}>
                                        {trip.totalExpense.toLocaleString()}
                                    </td>
                                    <td className={`${cellBase} font-black text-emerald-600 bg-emerald-50/20 dark:bg-emerald-900/10 text-sm ${blurClass}`}>
                                        {trip.netProfit.toLocaleString()}
                                    </td>

                                    {/* Action (Sticky) */}
                                    <td className={`${cellBase} sticky right-0 z-10 ${rowBg} border-l-2 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]`} onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1.5 relative">
                                            {isLocked ? (
                                                <button onClick={() => onUnlockPremium && onUnlockPremium()} className="px-3 py-1.5 bg-amber-100 text-amber-600 rounded-lg flex items-center gap-1 animate-pulse hover:bg-amber-200 transition-colors shadow-sm">
                                                    <Lock size={12} strokeWidth={3} /> <span className="text-[9px] font-black uppercase">Unlock</span>
                                                </button>
                                            ) : (
                                                <div className="flex gap-1">
                                                    <button onClick={() => onPrintSingleTrip(trip)} className="w-8 h-8 flex items-center justify-center text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors" title="Print Trip"><Printer size={14}/></button>
                                                    <button onClick={() => onEditTrip(trip)} className="w-8 h-8 flex items-center justify-center text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 rounded-lg transition-colors" title="Edit"><Edit2 size={14}/></button>
                                                    <button onClick={() => setShareTrip(trip)} className="w-8 h-8 flex items-center justify-center text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 rounded-lg transition-colors" title="Share"><Share2 size={14}/></button>
                                                    <button onClick={() => onDeleteTrip(trip.id)} className="w-8 h-8 flex items-center justify-center text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg transition-colors" title="Delete"><Trash2 size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Locked Overlay Icon (Optional Extra Visual) */}
                                    {isLocked && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-full">
                                                <Crown size={20} className="text-amber-500/50" />
                                            </div>
                                        </div>
                                    )}
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={14} className="py-32 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                    No Trips in {dateFilter.label}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* 4. FOOTER ACTION */}
            <div className="shrink-0 p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <button 
                    onClick={onStartTrip}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-indigo-700"
                >
                    <IndianRupee size={18} /> Start New Trip
                </button>
            </div>

            {/* SHARE MODAL */}
            {shareTrip && createPortal(
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in font-sans">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShareTrip(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl animate-pop-in overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Digital Manifest</h3>
                            <button onClick={() => setShareTrip(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={16}/></button>
                        </div>
                        <div className="bg-slate-200 p-6 flex justify-center max-h-[55vh] overflow-y-auto no-scrollbar">
                            <div className="shadow-2xl rounded-xl overflow-hidden w-full">
                                <TripReceipt trip={shareTrip} id="trip-receipt-capture" />
                            </div>
                        </div>
                        <div className="p-5 bg-white border-t border-slate-100">
                            <button onClick={handleShareClick} disabled={sharing} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {sharing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                {sharing ? 'Generating Image...' : 'Share Full Receipt'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>,
        document.body
    );
};
