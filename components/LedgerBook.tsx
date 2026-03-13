
import React, { useState, useEffect, useMemo } from 'react';
import { FirebaseUser } from '../types';
import { LedgerAccount, LedgerTransaction, Bilty, UserProfile } from '../types';
import { 
    fetchLedgers, saveLedger, fetchTransactions, saveLedgerEntryBatch, 
    deleteLedgerEntryBatch, notify, subscribeToUserProfile, fetchVehicles, 
    deleteLedgerAccount, subscribeToLedgers, subscribeToTransactions, subscribeToBilties
} from '../services/firebaseService';
import { ArrowLeft, Search, Plus, User as UserIcon, ArrowUpRight, ArrowDownLeft, Phone, Share2, Wallet, Trash2, Printer, Edit2, CheckCircle2, MapPin, FileText } from 'lucide-react';
import { generateLedgerPDF } from '../utils/ledgerUtils';
import { LedgerReceipt } from './VisualReceipts';
import { ShareWrapper } from './ShareWrapper';
import { DeleteModal } from './DeleteModal';
import { hapticFeedback } from '../utils/haptics';
import { getIndianDate } from '../utils/helpers';
import { LedgerCardSkeleton } from './SkeletonLoader';

interface Props { user: FirebaseUser; onBack: () => void; onOpenBilty?: (id: string) => void; initialSearch?: string; }

const InputWrapper: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="space-y-1.5 flex-1">
    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
      {icon} {label}
    </label>
    {children}
  </div>
);

const SuggestionInput = ({ value, onChange, placeholder, suggestions, icon: Icon }: any) => {
    const listId = `list-${Math.random()}`;
    return (
        <div className="space-y-1.5 flex-1">
             <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                {Icon} Account Name
            </label>
            <div className="relative group">
                <input list={listId} value={value} onChange={onChange} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 outline-none font-black text-lg shadow-inner transition-all uppercase" placeholder={placeholder} />
                <datalist id={listId}>{suggestions.map((s: string, i: number) => <option key={i} value={s} />)}</datalist>
            </div>
        </div>
    );
};

export const LedgerBook: React.FC<Props> = ({ user, onBack, initialSearch }) => {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [bilties, setBilties] = useState<Bilty[]>([]);
  const [vehicleOwners, setVehicleOwners] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  
  const getInitialView = () => {
      const h = window.location.hash;
      if (h === '#add-account') return 'ADD_ACCOUNT';
      return 'LIST';
  };
  const [view, setView] = useState<'LIST' | 'DETAIL' | 'ADD_ACCOUNT'>(getInitialView);
  
  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<LedgerTransaction | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<LedgerAccount | null>(null);
  const [shareAccount, setShareAccount] = useState<LedgerAccount | null>(null);
  const [editingTxn, setEditingTxn] = useState<LedgerTransaction | null>(null);
  const [accForm, setAccForm] = useState({ name: '', mobile: '', address: '', gst: '', type: 'Party' as 'Party' | 'Driver' | 'Broker', opening: '0' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: getIndianDate(), desc: '', type: 'CREDIT' as 'CREDIT' | 'DEBIT' });
  const [loading, setLoading] = useState(true);

  // --- HISTORY LISTENER (FIXED) ---
  useEffect(() => {
      const handlePopState = () => {
          const hash = window.location.hash;
          
          if (!hash || hash === '') {
              setView('LIST');
              setSelectedAccount(null); // Clear selection
          } else if (hash === '#add-account') {
              setView('ADD_ACCOUNT');
          }
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const pushView = (newView: typeof view, hash: string) => {
      if (view === newView) return;
      hapticFeedback(10);
      // CRITICAL FIX: Copy existing history state to preserve 'viewStack' from App.tsx
      const currentState = window.history.state || {};
      window.history.pushState(currentState, '', hash);
      setView(newView);
  };

  useEffect(() => { 
    const unsubProfile = subscribeToUserProfile(user.uid, setProfile);
    const unsubLedgers = subscribeToLedgers(user.uid, (data) => {
        setAccounts(data);
        setLoading(false);
    });
    const unsubTxns = subscribeToTransactions(user.uid, setTransactions);
    const unsubBilties = subscribeToBilties(user.uid, setBilties);
    fetchVehicles(user.uid).then(vData => {
        setVehicleOwners(Array.from(new Set(vData.map(v => v.ownerName).filter(Boolean))));
    });
    return () => { unsubProfile(); unsubLedgers(); unsubTxns(); unsubBilties(); };
  }, [user.uid]);

  // AI Integration
  useEffect(() => {
      const handleOpenCreate = () => {
          setAccForm({ name: '', mobile: '', address: '', gst: '', type: 'Party', opening: '0' });
          pushView('ADD_ACCOUNT', '#add-account');
      };
      window.addEventListener('ledger-open-create', handleOpenCreate);
      return () => window.removeEventListener('ledger-open-create', handleOpenCreate);
  }, []);

  useEffect(() => {
      const handleUpdateData = (e: CustomEvent) => {
          if (view !== 'ADD_ACCOUNT') pushView('ADD_ACCOUNT', '#add-account');
          const data = e.detail;
          setAccForm(prev => {
              const newData = { ...prev };
              if (data.name) newData.name = data.name.toUpperCase();
              if (data.type) {
                  const t = data.type.toLowerCase();
                  if (t.includes('driver')) newData.type = 'Driver';
                  else if (t.includes('broker')) newData.type = 'Broker';
                  else newData.type = 'Party';
              }
              if (data.mobile) newData.mobile = data.mobile;
              if (data.openingBalance) newData.opening = data.openingBalance;
              return newData;
          });
      };
      window.addEventListener('ledger-update-data' as any, handleUpdateData);
      return () => window.removeEventListener('ledger-update-data' as any, handleUpdateData);
  }, [view]);

  // Sync selected account with real-time updates
  useEffect(() => {
      if (selectedAccount) {
          const fresh = accounts.find(a => a.id === selectedAccount.id);
          if (fresh && fresh.lastUpdated !== selectedAccount.lastUpdated) {
              setSelectedAccount(fresh);
          }
      }
  }, [accounts]);

  const nameSuggestions = useMemo(() => {
      const parties = new Set([
          ...bilties.map(b => b.brokerName || ''), 
          ...bilties.map(b => b.consignor?.name || ''),
          ...bilties.map(b => b.consignee?.name || ''),
          ...vehicleOwners
      ]);
      return Array.from(parties).filter(n => n && n.length > 2);
  }, [bilties, vehicleOwners]);

  const accountTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions.filter(t => t.accountId === selectedAccount.id).sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedAccount, transactions]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accForm.name) return;
    hapticFeedback(30);
    const opening = parseFloat(accForm.opening);
    await saveLedger(user.uid, { id: 'acc-' + Date.now(), name: accForm.name.trim().toUpperCase(), type: accForm.type, mobile: accForm.mobile, address: accForm.address, gst: accForm.gst, openingBalance: opening, balance: opening, lastUpdated: Date.now() });
    window.history.back(); // Return to list
    notify("Success", "Account created", "success");
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !paymentForm.amount) return;
    hapticFeedback(20);
    const amt = parseFloat(paymentForm.amount);
    let desc = paymentForm.desc || (paymentForm.type === 'DEBIT' ? 'Bill / Invoice' : 'Payment Received');
    const now = Date.now();
    if (editingTxn) {
        const oldImpact = editingTxn.type === 'DEBIT' ? editingTxn.amount : -editingTxn.amount;
        const newImpact = paymentForm.type === 'DEBIT' ? amt : -amt;
        const balanceDiff = newImpact - oldImpact;
        const updatedTxn = { ...editingTxn, amount: amt, date: paymentForm.date, description: desc, type: paymentForm.type } as LedgerTransaction;
        await saveLedgerEntryBatch(user.uid, updatedTxn, { ...selectedAccount, balance: selectedAccount.balance + balanceDiff, lastUpdated: now });
        setEditingTxn(null);
    } else {
        const txn: LedgerTransaction = { id: 'txn-' + now, accountId: selectedAccount.id, date: paymentForm.date, description: desc, type: paymentForm.type, amount: amt, category: 'PAYMENT', createdAt: now };
        await saveLedgerEntryBatch(user.uid, txn, { ...selectedAccount, balance: selectedAccount.balance + (paymentForm.type === 'DEBIT' ? amt : -amt), lastUpdated: now });
    }
    setPaymentForm({ amount: '', date: getIndianDate(), desc: '', type: 'CREDIT' });
  };

  const renderHeader = (title: string, action?: React.ReactNode) => (
      <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mx-5 px-5 border-b border-slate-100 dark:border-slate-800/50 shadow-sm mb-5 transition-all">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3.5 cursor-pointer" onClick={view === 'LIST' ? onBack : () => window.history.back()}>
                 <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 shadow-sm active:scale-90 transition-all">
                     <ArrowLeft size={20} strokeWidth={3} className="text-slate-600 dark:text-slate-300"/>
                 </div>
                 <div><h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{title}</h2></div>
             </div>
             {action}
          </div>
      </div>
  );

  const renderList = () => {
      const totalReceivable = accounts.filter(a => a.balance > 0).reduce((s,a)=> s + Number(a.balance), 0);
      const totalPayable = Math.abs(accounts.filter(a => a.balance < 0).reduce((s,a)=> s + Number(a.balance), 0));

      return (
        <div className="space-y-6">
            {renderHeader("Account Book", (
                <button onClick={() => pushView('ADD_ACCOUNT', '#add-account')} className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-[1.2rem] shadow-lg active:scale-95 transition-all"><Plus size={26} strokeWidth={3} /></button>
            ))}
            
            <div className="bg-slate-900 rounded-[1.8rem] p-5 text-white shadow-xl relative overflow-hidden border border-slate-800">
                <div className="relative z-10 grid grid-cols-2 gap-4 text-center divide-x divide-slate-700/50">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Receivable</p><h3 className="text-xl font-black text-emerald-400">₹{totalReceivable.toLocaleString()}</h3></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Payable</p><h3 className="text-xl font-black text-red-400">₹{totalPayable.toLocaleString()}</h3></div>
                </div>
            </div>

            <div className="relative mb-6">
               <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input type="text" placeholder="Search accounts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl outline-none text-slate-900 dark:text-white font-bold text-sm shadow-sm" />
            </div>

            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3, 4, 5].map(i => <LedgerCardSkeleton key={i} />)
                ) : (
                    accounts.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(acc => (
                        <div 
                            key={acc.id} 
                            onClick={() => { 
                                setSelectedAccount(acc); 
                                pushView('DETAIL', '#ledger-detail'); 
                            }} 
                            className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm border-l-[6px] border-indigo-600 active:scale-[0.99] transition-all relative cursor-pointer"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4 flex-1 min-w-0 mr-2">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${acc.balance > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{acc.name.charAt(0).toUpperCase()}</div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-base font-black text-slate-900 dark:text-white truncate">{acc.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{acc.type}</span>
                                            {acc.mobile && (
                                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                                                    <Phone size={8} /> {acc.mobile}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0"><p className={`text-lg font-black ${acc.balance > 0 ? 'text-emerald-600' : 'text-red-500'}`}>₹{Math.abs(acc.balance).toLocaleString()}</p><p className="text-[8px] font-black uppercase opacity-40">{acc.balance > 0 ? 'Dr' : 'Cr'}</p></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      );
  }

  const renderAddAccount = () => (
    <div className="animate-slide-up">
        {renderHeader("New Account", (
            <button onClick={handleCreateAccount} className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-[1.2rem] shadow-lg active:scale-95 transition-all"><Plus size={26} strokeWidth={3} /></button>
        ))}
        
        <form onSubmit={handleCreateAccount} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <InputWrapper label="Account Type" icon={<UserIcon size={12}/>}>
                        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                            {['Party', 'Driver', 'Broker'].map(t => (
                                <button type="button" key={t} onClick={() => setAccForm({...accForm, type: t as any})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${accForm.type === t ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{t}</button>
                            ))}
                        </div>
                    </InputWrapper>
                    <InputWrapper label="Opening Balance" icon={<Wallet size={12}/>}>
                        <input type="number" placeholder="0" value={accForm.opening} onChange={e => setAccForm({...accForm, opening: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-sm outline-none" />
                    </InputWrapper>
                </div>

                <SuggestionInput 
                    value={accForm.name} 
                    onChange={(e: any) => setAccForm({...accForm, name: e.target.value.toUpperCase()})} 
                    placeholder="ENTER NAME" 
                    suggestions={nameSuggestions} 
                    icon={<UserIcon size={12}/>} 
                />

                <InputWrapper label="Mobile Number" icon={<Phone size={12}/>}>
                    <input type="tel" placeholder="9876543210" value={accForm.mobile} onChange={e => setAccForm({...accForm, mobile: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-lg outline-none tracking-widest" />
                </InputWrapper>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-4">
                <InputWrapper label="Address / City" icon={<MapPin size={12}/>}>
                    <input placeholder="Location" value={accForm.address} onChange={e => setAccForm({...accForm, address: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-sm outline-none" />
                </InputWrapper>
                <InputWrapper label="GSTIN (Optional)" icon={<FileText size={12}/>}>
                    <input placeholder="GST Number" value={accForm.gst} onChange={e => setAccForm({...accForm, gst: e.target.value.toUpperCase()})} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-sm uppercase outline-none" />
                </InputWrapper>
            </div>
        </form>
    </div>
  );

  const renderDetail = () => {
    // Standard safety check, but allow re-selection flow
    if (!selectedAccount) return null;
    
    const totalDebits = accountTransactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCredits = accountTransactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + Number(t.amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mx-5 px-5 border-b border-slate-100 dark:border-slate-800/50 shadow-sm transition-all">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => window.history.back()} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 transition-transform active:scale-90"><ArrowLeft size={18} strokeWidth={3}/></button>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none truncate max-w-[150px]">{selectedAccount.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md">{selectedAccount.type}</span>
                                {selectedAccount.mobile && (
                                    <a href={`tel:${selectedAccount.mobile}`} className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md active:scale-95 transition-transform hover:text-indigo-600 dark:hover:text-indigo-400">
                                        <Phone size={10} /> {selectedAccount.mobile}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => generateLedgerPDF(selectedAccount, accountTransactions, profile?.business)} className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl transition-transform active:scale-90"><Printer size={18}/></button>
                        <button onClick={() => setShareAccount(selectedAccount)} className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl transition-transform active:scale-90"><Share2 size={18}/></button>
                        <button onClick={() => setAccountToDelete(selectedAccount)} className="p-2.5 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl transition-transform active:scale-90"><Trash2 size={18}/></button>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 dark:bg-slate-800 rounded-[1.8rem] p-5 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-end">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Balance</p><h2 className="text-3xl font-black tracking-tighter">₹{Math.abs(selectedAccount.balance).toLocaleString()}</h2><p className="text-[9px] font-bold mt-1 text-indigo-300 uppercase">{selectedAccount.balance > 0 ? 'Receivable' : 'Payable'}</p></div>
                    <div className="text-right space-y-1"><p className="text-[9px] font-bold text-slate-400">Dr: ₹{totalDebits.toLocaleString()}</p><p className="text-[9px] font-bold text-slate-400">Cr: ₹{totalCredits.toLocaleString()}</p></div>
                </div>
            </div>

            <div className={`bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 transition-all ${editingTxn ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setPaymentForm({...paymentForm, type: 'CREDIT'})} className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase transition-all ${paymentForm.type === 'CREDIT' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Payment Recd (Cr)</button>
                    <button onClick={() => setPaymentForm({...paymentForm, type: 'DEBIT'})} className={`flex-1 py-2.5 rounded-lg text-[8px] font-black uppercase transition-all ${paymentForm.type === 'DEBIT' ? 'bg-white dark:bg-slate-700 text-red-500 shadow-sm' : 'text-slate-500'}`}>Bill/Charge (Dr)</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Amount ₹" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 outline-none font-black text-lg focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                    <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 outline-none font-bold text-xs focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                </div>
                <input placeholder="Description (Optional)" value={paymentForm.desc} onChange={e => setPaymentForm({...paymentForm, desc: e.target.value})} className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 outline-none font-bold text-sm focus:bg-white dark:focus:bg-slate-800 transition-colors" />
                <button onClick={handleSavePayment} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] text-white transition-transform active:scale-95 ${paymentForm.type === 'CREDIT' ? 'bg-emerald-600 shadow-emerald-500/20 shadow-lg' : 'bg-red-500 shadow-red-500/20 shadow-lg'}`}>{editingTxn ? 'Update Entry' : 'Add Entry'}</button>
            </div>

            <div className="space-y-3">
                {accountTransactions.map(txn => (
                    <div key={txn.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group active:scale-[0.99] transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${txn.type === 'DEBIT' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>{txn.type === 'DEBIT' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}</div>
                            <div>
                                <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">{txn.description}</p>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{txn.date}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className={`text-base font-black ${txn.type === 'DEBIT' ? 'text-red-500' : 'text-emerald-600'}`}>₹{txn.amount.toLocaleString()}</p>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingTxn(txn); setPaymentForm({ amount: txn.amount.toString(), date: txn.date, desc: txn.description, type: txn.type }); }} className="p-2 bg-slate-50 rounded-lg text-slate-400 transition-transform active:scale-90"><Edit2 size={14}/></button>
                                <button onClick={() => setTransactionToDelete(txn)} className="p-2 bg-slate-50 rounded-lg text-slate-400 transition-transform active:scale-90"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar pt-2 pb-40 px-5 relative z-[60] bg-slate-50 dark:bg-slate-950">
        <div className="max-w-lg mx-auto">
            {view === 'LIST' && renderList()}
            {view === 'ADD_ACCOUNT' && renderAddAccount()}
            {view === 'DETAIL' && renderDetail()}
        </div>

        <ShareWrapper isOpen={!!shareAccount} onClose={() => setShareAccount(null)} captureId="ledger-receipt-capture" title="Share Ledger" fileName={`Ledger_${shareAccount?.name}.png`}>
            {shareAccount && <LedgerReceipt account={shareAccount} id="ledger-receipt-capture" />}
        </ShareWrapper>

        <DeleteModal 
            isOpen={!!accountToDelete}
            onClose={() => setAccountToDelete(null)}
            title="Delete Account?"
            itemName={accountToDelete?.name}
            warningText="This will delete the account and all associated transaction history."
            onDelete={async () => {
                if(accountToDelete) {
                    if (Math.abs(accountToDelete.balance) > 1) {
                        notify("Action Blocked", "Please settle account balance to zero before deleting.", "error");
                        setAccountToDelete(null);
                        return;
                    }
                    await deleteLedgerAccount(user.uid, accountToDelete.id);
                    setAccountToDelete(null);
                    window.history.back(); // Return to list
                    notify("Deleted", "Account removed", "success");
                }
            }}
        />

        <DeleteModal 
            isOpen={!!transactionToDelete}
            onClose={() => setTransactionToDelete(null)}
            title="Delete Entry?"
            itemName={transactionToDelete ? `${transactionToDelete.description} (₹${transactionToDelete.amount})` : undefined}
            onDelete={async () => {
                if (transactionToDelete && selectedAccount) {
                    const reverseAmount = transactionToDelete.type === 'DEBIT' ? -transactionToDelete.amount : transactionToDelete.amount;
                    const updatedAccount = { 
                        ...selectedAccount, 
                        balance: selectedAccount.balance + reverseAmount, 
                        lastUpdated: Date.now() 
                    };
                    await deleteLedgerEntryBatch(user.uid, transactionToDelete, updatedAccount);
                    setTransactionToDelete(null);
                    notify("Deleted", "Entry removed & balance updated", "success");
                }
            }}
        />
    </div>
  );
};
