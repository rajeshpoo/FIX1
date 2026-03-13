
import React from 'react';
import { Trip, Vehicle } from '../../types';
import { Truck, MapPin, ArrowRight, User as UserIcon, Loader2, Wallet, Edit2, Fuel, Wrench, ShieldAlert, MoreHorizontal, Receipt, PlayCircle } from 'lucide-react';
import { TripCardSkeleton } from '../SkeletonLoader';

// --- VEHICLE LIST ---
interface VehicleGridProps {
    vehicles: Vehicle[];
    loading: boolean;
    onVehicleClick: (v: Vehicle) => void;
    getActiveTrip: (vNum: string) => Trip | undefined;
    getTripCount: (vNum: string) => number;
    getTripProfit?: (vNum: string) => number;
    onShowAll?: () => void;
    currentSort?: string;
}

export const VehicleGrid: React.FC<VehicleGridProps> = ({ 
    vehicles, loading, onVehicleClick, getActiveTrip, getTripCount, getTripProfit, onShowAll, currentSort
}) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 pb-32">
                {[1, 2, 3, 4].map(i => <TripCardSkeleton key={i} />)}
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 gap-4 pb-32">
            {vehicles.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                    <Truck size={32} className="mx-auto mb-2 text-slate-300"/>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Vehicles Found</p>
                </div>
            ) : (
                vehicles.map(vehicle => {
                    const activeTrip = getActiveTrip(vehicle.number);
                    const count = getTripCount(vehicle.number);
                    const profit = getTripProfit ? getTripProfit(vehicle.number) : 0;
                    const isRunning = !!activeTrip;

                    return (
                        <div 
                            key={vehicle.id} 
                            onClick={() => onVehicleClick(vehicle)}
                            className={`rounded-[2rem] p-5 shadow-sm border transition-all active:scale-[0.98] cursor-pointer group relative overflow-hidden ${
                                isRunning 
                                ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10' 
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                            }`}
                        >
                            {/* STATUS BADGES */}
                            {isRunning && (
                                <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-bl-2xl flex items-center gap-2 animate-fade-in shadow-md">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>
                                    RUNNING
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className={`text-xl font-black tracking-tight uppercase ${isRunning ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                        {vehicle.number}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                        <UserIcon size={10} /> {vehicle.ownerName || 'Unknown Owner'}
                                    </p>
                                </div>
                            </div>

                            {isRunning ? (
                                <div className="space-y-3 mt-4 pt-4 border-t border-emerald-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                            <MapPin size={14} className="animate-bounce" />
                                            <span className="text-xs font-black uppercase">{activeTrip.route.from} ➝ {activeTrip.route.to}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-600 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-500/20">₹{activeTrip.freightAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[9px] font-black text-emerald-600/70 uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><UserIcon size={10}/> {activeTrip.driverName}</span>
                                        <span className="w-1 h-1 bg-emerald-300 rounded-full"></span>
                                        <span>Since {activeTrip.startDate}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center mt-2">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{count} Total Trips</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Trip Profit</p>
                                        <p className={`text-sm font-black ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>₹{profit.toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

// --- EXPENSE LIST ---
interface ExpenseListProps {
    expenses: any[];
    onSelect: (e: any) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onSelect }) => {
    return (
        <div className="space-y-3 animate-fade-in pb-32">
            {expenses.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <Receipt size={32} className="mx-auto mb-2 text-slate-300"/>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Expenses Found</p>
                </div>
            ) : (
                expenses.map((exp, idx) => (
                    <div 
                        key={exp.id || idx} 
                        onClick={() => onSelect(exp)}
                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex justify-between items-center group active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                exp.type === 'FUEL' ? 'bg-amber-50 text-amber-600' :
                                exp.type === 'TOLL' ? 'bg-blue-50 text-blue-600' :
                                'bg-indigo-50 text-indigo-600'
                            }`}>
                                {exp.type === 'FUEL' ? <Fuel size={18}/> : exp.type === 'TOLL' ? <Receipt size={18}/> : <Wallet size={18}/>}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2 truncate">
                                    {exp.type.replace('_', ' ')} • {exp.vehicleNumber}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">{exp.date}</span>
                                    {exp.notes && <span className="text-[9px] font-medium text-slate-300 dark:text-slate-600 truncate max-w-[100px]">{exp.notes}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-black text-red-500">₹{exp.amount.toLocaleString()}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{exp.paidBy || 'OWNER'}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
