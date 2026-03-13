import React from 'react';
import { X, Truck, MapPin, IndianRupee, User as UserIcon, Calendar, Save, Loader2, Fuel, Receipt, CheckCircle2, Flag, ArrowRight, Clock, ShieldAlert, Wrench, MoreHorizontal } from 'lucide-react';
import { Trip } from '../../types';

interface ModalProps {
  type: 'NONE' | 'START_TRIP' | 'ADD_EXPENSE' | 'END_TRIP';
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: any;
  setForm: (f: any) => void;
  isSaving: boolean;
  activeTrip?: Trip | null;
}

const InputWrapper: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

export const TripActionModals: React.FC<ModalProps> = ({ type, onClose, onSubmit, form, setForm, isSaving, activeTrip }) => {
  if (type === 'NONE') return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up border border-slate-100 dark:border-white/10">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-slate-50 dark:border-white/5 bg-white dark:bg-slate-950 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">
              {type === 'START_TRIP' ? 'Start New Loading' : type === 'ADD_EXPENSE' ? 'Add Expense' : 'Finish Trip'}
            </h3>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
              {type === 'START_TRIP' ? 'Fleet Management' : type === 'ADD_EXPENSE' ? 'Financial Log' : 'Manifest Settlement'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-white dark:bg-slate-950">
          <form id="tripActionForm" onSubmit={onSubmit} className="space-y-6">
            {type === 'START_TRIP' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <InputWrapper label="Trip Date" icon={<Calendar size={12}/>}>
                    <input required type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-bold text-sm" />
                  </InputWrapper>
                  <InputWrapper label="Truck No." icon={<Truck size={12}/>}>
                    <input required placeholder="Vehicle No" value={form.vehicleNumber} onChange={e => setForm({...form, vehicleNumber: e.target.value.toUpperCase()})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-black text-sm uppercase" />
                  </InputWrapper>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputWrapper label="From" icon={<MapPin size={12}/>}>
                    <input required placeholder="City A" value={form.route.from} onChange={e => setForm({...form, route: {...form.route, from: e.target.value.toUpperCase()}})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-bold text-sm uppercase" />
                  </InputWrapper>
                  <InputWrapper label="To" icon={<MapPin size={12}/>}>
                    <input required placeholder="City B" value={form.route.to} onChange={e => setForm({...form, route: {...form.route, to: e.target.value.toUpperCase()}})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-bold text-sm uppercase" />
                  </InputWrapper>
                </div>
                <InputWrapper label="Driver Name" icon={<UserIcon size={12}/>}>
                  <input required placeholder="Enter Driver Name" value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value.toUpperCase()})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-bold text-sm uppercase" />
                </InputWrapper>
                <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee size={80}/></div>
                   <InputWrapper label="Freight Amount" icon={<IndianRupee size={12} className="text-indigo-200"/>}>
                    <input required type="number" placeholder="0" value={form.freightAmount} onChange={e => setForm({...form, freightAmount: e.target.value})} className="w-full bg-transparent border-none text-4xl font-black outline-none placeholder:text-indigo-400" />
                   </InputWrapper>
                </div>
              </>
            )}

            {type === 'ADD_EXPENSE' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div 
                        onClick={() => setForm({...form, type: 'FUEL'})}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${form.type === 'FUEL' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                    >
                        <Fuel size={24} />
                        <span className="text-[10px] font-black uppercase">Diesel</span>
                    </div>
                    <div 
                        onClick={() => setForm({...form, type: 'TOLL'})}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${form.type === 'TOLL' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                    >
                        <Receipt size={24} />
                        <span className="text-[10px] font-black uppercase">Toll Tax</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputWrapper label="Date" icon={<Calendar size={12}/>}>
                    <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-bold text-sm" />
                  </InputWrapper>
                  <InputWrapper label="Paid By" icon={<UserIcon size={12}/>}>
                    <select value={form.paidBy} onChange={e => setForm({...form, paidBy: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-bold text-sm appearance-none">
                        <option value="OWNER">OWNER</option>
                        <option value="DRIVER">DRIVER</option>
                    </select>
                  </InputWrapper>
                </div>
                <div className="bg-red-500 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee size={80}/></div>
                   <InputWrapper label="Expense Amount" icon={<IndianRupee size={12} className="text-red-200"/>}>
                    <input required type="number" autoFocus placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-transparent border-none text-4xl font-black outline-none placeholder:text-red-300" />
                   </InputWrapper>
                </div>
              </div>
            )}

            {type === 'END_TRIP' && (
              <div className="text-center py-4 space-y-6">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={40} />
                </div>
                <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Complete Manifest?</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium px-4 mt-2">This will move the trip to history and finalize the ledger entries for this vehicle.</p>
                </div>
                {activeTrip && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5 text-left">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Fare</span>
                            <span className="text-sm font-black text-indigo-600">₹{activeTrip.freightAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expenses</span>
                            <span className="text-sm font-black text-red-500">₹{activeTrip.totalExpense.toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 my-3"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Profit</span>
                            <span className="text-lg font-black text-emerald-600">₹{activeTrip.netProfit.toLocaleString()}</span>
                        </div>
                    </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-6 border-t border-slate-50 dark:border-white/5 bg-white dark:bg-slate-950">
          <button 
            type="submit" 
            form="tripActionForm" 
            disabled={isSaving}
            className={`w-full py-5 rounded-[1.8rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${
                type === 'END_TRIP' ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
            }`}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : (
                <>
                  {type === 'START_TRIP' ? 'Start Journey' : type === 'ADD_EXPENSE' ? 'Save Expense' : 'Confirm Settlement'}
                  <ArrowRight size={18} />
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};