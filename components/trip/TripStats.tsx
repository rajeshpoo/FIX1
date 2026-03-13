
import React from 'react';
import { Wallet, Truck, ArrowUpRight, ArrowDownLeft, PieChart } from 'lucide-react';

interface Props {
    stats: { totalTrips: number; totalFreight: number; totalExp: number };
    onViewTrips: () => void;
    onViewFare: () => void;
    onViewExpenses: () => void;
    activeView: string;
}

export const TripStats: React.FC<Props> = ({ stats, onViewTrips, onViewFare, onViewExpenses }) => {
    // Format helper
    const formatCompact = (val: number) => {
        if (!val) return '0';
        if (val >= 10000000) return `${(val/10000000).toFixed(2)}Cr`;
        if (val >= 100000) return `${(val/100000).toFixed(2)}L`;
        if (val >= 1000) return `${(val/1000).toFixed(1)}k`;
        return val.toLocaleString('en-IN');
    };

    const profit = stats.totalFreight - stats.totalExp;

    return (
        <div className="mb-5 animate-fade-in w-full">
            <div className="bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden border border-slate-800 w-full">
                
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                    <PieChart size={180} />
                </div>

                {/* TOP SECTION: NET PROFIT - Ultra Compact */}
                <div className="pt-6 pb-4 px-4 text-center relative z-10">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/5 mb-2 backdrop-blur-md shadow-lg">
                        <Wallet size={10} className="text-emerald-400" />
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Net Profit</span>
                    </div>
                    <h2 className={`text-4xl font-black tracking-tighter ${profit >= 0 ? 'text-white' : 'text-red-400'}`}>
                        <span className="text-xl align-top opacity-50 mr-1 font-bold">₹</span>
                        {profit.toLocaleString('en-IN')}
                    </h2>
                </div>

                {/* BOTTOM SECTION: 3 ACTIONS IN ONE ROW - Compact Buttons */}
                <div className="bg-white/5 backdrop-blur-sm p-1.5 mx-1.5 mb-1.5 rounded-[1.6rem] grid grid-cols-3 gap-1.5 border border-white/5 relative z-10">
                    
                    {/* TRIPS */}
                    <button 
                        onClick={onViewTrips}
                        className="flex flex-col items-center justify-center py-3 rounded-[1.4rem] bg-white/5 hover:bg-white/10 transition-all active:scale-95 group"
                    >
                        <div className="mb-1 text-indigo-400 group-hover:scale-110 transition-transform bg-indigo-500/10 p-1 rounded-lg">
                            <Truck size={16} />
                        </div>
                        <span className="text-base font-black leading-none mb-0.5">{stats.totalTrips}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Trips</span>
                    </button>

                    {/* REVENUE */}
                    <button 
                        onClick={onViewFare}
                        className="flex flex-col items-center justify-center py-3 rounded-[1.4rem] bg-emerald-500/10 hover:bg-emerald-500/20 transition-all active:scale-95 group border border-emerald-500/10"
                    >
                        <div className="mb-1 text-emerald-400 group-hover:scale-110 transition-transform bg-emerald-500/10 p-1 rounded-lg">
                            <ArrowUpRight size={16} />
                        </div>
                        <span className="text-base font-black leading-none mb-0.5 text-emerald-100">{formatCompact(stats.totalFreight)}</span>
                        <span className="text-[8px] font-bold text-emerald-500/70 uppercase tracking-widest">Income</span>
                    </button>

                    {/* EXPENSE */}
                    <button 
                        onClick={onViewExpenses}
                        className="flex flex-col items-center justify-center py-3 rounded-[1.4rem] bg-red-500/10 hover:bg-red-500/20 transition-all active:scale-95 group border border-red-500/10"
                    >
                        <div className="mb-1 text-red-400 group-hover:scale-110 transition-transform bg-red-500/10 p-1 rounded-lg">
                            <ArrowDownLeft size={16} />
                        </div>
                        <span className="text-base font-black leading-none mb-0.5 text-red-100">{formatCompact(stats.totalExp)}</span>
                        <span className="text-[8px] font-bold text-red-500/70 uppercase tracking-widest">Expense</span>
                    </button>

                </div>
            </div>
        </div>
    );
};
