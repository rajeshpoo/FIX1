import React from 'react';
import { Search, MapPin, User as UserIcon, IndianRupee, Clock, Plus, ArrowRight } from 'lucide-react';
import { Vehicle, Trip } from '../../types';

interface ListProps {
  vehicles: Vehicle[];
  trips: Trip[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onStartTrip: (vId: string) => void;
  onAddExpense: (trip: Trip) => void;
  onEndTrip: (trip: Trip) => void;
}

export const VehicleTripList: React.FC<ListProps> = ({ 
  vehicles, trips, searchQuery, setSearchQuery, onStartTrip, onAddExpense, onEndTrip 
}) => {
  const getActiveTrip = (vNum: string) => trips.find(t => t.vehicleNumber === vNum && t.status === 'RUNNING');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search vehicle number..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm outline-none font-bold text-sm text-slate-900 dark:text-white" 
        />
      </div>

      {vehicles.map(v => {
        const activeTrip = getActiveTrip(v.number);
        return (
          <div key={v.id} className={`bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border ${activeTrip ? 'border-indigo-500/30' : 'border-slate-100 dark:border-slate-800'} relative overflow-hidden group transition-all duration-300`}>
            {activeTrip && (
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-2xl flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div> LIVE TRIP
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{v.number}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{v.ownerName}</p>
              </div>
            </div>

            {activeTrip ? (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-indigo-500" />
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">{activeTrip.route.from} <ArrowRight size={10} className="inline mx-1 opacity-40"/> {activeTrip.route.to}</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600">₹{activeTrip.freightAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><UserIcon size={12}/> {activeTrip.driverName}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {activeTrip.startDate}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => onAddExpense(activeTrip)} className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Add Expense</button>
                  <button onClick={() => onEndTrip(activeTrip)} className="py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-600/20">Finish Trip</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => onStartTrip(v.id)}
                className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-500 transition-all flex items-center justify-center gap-2 group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Start New Trip</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};