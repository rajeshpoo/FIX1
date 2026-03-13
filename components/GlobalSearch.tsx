
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ArrowLeft, Truck, FileText, Wallet, MapPin, ChevronRight, Loader2, ArrowUpRight } from 'lucide-react';
import { fetchBilties, fetchLedgers, fetchTrips } from '../services/firebaseService';
import { Vehicle, Bilty, LedgerAccount, Trip } from '../types';

interface Props {
  user: any;
  vehicles: Vehicle[];
  onBack: () => void;
  onNavigate: (view: 'home' | 'bilty' | 'ledger' | 'trips', query: string) => void;
}

export const GlobalSearch: React.FC<Props> = ({ user, vehicles, onBack, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(''); // FIX: Added debounced state
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [data, setData] = useState<{ bilties: Bilty[], ledgers: LedgerAccount[], trips: Trip[] }>({ bilties: [], ledgers: [], trips: [] });
  
  // FIX: Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms delay
    return () => clearTimeout(handler);
  }, [query]);

  // Scalable Search: Fetch data based on DEBOUNCED query
  useEffect(() => {
    if (debouncedQuery.length > 1 && !dataLoaded && !loading) {
        setLoading(true);
        // Fetch all data once to cache for this session
        Promise.all([
          fetchBilties(user.uid),
          fetchLedgers(user.uid),
          fetchTrips(user.uid)
        ]).then(([b, l, t]) => {
          setData({ bilties: b, ledgers: l, trips: t });
          setDataLoaded(true);
          setLoading(false);
        }).catch(() => setLoading(false));
    }
  }, [debouncedQuery, dataLoaded, user.uid, loading]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) return null;
    const q = debouncedQuery.toLowerCase();
    
    // Prioritize vehicles available in props
    const vehicleMatches = vehicles.filter(v => v.number.toLowerCase().includes(q) || v.ownerName.toLowerCase().includes(q));
    
    if (!dataLoaded) return { vehicles: vehicleMatches, ledgers: [], bilties: [], trips: [] };

    return {
      vehicles: vehicleMatches,
      ledgers: data.ledgers.filter(l => l.name.toLowerCase().includes(q) || l.type.toLowerCase().includes(q)),
      bilties: data.bilties.filter(b => b.biltyNumber.includes(q) || b.vehicleNumber.toLowerCase().includes(q) || b.consignor.name.toLowerCase().includes(q) || b.consignee.name.toLowerCase().includes(q)),
      trips: data.trips.filter(t => t.vehicleNumber.toLowerCase().includes(q) || t.driverName.toLowerCase().includes(q) || t.partyName.toLowerCase().includes(q))
    };
  }, [debouncedQuery, vehicles, data, dataLoaded]);

  const hasResults = results && (results.vehicles.length > 0 || results.ledgers.length > 0 || results.bilties.length > 0 || results.trips.length > 0);

  // Use Portal to break out of App's stacking context (which places header above content)
  // z-[60] ensures it sits above the App Header (z-50)
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in font-sans">
        {/* Search Header - Added explicit top padding for safe area */}
        <div className="px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
            <button onClick={onBack} className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95"><ArrowLeft size={20} /></button>
            <div className="flex-1 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search Fleet, Accounts, Trips..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 transition-all focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                />
                {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="animate-spin text-indigo-500" size={16} /></div>}
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
            {!query ? (
                <div className="text-center py-24 opacity-40">
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={40} className="text-slate-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-black text-slate-500 dark:text-slate-400 mb-1">Global Search</h3>
                    <p className="text-xs font-medium text-slate-400">Type 2+ chars to find anything</p>
                </div>
            ) : !hasResults && !loading && debouncedQuery.length >= 2 ? (
                <div className="text-center py-24 opacity-60">
                    <p className="text-sm font-bold text-slate-500">No results matching "{query}"</p>
                </div>
            ) : (
                <>
                    {/* Vehicles Section */}
                    {results && results.vehicles.length > 0 && (
                        <div className="animate-slide-up" style={{animationDelay: '0ms'}}>
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1 flex items-center gap-1"><Truck size={10} /> Vehicles</h3>
                            <div className="space-y-2">
                                {results.vehicles.map(v => (
                                    <div key={v.id} onClick={() => onNavigate('home', v.number)} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 active:scale-95 transition-all cursor-pointer group hover:border-indigo-500/30">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-inner"><Truck size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-900 dark:text-white truncate">{v.number}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{v.ownerName || 'Unassigned'}</p>
                                        </div>
                                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ledgers Section */}
                    {results && results.ledgers.length > 0 && (
                        <div className="animate-slide-up" style={{animationDelay: '50ms'}}>
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1 flex items-center gap-1"><Wallet size={10} /> Accounts</h3>
                            <div className="space-y-2">
                                {results.ledgers.map(l => (
                                    <div key={l.id} onClick={() => onNavigate('ledger', l.name)} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 active:scale-95 transition-all cursor-pointer group hover:border-emerald-500/30">
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-inner"><Wallet size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-900 dark:text-white truncate">{l.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                {l.type} <span className="w-1 h-1 bg-slate-300 rounded-full"></span> 
                                                <span className={l.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}>₹{Math.abs(l.balance).toLocaleString()}</span>
                                            </p>
                                        </div>
                                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bilties Section */}
                    {results && results.bilties.length > 0 && (
                        <div className="animate-slide-up" style={{animationDelay: '100ms'}}>
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1 flex items-center gap-1"><FileText size={10} /> Bilties (LR)</h3>
                            <div className="space-y-2">
                                {results.bilties.map(b => (
                                    <div key={b.id} onClick={() => onNavigate('bilty', b.biltyNumber)} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 active:scale-95 transition-all cursor-pointer group hover:border-blue-500/30">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-inner"><FileText size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-900 dark:text-white">LR #{b.biltyNumber}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{b.vehicleNumber} • {b.date}</p>
                                        </div>
                                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trips Section */}
                    {results && results.trips.length > 0 && (
                        <div className="animate-slide-up" style={{animationDelay: '150ms'}}>
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1 flex items-center gap-1"><MapPin size={10} /> Trips</h3>
                            <div className="space-y-2">
                                {results.trips.map(t => (
                                    <div key={t.id} onClick={() => onNavigate('trips', t.vehicleNumber)} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 active:scale-95 transition-all cursor-pointer group hover:border-orange-500/30">
                                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl shadow-inner"><MapPin size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-slate-900 dark:text-white truncate">{t.vehicleNumber}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{t.route.from} ➝ {t.route.to}</p>
                                        </div>
                                        <ArrowUpRight size={16} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    </div>,
    document.body
  );
};
