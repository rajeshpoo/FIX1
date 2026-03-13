
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FirebaseUser } from '../types';
import { Bilty, UserProfile } from '../types';
import { 
    saveBilty, subscribeToBilties, notify, subscribeToUserProfile, deleteBilty, updateBusinessProfile
} from '../services/firebaseService';
import { 
    ArrowLeft, Search, Plus, FileText, Calendar, User as UserIcon, 
    MapPin, Box, Truck, IndianRupee, Printer, Share2, Trash2,
    Save, Loader2, MoreHorizontal, Phone, FileDigit, Building2, X, Edit2, CheckCircle2,
    UserCheck, Wallet, Scale, Briefcase, Users, Calculator, ShieldCheck
} from 'lucide-react';
import { generateBiltyPDF } from '../utils/biltyUtils';
import { BiltyReceipt } from './VisualReceipts';
import { ShareWrapper } from './ShareWrapper';
import { DeleteModal } from './DeleteModal';
import { PricingModal } from './PricingModal';
import { hapticFeedback } from '../utils/haptics';
import { getIndianDate } from '../utils/helpers';

interface Props { 
    user: FirebaseUser; 
    onBack: () => void; 
    initialSearch?: string; 
}

const InputWrapper: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ label, icon, children, className }) => (
  <div className={`space-y-1.5 flex-1 ${className}`}>
    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
      {icon} {label}
    </label>
    {children}
  </div>
);

export const BiltyBook: React.FC<Props> = ({ user, onBack, initialSearch }) => {
    // State
    const [bilties, setBilties] = useState<Bilty[]>([]);
    
    // View Init based on hash
    const getInitialView = () => {
        const h = window.location.hash;
        if (h === '#create-bilty') return 'CREATE';
        return 'LIST';
    };
    const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL'>(getInitialView);
    
    const [searchQuery, setSearchQuery] = useState(initialSearch || '');
    const [selectedBilty, setSelectedBilty] = useState<Bilty | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [shareBilty, setShareBilty] = useState<Bilty | null>(null);
    const [biltyToDelete, setBiltyToDelete] = useState<Bilty | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    
    // Business Profile State
    const [showBusinessModal, setShowBusinessModal] = useState(false);
    const [businessForm, setBusinessForm] = useState({ companyName: '', address: '', contact: '', gst: '' });

    // Form State
    const emptyBilty: Bilty = {
        id: '',
        biltyNumber: '',
        date: getIndianDate(),
        invoiceNo: '',
        vehicleNumber: '',
        driverName: '',
        driverMobile: '',
        fromStation: '',
        toStation: '',
        consignor: { name: '', gst: '', address: '' },
        consignee: { name: '', gst: '', address: '' },
        itemDetails: { description: '', weight: '', packages: '', rate: 0 },
        freight: { amount: 0, advance: 0, balance: 0, paymentType: 'To Pay', labour: 0, kanta: 0, otherCh: 0 },
        
        // Defaults
        billTo: 'BROKER',
        brokerName: '',
        brokerMobile: '',
        hiringPartyName: '',
        hiringPartyMobile: '',
        declaredValue: 0,
        
        createdAt: 0
    };

    const [form, setForm] = useState<Bilty>(emptyBilty);

    // --- HISTORY LISTENER (FIXED) ---
    // Only handle back button logic here.
    useEffect(() => {
        const handlePopState = () => {
            const hash = window.location.hash;
            if (!hash || hash === '') {
                setView('LIST');
                setSelectedBilty(null); // Clear selection
            } else if (hash === '#create-bilty') {
                setView('CREATE');
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const pushView = (newView: typeof view, hash: string) => {
        if (view === newView) return;
        hapticFeedback(10);
        // CRITICAL FIX: Preserve existing history state
        const currentState = window.history.state || {};
        window.history.pushState(currentState, '', hash);
        setView(newView);
    };

    useEffect(() => {
        const unsubBilties = subscribeToBilties(user.uid, setBilties);
        const unsubProfile = subscribeToUserProfile(user.uid, (p) => {
            setProfile(p);
            if (p?.business) setBusinessForm(p.business as any);
        });
        return () => { unsubBilties(); unsubProfile(); };
    }, [user.uid]);

    // AI Integration
    useEffect(() => {
        const handleOpenCreate = () => {
            const nextNum = (bilties.length + 1).toString().padStart(3, '0');
            setForm({ ...emptyBilty, biltyNumber: nextNum });
            pushView('CREATE', '#create-bilty');
        };
        const handleUpdateData = (e: CustomEvent) => {
            if (view !== 'CREATE') {
                const nextNum = (bilties.length + 1).toString().padStart(3, '0');
                setForm({ ...emptyBilty, biltyNumber: nextNum });
                pushView('CREATE', '#create-bilty');
            }
            const data = e.detail;
            setForm(prev => {
                const newData = { ...prev };
                if (data.vehicleNumber) newData.vehicleNumber = data.vehicleNumber.toUpperCase();
                if (data.date) newData.date = data.date;
                if (data.fromStation) newData.fromStation = data.fromStation.toUpperCase();
                if (data.toStation) newData.toStation = data.toStation.toUpperCase();
                if (data.driverName) newData.driverName = data.driverName.toUpperCase();
                if (data.driverMobile) newData.driverMobile = data.driverMobile;
                if (data.invoiceNo) newData.invoiceNo = data.invoiceNo.toUpperCase();
                
                // Nested updates
                if (data.consignorName) newData.consignor = { ...newData.consignor, name: data.consignorName.toUpperCase() };
                if (data.consigneeName) newData.consignee = { ...newData.consignee, name: data.consigneeName.toUpperCase() };
                
                if (data.itemDetails) {
                    newData.itemDetails = { ...newData.itemDetails, ...data.itemDetails };
                }
                if (data.freight) {
                    newData.freight = { ...newData.freight, ...data.freight };
                    // Recalculate balance
                    newData.freight.balance = (newData.freight.amount || 0) - (newData.freight.advance || 0);
                }
                if (data.brokerName) {
                    newData.billTo = 'BROKER';
                    newData.brokerName = data.brokerName.toUpperCase();
                }
                return newData;
            });
        };

        window.addEventListener('bilty-open-create', handleOpenCreate);
        window.addEventListener('bilty-update-data' as any, handleUpdateData);
        return () => {
            window.removeEventListener('bilty-open-create', handleOpenCreate);
            window.removeEventListener('bilty-update-data' as any, handleUpdateData);
        };
    }, [bilties.length, view]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        hapticFeedback(30);
        setIsSaving(true);
        try {
            // Calculate Grand Total
            const basic = Number(form.freight.amount) || 0;
            const labour = Number(form.freight.labour) || 0;
            const kanta = Number(form.freight.kanta) || 0;
            const other = Number(form.freight.otherCh) || 0;
            const total = basic + labour + kanta + other;
            const advance = Number(form.freight.advance) || 0;

            const biltyData = {
                ...form,
                id: form.id || `lr-${Date.now()}`,
                createdAt: form.createdAt || Date.now(),
                // Ensure calculations are correct before save
                freight: {
                    ...form.freight,
                    amount: basic, // Store basic separately
                    labour, kanta, otherCh: other,
                    balance: total - advance
                }
            };
            
            // saveBilty now internally calls syncBiltyLedger, ensuring atomic updates and idempotency
            await saveBilty(user.uid, biltyData);
            
            notify("Saved", `LR ${biltyData.biltyNumber} Generated & Ledger Updated`, "success");
            window.history.back(); // Go back to list
        } catch (error) {
            console.error(error);
            notify("Error", "Could not save Bilty", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBusinessUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateBusinessProfile(user.uid, businessForm);
        setShowBusinessModal(false);
        notify("Updated", "Company details saved", "success");
    };

    const renderList = () => (
        <div className="space-y-6 animate-fade-in relative">
            <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mx-5 px-5 border-b border-slate-100 dark:border-slate-800/50 shadow-sm mb-5 transition-all">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5 cursor-pointer" onClick={onBack}>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 shadow-sm active:scale-90 transition-all">
                            <ArrowLeft size={20} strokeWidth={3} className="text-slate-600 dark:text-slate-300"/>
                        </div>
                        <div><h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Bilty Book</h2></div>
                    </div>
                    <button onClick={() => {
                        const nextNum = (bilties.length + 1).toString().padStart(3, '0');
                        setForm({ ...emptyBilty, biltyNumber: nextNum });
                        pushView('CREATE', '#create-bilty');
                    }} className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-[1.2rem] shadow-lg active:scale-95 transition-all">
                        <Plus size={26} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Business Header Card */}
            <div onClick={() => setShowBusinessModal(true)} className="bg-slate-900 dark:bg-slate-800 rounded-[1.8rem] p-5 text-white shadow-xl relative overflow-hidden cursor-pointer group active:scale-[0.99] transition-all">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Building2 size={10}/> Business Profile</p>
                        <h3 className="text-lg font-black leading-tight">{profile?.business?.companyName || 'Setup Company Name'}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">{profile?.business?.address || 'Tap to add address & logo'}</p>
                    </div>
                    <div className="p-2 bg-white/10 rounded-xl"><Edit2 size={16}/></div>
                </div>
            </div>

            <div className="relative mb-6">
               <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input type="text" placeholder="Search LR, Party, Truck..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl outline-none text-slate-900 dark:text-white font-bold text-sm shadow-sm" />
            </div>

            <div className="space-y-4">
                {bilties.filter(b => 
                    b.biltyNumber.includes(searchQuery) || 
                    b.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    b.consignor.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(b => (
                    <div 
                        key={b.id} 
                        onClick={() => { 
                            setSelectedBilty(b); 
                            pushView('DETAIL', '#bilty-detail'); 
                        }} 
                        className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] shadow-sm border border-slate-100 dark:border-white/5 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-2xl">
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">LR #{b.biltyNumber}</span>
                        </div>
                        
                        <div className="mb-3">
                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{b.vehicleNumber}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                <Calendar size={10} /> {b.date}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase">From</p>
                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{b.fromStation}</p>
                            </div>
                            <ArrowLeft size={14} className="text-slate-300 rotate-180" />
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                                <p className="text-[8px] font-black text-slate-400 uppercase">To</p>
                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{b.toStation}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-white/5 mb-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[150px]">
                                {b.billTo === 'BROKER' ? (b.brokerName || 'BROKER') : (b.hiringPartyName || b.consignor.name)}
                            </p>
                            <p className="text-sm font-black text-indigo-600">₹{b.freight.amount.toLocaleString()}</p>
                        </div>

                        {/* NEW QUICK ACTIONS BAR */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-white/5" onClick={e => e.stopPropagation()}>
                            <button 
                                onClick={() => { setForm(b); pushView('CREATE', '#create-bilty'); }} 
                                className="flex-1 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                            >
                                <Edit2 size={12} /> Edit
                            </button>
                            <button 
                                onClick={() => generateBiltyPDF(b, profile?.business)} 
                                className="flex-1 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                            >
                                <Printer size={12} /> Print
                            </button>
                            <button 
                                onClick={() => setBiltyToDelete(b)} 
                                className="flex-1 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                            >
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCreate = () => (
        <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 py-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => window.history.back()} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-500 shadow-sm border border-slate-100 dark:border-white/5 active:scale-90 transition-all"><ArrowLeft size={20}/></button>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">New LR</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manifest #{form.biltyNumber}</p>
                    </div>
                </div>
                <button type="submit" form="biltyForm" disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-2">
                    {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Save
                </button>
            </div>

            <form id="biltyForm" onSubmit={handleSave} className="space-y-6 max-w-lg mx-auto">
                <div className="grid grid-cols-3 gap-3">
                    <InputWrapper label="LR Number" icon={<FileDigit size={12}/>}>
                        <input required value={form.biltyNumber} onChange={e => setForm({...form, biltyNumber: e.target.value})} className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 font-black text-sm uppercase shadow-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
                    </InputWrapper>
                    <InputWrapper label="Date" icon={<Calendar size={12}/>}>
                        <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 font-bold text-sm shadow-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
                    </InputWrapper>
                    <InputWrapper label="Invoice No" icon={<FileText size={12}/>}>
                        <input placeholder="INV-001" value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value.toUpperCase()})} className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 font-bold text-sm uppercase shadow-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
                    </InputWrapper>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] shadow-sm space-y-4 border border-slate-100 dark:border-white/5">
                    <InputWrapper label="Vehicle Number" icon={<Truck size={12}/>}>
                        <input required placeholder="MH 12 AB 1234" value={form.vehicleNumber} onChange={e => setForm({...form, vehicleNumber: e.target.value.toUpperCase()})} className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 font-black text-lg uppercase outline-none" />
                    </InputWrapper>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <InputWrapper label="Driver Name" icon={<UserIcon size={12}/>}>
                            <input placeholder="DRIVER NAME" value={form.driverName || ''} onChange={e => setForm({...form, driverName: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 font-bold text-xs uppercase outline-none" />
                        </InputWrapper>
                        <InputWrapper label="Driver Mobile" icon={<Phone size={12}/>}>
                            <input type="tel" placeholder="9876543210" value={form.driverMobile || ''} onChange={e => setForm({...form, driverMobile: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 font-bold text-xs outline-none" />
                        </InputWrapper>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputWrapper label="From" icon={<MapPin size={12}/>}><input required placeholder="Origin" value={form.fromStation} onChange={e => setForm({...form, fromStation: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 font-bold text-xs uppercase outline-none" /></InputWrapper>
                        <InputWrapper label="To" icon={<MapPin size={12}/>}><input required placeholder="Dest" value={form.toStation} onChange={e => setForm({...form, toStation: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 font-bold text-xs uppercase outline-none" /></InputWrapper>
                    </div>
                </div>

                <div className="bg-indigo-50 dark:bg-slate-900/50 p-5 rounded-[1.8rem] space-y-4 border-2 border-indigo-100 dark:border-indigo-900/20">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Wallet size={14}/> Payment Responsibility</h4>
                        <span className="text-[8px] font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded">Ledger Sync</span>
                    </div>

                    <div className="flex bg-white dark:bg-slate-950 p-1.5 rounded-xl shadow-inner border border-slate-100 dark:border-slate-800">
                        <button 
                            type="button" 
                            onClick={() => setForm({...form, billTo: 'BROKER'})} 
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.billTo === 'BROKER' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Bill to Broker
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setForm({...form, billTo: 'PARTY'})} 
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.billTo === 'PARTY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Bill to Party
                        </button>
                    </div>

                    {form.billTo === 'BROKER' ? (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                            <InputWrapper label="Broker Name" icon={<UserCheck size={12}/>}>
                                <input placeholder="Agent Name" value={form.brokerName || ''} onChange={e => setForm({...form, brokerName: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 font-bold text-xs uppercase outline-none shadow-sm" />
                            </InputWrapper>
                            <InputWrapper label="Broker Mobile" icon={<Phone size={12}/>}>
                                <input type="tel" placeholder="Mobile" value={form.brokerMobile || ''} onChange={e => setForm({...form, brokerMobile: e.target.value})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 font-bold text-xs outline-none shadow-sm" />
                            </InputWrapper>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                            <InputWrapper label="Hiring Party Name" icon={<Briefcase size={12}/>}>
                                <input placeholder="Direct Client Name" value={form.hiringPartyName || ''} onChange={e => setForm({...form, hiringPartyName: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 font-bold text-xs uppercase outline-none shadow-sm" />
                            </InputWrapper>
                            <InputWrapper label="Party Mobile" icon={<Phone size={12}/>}>
                                <input type="tel" placeholder="Mobile" value={form.hiringPartyMobile || ''} onChange={e => setForm({...form, hiringPartyMobile: e.target.value})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 font-bold text-xs outline-none shadow-sm" />
                            </InputWrapper>
                        </div>
                    )}
                    
                    <div className="pt-2 border-t border-indigo-200 dark:border-white/10">
                        <InputWrapper label="Basic Freight" icon={<IndianRupee size={12}/>}>
                            <input type="number" placeholder="Amount" value={form.freight.amount} onChange={e => setForm({...form, freight: {...form.freight, amount: Number(e.target.value)}})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 font-black text-sm outline-none shadow-sm" />
                        </InputWrapper>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mt-2">Bilty Print Details</h4>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-white/5 space-y-2">
                        <InputWrapper label="Consignor (Sender)" icon={<UserIcon size={12}/>}>
                            <input required placeholder="Party Name (Paper Only)" value={form.consignor.name} onChange={e => setForm({...form, consignor: {...form.consignor, name: e.target.value.toUpperCase()}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-sm uppercase outline-none" />
                            <input placeholder="GSTIN (Optional)" value={form.consignor.gst} onChange={e => setForm({...form, consignor: {...form.consignor, gst: e.target.value.toUpperCase()}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-medium text-xs uppercase outline-none" />
                            <textarea placeholder="Full Address" value={form.consignor.address || ''} onChange={e => setForm({...form, consignor: {...form.consignor, address: e.target.value}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-medium text-xs resize-none h-16 outline-none" />
                        </InputWrapper>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-white/5 space-y-2">
                        <InputWrapper label="Consignee (Receiver)" icon={<UserIcon size={12}/>}>
                            <input required placeholder="Party Name (Paper Only)" value={form.consignee.name} onChange={e => setForm({...form, consignee: {...form.consignee, name: e.target.value.toUpperCase()}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-sm uppercase outline-none" />
                            <input placeholder="GSTIN (Optional)" value={form.consignee.gst} onChange={e => setForm({...form, consignee: {...form.consignee, gst: e.target.value.toUpperCase()}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-medium text-xs uppercase outline-none" />
                            <textarea placeholder="Full Address" value={form.consignee.address || ''} onChange={e => setForm({...form, consignee: {...form.consignee, address: e.target.value}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-medium text-xs resize-none h-16 outline-none" />
                        </InputWrapper>
                    </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900 p-5 rounded-[1.8rem] space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Box size={12}/> Goods Details</h4>
                    <div className="space-y-3">
                        <input placeholder="Description (e.g. Rice Bags)" value={form.itemDetails.description} onChange={e => setForm({...form, itemDetails: {...form.itemDetails, description: e.target.value}})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-950 font-bold text-xs shadow-sm outline-none" />
                        <div className="grid grid-cols-3 gap-3">
                            <InputWrapper label="Pkgs" icon={<Box size={10}/>}>
                                <input placeholder="0" value={form.itemDetails.packages} onChange={e => setForm({...form, itemDetails: {...form.itemDetails, packages: e.target.value}})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 font-bold text-xs shadow-sm outline-none text-center" />
                            </InputWrapper>
                            <InputWrapper label="Weight" icon={<Scale size={10} className="lucide-icon"/>}>
                                <input type="number" placeholder="0" value={form.itemDetails.weight} onChange={e => setForm({...form, itemDetails: {...form.itemDetails, weight: e.target.value}})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 font-bold text-xs shadow-sm outline-none text-center" />
                            </InputWrapper>
                            <InputWrapper label="Rate" icon={<IndianRupee size={10}/>}>
                                <input type="number" placeholder="0" value={form.itemDetails.rate || ''} onChange={e => setForm({...form, itemDetails: {...form.itemDetails, rate: Number(e.target.value)}})} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 font-bold text-xs shadow-sm outline-none text-center" />
                            </InputWrapper>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] space-y-4 border border-slate-100 dark:border-white/5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Plus size={12}/> Additional Charges</h4>
                    <div className="grid grid-cols-3 gap-3">
                        <InputWrapper label="Labour" icon={<Users size={10}/>}>
                            <input type="number" placeholder="0" value={form.freight.labour || ''} onChange={e => setForm({...form, freight: {...form.freight, labour: Number(e.target.value)}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs shadow-sm outline-none text-center" />
                        </InputWrapper>
                        <InputWrapper label="Kanta" icon={<Scale size={10}/>}>
                            <input type="number" placeholder="0" value={form.freight.kanta || ''} onChange={e => setForm({...form, freight: {...form.freight, kanta: Number(e.target.value)}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs shadow-sm outline-none text-center" />
                        </InputWrapper>
                        <InputWrapper label="Other" icon={<MoreHorizontal size={10}/>}>
                            <input type="number" placeholder="0" value={form.freight.otherCh || ''} onChange={e => setForm({...form, freight: {...form.freight, otherCh: Number(e.target.value)}})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-xs shadow-sm outline-none text-center" />
                        </InputWrapper>
                    </div>
                </div>

                <div className="bg-slate-900 dark:bg-slate-800 p-5 rounded-[1.8rem] text-white shadow-xl">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <Calculator size={16} />
                        <h4 className="text-xs font-black uppercase tracking-widest">Final Bill Summary</h4>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Declared Value (Goods Value)</label>
                            <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl">
                                <ShieldCheck size={14} className="text-slate-300"/>
                                <input type="number" placeholder="Invoice Value ₹" value={form.declaredValue || ''} onChange={e => setForm({...form, declaredValue: Number(e.target.value)})} className="bg-transparent w-full outline-none text-sm font-bold placeholder:text-slate-500 text-white" />
                            </div>
                        </div>

                        <div className="h-px bg-white/10 my-2"></div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Freight</p>
                                <p className="text-xl font-black text-white">₹{((form.freight.amount || 0) + (form.freight.labour || 0) + (form.freight.kanta || 0) + (form.freight.otherCh || 0)).toLocaleString()}</p>
                                <p className="text-[8px] text-slate-500 font-medium">Includes charges</p>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Advance Recd</label>
                                <input type="number" placeholder="0" value={form.freight.advance || ''} onChange={e => setForm({...form, freight: {...form.freight, advance: Number(e.target.value)}})} className="w-full bg-white/10 p-2 rounded-lg text-sm font-bold outline-none text-white border border-transparent focus:border-indigo-500" />
                            </div>
                        </div>

                        <div className="bg-white/10 p-3 rounded-xl flex justify-between items-center mt-2">
                            <span className="text-[10px] font-black uppercase tracking-widest">Net Payable Balance</span>
                            <span className="text-lg font-black text-red-400">₹{(((form.freight.amount || 0) + (form.freight.labour || 0) + (form.freight.kanta || 0) + (form.freight.otherCh || 0)) - (form.freight.advance || 0)).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

            </form>
        </div>
    );

    const renderDetail = () => {
        // Safe null check
        if (!selectedBilty) return null;

        return createPortal(
            <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-950 flex flex-col animate-fade-in">
                {/* Header */}
                <div className="px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
                    <button onClick={() => window.history.back()} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-all"><ArrowLeft size={20}/></button>
                    <div className="text-center">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">LR #{selectedBilty.biltyNumber}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedBilty.date}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setForm(selectedBilty); pushView('CREATE', '#create-bilty'); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 rounded-xl"><Edit2 size={18}/></button>
                        <button onClick={() => setShareBilty(selectedBilty)} className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl"><Share2 size={18}/></button>
                    </div>
                </div>

                {/* Receipt Preview Area */}
                <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-black p-4 flex justify-center">
                    <div className="w-full max-w-lg">
                        <BiltyReceipt bilty={selectedBilty} id="bilty-receipt-view" />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                    <button onClick={() => generateBiltyPDF(selectedBilty, profile?.business)} className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Printer size={16} /> Print PDF
                    </button>
                    <button onClick={() => setBiltyToDelete(selectedBilty)} className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl active:scale-95 transition-all">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <div className="h-full w-full overflow-y-auto no-scrollbar pt-2 pb-40 px-5">
            <div className="max-w-lg mx-auto">
                {view === 'LIST' && renderList()}
                {view === 'CREATE' && renderCreate()}
            </div>
            
            {view === 'DETAIL' && renderDetail()}

            {/* Business Profile Modal */}
            {showBusinessModal && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBusinessModal(false)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 shadow-2xl animate-pop-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Business Profile</h3>
                            <button onClick={() => setShowBusinessModal(false)}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleBusinessUpdate} className="space-y-4">
                            <InputWrapper label="Company Name" icon={<Building2 size={12}/>}>
                                <input required value={businessForm.companyName} onChange={e => setBusinessForm({...businessForm, companyName: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-sm" />
                            </InputWrapper>
                            <InputWrapper label="Address" icon={<MapPin size={12}/>}>
                                <textarea required value={businessForm.address} onChange={e => setBusinessForm({...businessForm, address: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-medium text-sm h-20 resize-none" />
                            </InputWrapper>
                            <div className="grid grid-cols-2 gap-3">
                                <InputWrapper label="Phone" icon={<Phone size={12}/>}><input value={businessForm.contact} onChange={e => setBusinessForm({...businessForm, contact: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none font-bold text-sm" /></InputWrapper>
                                <InputWrapper label="GSTIN" icon={<FileText size={12}/>}><input value={businessForm.gst} onChange={e => setBusinessForm({...businessForm, gst: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none font-bold text-sm" /></InputWrapper>
                            </div>
                            <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Save Profile</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Other Modals */}
            <ShareWrapper isOpen={!!shareBilty} onClose={() => setShareBilty(null)} captureId="bilty-receipt-view" title="Share Lorry Receipt" fileName={`LR_${shareBilty?.biltyNumber}.png`}>
                {shareBilty && <BiltyReceipt bilty={shareBilty} id="bilty-receipt-view" />}
            </ShareWrapper>

            <DeleteModal 
                isOpen={!!biltyToDelete}
                onClose={() => setBiltyToDelete(null)}
                title="Delete Bilty?"
                itemName={`LR #${biltyToDelete?.biltyNumber}`}
                onDelete={async () => {
                    if(biltyToDelete) {
                        await deleteBilty(user.uid, biltyToDelete.id);
                        setBiltyToDelete(null);
                        window.history.back(); // Go back to list
                        notify("Deleted", "LR removed successfully", "success");
                    }
                }}
            />
            
            {isPricingOpen && profile && <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} userProfile={profile} />}
        </div>
    );
};
