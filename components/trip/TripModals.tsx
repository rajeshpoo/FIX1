
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, FileSpreadsheet, FileText, Calendar, User as UserIcon, MapPin, Briefcase, IndianRupee, Clock, Fuel, Grid, Wrench, ShieldAlert, MoreHorizontal, Save, Loader2, Truck, AlertTriangle, ArrowLeft, Plus, Lock, Trash2, Smartphone, ChevronRight, ArrowRight, UserCheck } from 'lucide-react';
import { notify } from '../../services/firebaseService';
import { DeleteModal } from '../DeleteModal';
import { getIndianDate, getIndianTime } from '../../utils/helpers';

const InputWrapper: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-1.5 group">
    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5 group-focus-within:text-indigo-500 transition-colors">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

// Reduced padding from p-5 to p-3, gap from 2.5 to 1.5 for compactness
const CategoryButton: React.FC<{ id: string; label: string; icon: React.ReactNode; selected: boolean; onClick: () => void; colorClass: string }> = ({ id, label, icon, selected, onClick, colorClass }) => (
    <button 
        type="button"
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95 shadow-sm ${
            selected 
            ? `bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-500 shadow-indigo-500/20` 
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
    >
        <div className={`${selected ? 'text-white' : colorClass}`}>{icon}</div>
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
);

export const ExportMenuModal: React.FC<{ onClose: () => void; onExport: (format: 'xlsx' | 'pdf') => void; isPremium?: boolean }> = ({ onClose, onExport, isPremium = false }) => createPortal(
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-sm:w-full max-w-sm bg-white dark:bg-slate-950 rounded-[3rem] p-8 shadow-2xl animate-pop-in border border-slate-100 dark:border-white/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg"><FileText size={20}/></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Export Data</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Output Format</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={20}/></button>
            </div>
            <div className="space-y-4">
                <button 
                    onClick={() => onExport('xlsx')} 
                    className={`w-full p-6 rounded-[1.8rem] border flex items-center gap-5 hover:shadow-xl transition-all active:scale-95 group ${
                        !isPremium 
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-80' 
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-500/20'
                    }`}
                >
                    <div className={`p-3.5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform ${!isPremium ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-white dark:bg-slate-800 text-emerald-600'}`}>
                        {!isPremium ? <Lock size={28} /> : <FileSpreadsheet size={28}/>}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                        <p className={`font-black text-sm flex items-center gap-2 ${!isPremium ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            Excel Sheet {!isPremium && <span className="text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase">Premium</span>}
                        </p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${!isPremium ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {isPremium ? 'Full Ledger' : 'Tap to Unlock'}
                        </p>
                    </div>
                </button>
                <button onClick={() => onExport('pdf')} className="w-full p-6 bg-slate-50 dark:bg-white/5 rounded-[1.8rem] border border-slate-100 dark:border-white/10 flex items-center gap-5 hover:shadow-xl transition-all active:scale-95 group">
                    <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 shadow-sm group-hover:scale-110 transition-transform"><FileText size={28}/></div>
                    <div className="text-left">
                        <p className="font-black text-sm text-slate-900 dark:text-white">Printable PDF</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Formatted Document View</p>
                    </div>
                </button>
            </div>
        </div>
    </div>,
    document.body
);

export const TripFormModal: React.FC<{ isOpen: boolean; onClose: () => void; isEdit: boolean; initialData: any; onSave: (data: any) => void; onAddExpenseClick?: () => void }> = ({ isOpen, onClose, isEdit, initialData, onSave, onAddExpenseClick }) => {
    const [form, setForm] = React.useState(initialData);
    useEffect(() => setForm(initialData), [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Validation for Dates
        if (form.date && form.endDate && new Date(form.endDate) < new Date(form.date)) {
            notify("Invalid Date", "End date cannot be before start date", "error");
            return;
        }
        onSave(form);
    };

    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[6000] flex items-end sm:items-center justify-center animate-fade-in font-sans">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-md:max-w-md bg-white dark:bg-slate-950 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl p-8 animate-slide-up border border-slate-200 dark:border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar pb-12">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">{isEdit ? 'Edit Loading' : 'New Trip Entry'}</h3>
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Manifest Data</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEdit && onAddExpenseClick && (
                            <button 
                                type="button"
                                onClick={onAddExpenseClick}
                                className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all"
                            >
                                <Plus size={20} strokeWidth={3} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 active:scale-90 transition-all border border-slate-200 dark:border-white/5"><X size={22}/></button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <InputWrapper label="Trip Date" icon={<Calendar size={12}/>}>
                            <input type="date" required value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-black text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" />
                        </InputWrapper>
                        <InputWrapper label="Driver Name" icon={<UserIcon size={12}/>}>
                            <input required placeholder="Enter Name" value={form.driver || ''} onChange={e => setForm({...form, driver: e.target.value.toUpperCase()})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-black text-sm border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all uppercase shadow-sm" />
                        </InputWrapper>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputWrapper label="Loading From" icon={<MapPin size={12}/>}> <input required placeholder="Origin City" value={form.from || ''} onChange={e => setForm({...form, from: e.target.value.toUpperCase()})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-black text-sm uppercase border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" /> </InputWrapper>
                        <InputWrapper label="Destination" icon={<MapPin size={12}/>}> <input required placeholder="Delivery City" value={form.to || ''} onChange={e => setForm({...form, to: e.target.value.toUpperCase()})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-black text-sm uppercase border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" /> </InputWrapper>
                    </div>
                    <InputWrapper label="Party/Consignor" icon={<Briefcase size={12}/>}> <input required placeholder="Party/Owner Name" value={form.party || ''} onChange={e => setForm({...form, party: e.target.value.toUpperCase()})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-black text-sm uppercase border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm" /> </InputWrapper>
                    
                    {/* Broker Fields */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <InputWrapper label="Broker Name" icon={<UserCheck size={12}/>}> 
                            <input placeholder="Optional" value={form.brokerName || ''} onChange={e => setForm({...form, brokerName: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 outline-none font-bold text-xs uppercase border border-slate-200 dark:border-slate-800 focus:border-indigo-500 transition-all" /> 
                        </InputWrapper>
                        <InputWrapper label="Commission" icon={<IndianRupee size={12}/>}> 
                            <input type="number" placeholder="0" value={form.brokerAmount || ''} onChange={e => setForm({...form, brokerAmount: e.target.value})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 outline-none font-bold text-xs border border-slate-200 dark:border-slate-800 focus:border-indigo-500 transition-all" /> 
                        </InputWrapper>
                    </div>

                    <div className="bg-indigo-600 rounded-[2.2rem] p-7 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee size={80}/></div>
                        <InputWrapper label="Net Freight (bhada)" icon={<IndianRupee size={12} className="text-indigo-200"/>}> 
                            <input type="number" required placeholder="0" value={form.freight || ''} onChange={e => setForm({...form, freight: e.target.value})} className="w-full bg-transparent text-5xl font-black outline-none placeholder:text-indigo-400 tracking-tighter" /> 
                        </InputWrapper>
                    </div>
                    <button className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all"> {isEdit ? 'Save Changes' : 'Confirm Loading'} </button>
                </form>
            </div>
        </div>, document.body
    );
};

export const ExpenseFormModal: React.FC<{ isOpen: boolean; onClose: () => void; isEdit: boolean; initialData: any; onSave: (data: any) => void }> = ({ isOpen, onClose, isEdit, initialData, onSave }) => {
    const [form, setForm] = React.useState(initialData);
    useEffect(() => setForm(initialData), [initialData]);

    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center animate-fade-in font-sans">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-md:max-w-md bg-white dark:bg-slate-950 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl p-6 animate-slide-up border border-slate-100 dark:border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar pb-12">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">{isEdit ? 'Edit Outflow' : 'Record Expense'}</h3>
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Operational Cost Entry</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 active:scale-90 transition-all border border-slate-200 dark:border-white/5"><X size={20}/></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <InputWrapper label="Date" icon={<Calendar size={12}/>}>
                            <input type="date" required value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-black text-xs shadow-sm border border-transparent focus:border-indigo-500 transition-all" />
                        </InputWrapper>
                        <InputWrapper label="Time" icon={<Clock size={12}/>}>
                            <input type="time" value={form.time || ''} onChange={e => setForm({...form, time: e.target.value})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 outline-none font-black text-xs shadow-sm border border-transparent focus:border-indigo-500 transition-all" />
                        </InputWrapper>
                    </div>
                    
                    {/* Compact Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        <CategoryButton id="FUEL" label="Diesel" icon={<Fuel size={18}/>} selected={form.type === 'FUEL'} onClick={() => setForm({...form, type: 'FUEL'})} colorClass="text-amber-500" />
                        <CategoryButton id="TOLL" label="Toll/Tax" icon={<Grid size={18}/>} selected={form.type === 'TOLL'} onClick={() => setForm({...form, type: 'TOLL'})} colorClass="text-blue-500" />
                        <CategoryButton id="DRIVER_CASH" label="Driver" icon={<UserIcon size={18}/>} selected={form.type === 'DRIVER_CASH'} onClick={() => setForm({...form, type: 'DRIVER_CASH'})} colorClass="text-indigo-500" />
                        <CategoryButton id="REPAIR" label="Repair" icon={<Wrench size={18}/>} selected={form.type === 'REPAIR'} onClick={() => setForm({...form, type: 'REPAIR'})} colorClass="text-slate-500" />
                        <CategoryButton id="POLICE" label="RTO/Challan" icon={<ShieldAlert size={18}/>} selected={form.type === 'POLICE'} onClick={() => setForm({...form, type: 'POLICE'})} colorClass="text-red-500" />
                        <CategoryButton id="OTHER" label="Misc" icon={<MoreHorizontal size={18}/>} selected={form.type === 'OTHER'} onClick={() => setForm({...form, type: 'OTHER'})} colorClass="text-emerald-500" />
                    </div>

                    {/* Compact Amount Card */}
                    <div className="bg-slate-950/5 dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-white/5 text-center shadow-inner">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-2xl font-black text-slate-300 dark:text-slate-700">₹</span>
                            <input type="number" required autoFocus placeholder="0" value={form.amount || ''} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-transparent text-4xl font-black text-center outline-none text-red-600 tracking-tighter" />
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Enter Final Value</p>
                    </div>

                    <InputWrapper label="Paid By / Notes" icon={<UserIcon size={12}/>}> 
                        <input type="text" placeholder="Driver Cash, Owner Pay, etc." value={form.paidBy || ''} onChange={e => setForm({...form, paidBy: e.target.value.toUpperCase()})} className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none font-black text-xs uppercase transition-all shadow-sm" /> 
                    </InputWrapper>
                    <button className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all"> {isEdit ? 'Update Ledger' : 'Sync Entry'} </button>
                </form>
            </div>
        </div>, document.body
    );
};

export const StartTripModal: React.FC<{ isOpen: boolean; onClose: () => void; onNext: (vNum: string) => void }> = ({ isOpen, onClose, onNext }) => {
    const [num, setNum] = useState('');
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-sm:w-full max-w-sm bg-white dark:bg-slate-950 rounded-[3rem] p-10 shadow-2xl animate-pop-in border border-slate-100 dark:border-white/10 text-center">
                <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30 rotate-3">
                    <Truck size={48} strokeWidth={2.5} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-3">Vehicle Select</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">Assign loading to truck</p>
                <div className="space-y-8 text-left">
                    <InputWrapper label="Vehicle Number" icon={<Smartphone size={12}/>}>
                        <input 
                            required 
                            autoFocus 
                            placeholder="MH 12 AB 1234" 
                            value={num} 
                            onChange={e => setNum(e.target.value.toUpperCase())} 
                            className="w-full p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-transparent focus:border-indigo-500 outline-none font-black text-3xl text-center uppercase tracking-tight shadow-inner" 
                        />
                    </InputWrapper>
                    <button 
                        onClick={() => onNext(num)}
                        disabled={!num.trim()}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50"
                    >
                        Go to Manifest <ArrowRight className="inline ml-1" size={16} />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Replaced custom implementation with the shared DeleteModal wrapper for standardization
export const DeleteConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onDelete: () => void; isTrip?: boolean }> = ({ isOpen, onClose, onDelete, isTrip }) => {
    return (
        <DeleteModal 
            isOpen={isOpen}
            onClose={onClose}
            onDelete={onDelete}
            title={isTrip ? "Delete Manifest?" : "Remove Entry?"}
            warningText="Permanent deletion: this cannot be reversed."
        />
    );
};

export const BillGenerationModal: React.FC<{ isOpen: boolean; onClose: () => void; initialData: any; onSave: (data: any) => void }> = ({ isOpen, onClose, initialData, onSave }) => {
    const [form, setForm] = useState(initialData);
    
    useEffect(() => {
        setForm(initialData);
    }, [initialData]);

    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-sm:w-full max-w-sm bg-white dark:bg-slate-950 rounded-[3rem] p-8 shadow-2xl animate-pop-in border border-slate-100 dark:border-white/10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Bill Details</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finalize Manifest</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={20}/></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-6">
                    <InputWrapper label="Invoice Number" icon={<FileText size={12}/>}>
                        <input required value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value.toUpperCase()})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm shadow-sm" placeholder="INV-001" />
                    </InputWrapper>
                    <InputWrapper label="Bill Date" icon={<Calendar size={12}/>}>
                        <input type="date" required value={form.billDate} onChange={e => setForm({...form, billDate: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm shadow-sm" />
                    </InputWrapper>
                    <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl shadow-indigo-500/20">Finalize Bill</button>
                </form>
            </div>
        </div>,
        document.body
    );
};

export const DateFilterModal: React.FC<{ onClose: () => void; onApply: (filter: any) => void }> = ({ onClose, onApply }) => {
    const [type, setType] = useState('ALL');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [month, setMonth] = useState('');

    const handleApply = () => {
        let label = 'All Time';
        if (type === 'MONTH' && month) {
            const date = new Date(month + '-01');
            label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        } else if (type === 'RANGE' && start && end) {
            label = `${start} to ${end}`;
        }
        onApply({ type, value: month, start, end, label });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-sm:w-full max-w-sm bg-white dark:bg-slate-950 rounded-[3rem] p-8 shadow-2xl animate-pop-in border border-slate-100 dark:border-white/10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Filter Fleet</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Date Range</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-all"><X size={20}/></button>
                </div>
                <div className="space-y-6">
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl shadow-inner">
                        {['ALL', 'MONTH', 'RANGE'].map(t => (
                            <button key={t} onClick={() => setType(t)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${type === t ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' : 'text-slate-500'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    
                    {type === 'MONTH' && (
                        <InputWrapper label="Select Month" icon={<Calendar size={12}/>}>
                            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-sm shadow-sm" />
                        </InputWrapper>
                    )}
                    
                    {type === 'RANGE' && (
                        <div className="grid grid-cols-2 gap-4">
                            <InputWrapper label="Start Date" icon={<Calendar size={12}/>}>
                                <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-xs shadow-sm" />
                            </InputWrapper>
                            <InputWrapper label="End Date" icon={<Calendar size={12}/>}>
                                <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-xs shadow-sm" />
                            </InputWrapper>
                        </div>
                    )}
                    
                    <button onClick={handleApply} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl shadow-indigo-500/20">Apply Filters</button>
                </div>
            </div>
        </div>,
        document.body
    );
};
