
import React from 'react';
import { Trip, TripExpense } from '../../types';
import { 
  ArrowLeft, Printer, Flag, Loader2, Plus, Edit2, Trash2, IndianRupee, 
  MapPin, Truck, User as UserIcon, CheckCircle2, 
  Fuel, Wallet, ShieldCheck 
} from 'lucide-react';
import { generateDiaryRows } from '../../utils/tripUtils';

interface Props {
    activeTrip: Trip;
    onBack: () => void;
    onPrint: () => void;
    onEndTrip: () => void;
    isEnding: boolean;
    onEditTrip: () => void;
    onEditExpense: (e: TripExpense) => void;
    onDelete: (id: string) => void;
    onAddExpense: () => void;
}

export const TripEditor: React.FC<Props> = ({ 
    activeTrip, onBack, onPrint, onEndTrip, isEnding, onEditTrip, onEditExpense, onDelete, onAddExpense 
}) => {
    const rows = generateDiaryRows(activeTrip);

    // Safe values with optional chaining
    const vehicleNum = activeTrip?.vehicleNumber || 'UNKNOWN';
    const tripNum = activeTrip?.tripNumber || '000';
    const routeFrom = activeTrip?.route?.from || 'ORIGIN';
    const routeTo = activeTrip?.route?.to || 'DEST';
    const party = activeTrip?.partyName || 'CASH';
    const freight = activeTrip?.freightAmount || 0;
    const expense = activeTrip?.totalExpense || 0;
    const profit = activeTrip?.netProfit || 0;

    return (
        <div className="h-full w-full overflow-y-auto no-scrollbar pt-4 px-5 pb-40 space-y-6 animate-fade-in">
            {/* HEADER AREA */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 active:scale-90 transition-all border border-slate-200 dark:border-white/10">
                        <ArrowLeft size={20} strokeWidth={3}/>
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{vehicleNum}</h2>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                            <Truck size={10} /> Manifest #{tripNum}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onPrint} className="p-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl active:scale-95 border border-slate-200 dark:border-white/10 shadow-sm">
                        <Printer size={20}/>
                    </button>
                    {activeTrip?.status === 'RUNNING' && (
                        <button onClick={onEndTrip} disabled={isEnding} className="px-5 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] active:scale-95 shadow-lg shadow-red-500/20 flex items-center gap-2">
                            {isEnding ? <Loader2 className="animate-spin" size={14} /> : <Flag size={14} fill="currentColor" />} Finish
                        </button>
                    )}
                </div>
            </div>

            {/* ROUTE & FREIGHT CARDS */}
            <div className="grid grid-cols-2 gap-3">
                <div onClick={onEditTrip} className="p-4 bg-slate-50 dark:bg-indigo-950/30 rounded-[1.5rem] border border-slate-100 dark:border-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-widest"><MapPin size={12}/> Route</div>
                        <Edit2 size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[13px] font-black text-slate-800 dark:text-white uppercase truncate">{routeFrom} ➝ {routeTo}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 truncate">{party}</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest"><IndianRupee size={12}/> Net Freight</div>
                    <p className="text-[13px] font-black text-emerald-700 dark:text-emerald-400">₹{freight.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                            <CheckCircle2 size={10} className="text-emerald-500" />
                            <span className="text-[8px] font-black uppercase text-emerald-600/60 tracking-widest">Inflow Validated</span>
                    </div>
                </div>
            </div>
            
            {/* VERTICAL TIMELINE */}
            <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:rounded-full">
                {rows.map((row, i) => (
                    <div key={i} className="relative animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className={`absolute -left-[31px] top-1 w-8 h-8 rounded-full border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center shadow-sm z-10 ${row.isStart ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>
                            {row.isStart ? <Truck size={14} /> : (row.particulars.toLowerCase().includes('fuel') ? <Fuel size={14} /> : <Wallet size={14} />)}
                        </div>

                        <div className={`p-5 rounded-[2rem] border transition-all ${row.isStart ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{row.date}</p>
                                        {row.time && <span className="text-[9px] font-bold text-slate-300">• {row.time}</span>}
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-1">{row.particulars}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><UserIcon size={10}/> {row.paidBy}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    {row.freight ? (
                                        <div className="flex flex-col items-end">
                                            <p className="text-sm font-black text-emerald-600">₹{row.freight.toLocaleString()}</p>
                                            <span className="text-[7px] font-black uppercase text-emerald-500/60 tracking-widest">Inflow</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <p className="text-sm font-black text-red-500">₹{row.expense.toLocaleString()}</p>
                                            <span className="text-[7px] font-black uppercase text-red-500/60 tracking-widest">Expense</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!row.isStart && (
                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-50 dark:border-white/5 mt-2">
                                    <button onClick={() => onEditExpense(row.original as TripExpense)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors active:scale-90"><Edit2 size={14}/></button>
                                    <button onClick={() => onDelete(row.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors active:scale-90"><Trash2 size={14}/></button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* INLINE DASHBOARD */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-white/5 p-6 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-8">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Projected Profit</p>
                        </div>
                        <h3 className={`text-2xl font-black tracking-tighter leading-none ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            ₹{profit.toLocaleString()}
                        </h3>
                    </div>
                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-center">Total Outflow</p>
                        <p className="text-sm font-black text-red-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/30">₹{expense.toLocaleString()}</p>
                    </div>
                </div>
                <button onClick={onAddExpense} className="w-14 h-14 bg-indigo-600 text-white rounded-[1.8rem] shadow-xl shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center">
                    <Plus size={28} strokeWidth={3}/>
                </button>
            </div>
        </div>
    );
};
