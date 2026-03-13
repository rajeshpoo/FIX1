
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FirebaseUser } from '../types';
import { Vehicle, Trip, TripExpense, UserProfile } from '../types';
import { useTripManager } from '../hooks/useTripManager';
import { notify, subscribeToUserProfile } from '../services/firebaseService';
import { handlePrintTrip, handlePrintVehicleHistory, handleExportAllTrips, safeNumber } from '../utils/tripUtils';
import { VehicleGrid, ExpenseList } from './trip/TripListViews';
import { TripHistory } from './trip/TripHistory';
import { TripEditor } from './trip/TripEditor';
import { TripImport } from './trip/TripImport';
import { PricingModal } from './PricingModal';
import { Search, ChevronDown } from 'lucide-react';
import { hapticFeedback } from '../utils/haptics';
import { getIndianDate } from '../utils/helpers';

// Modular Sub-components
import { TripBookHeader } from './trip/TripBookHeader';
import { TripBookStatsSection } from './trip/TripBookStatsSection';
import { TripBookQuickActions } from './trip/TripBookQuickActions';
import { TripBookModalManager } from './trip/TripBookModalManager';

interface Props { 
    user: FirebaseUser; 
    onBack: () => void; 
    vehicles: Vehicle[];
    initialSearch?: string;
}

export const TripBook: React.FC<Props> = ({ user, onBack, vehicles: officialFleet, initialSearch }) => {
  const { trips, loading: tripsLoading, addOrUpdateTrip, removeTrip, removeExpense, endTrip, importTrips } = useTripManager(user.uid, officialFleet);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const listTopRef = useRef<HTMLDivElement>(null);
  
  const BATCH_SIZE = 20;

  useEffect(() => {
    return subscribeToUserProfile(user.uid, setProfile);
  }, [user.uid]);

  const isPremium = profile?.planType === 'PREMIUM';

  // --- NAVIGATION STATE MANAGEMENT ---
  const getInitialView = () => {
      const h = window.location.hash;
      if (h === '#trip-import') return 'TRIP_IMPORT';
      if (h === '#all-expenses') return 'ALL_EXPENSES';
      return 'VEHICLES';
  };

  const [view, setView] = useState<'VEHICLES' | 'ALL_EXPENSES' | 'VEHICLE_HISTORY' | 'TRIP_EDITOR' | 'TRIP_IMPORT'>(getInitialView);
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeTripForEditor, setActiveTripForEditor] = useState<Trip | null>(null);
  const [displayLimit, setDisplayLimit] = useState(30);

  // --- HISTORY LISTENER (FIXED) ---
  useEffect(() => {
      const handlePopState = () => {
          const hash = window.location.hash;
          
          // CRITICAL FIX: If hash is cleared, we MUST return to list view locally.
          // This allows single-press back to work.
          if (!hash || hash === '') {
              setView('VEHICLES');
              setSelectedVehicle(null);
              setActiveTripForEditor(null);
          } 
          else if (hash === '#trip-import') {
              setView('TRIP_IMPORT');
          }
          else if (hash === '#all-expenses') {
              setView('ALL_EXPENSES');
          }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const pushView = (newView: typeof view, hash: string) => {
      if (view === newView) return;
      hapticFeedback(10);
      // CRITICAL FIX: Preserve existing history state (from App.tsx) so we don't jump to Home
      const currentState = window.history.state || {};
      window.history.pushState(currentState, '', hash);
      setView(newView);
  };

  // Sync active trip data when it changes in the background (e.g. expenses added)
  useEffect(() => {
      if (activeTripForEditor) {
          const fresh = trips.find(t => t.id === activeTripForEditor.id);
          if (fresh && fresh.lastUpdated !== activeTripForEditor.lastUpdated) {
              setActiveTripForEditor(fresh);
          }
      }
  }, [trips]); 

  // Filters & Sorting
  const currentMonthIso = getIndianDate().slice(0, 7);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [dateFilter, setDateFilter] = useState({ 
      type: 'MONTH', 
      value: currentMonthIso, 
      start: '', 
      end: '', 
      label: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }) 
  });
  const [vehicleSort, setVehicleSort] = useState<'DEFAULT' | 'TRIPS' | 'PROFIT'>('DEFAULT');

  useEffect(() => { setDisplayLimit(30); }, [vehicleSort, searchQuery, dateFilter]);

  // Modal State
  const [activeModal, setActiveModal] = useState<string>('NONE');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  // Modal Back Button Support
  useEffect(() => {
      const handleModalBack = () => {
          if (activeModal !== 'NONE' && window.location.hash !== '#trip-modal') {
              setActiveModal('NONE');
          }
      };
      window.addEventListener('popstate', handleModalBack);
      return () => window.removeEventListener('popstate', handleModalBack);
  }, [activeModal]);

  const openModal = (modalName: string) => {
      const currentState = window.history.state || {};
      window.history.pushState(currentState, '', '#trip-modal');
      setActiveModal(modalName);
  };

  const closeModal = () => {
      if (window.location.hash === '#trip-modal') {
          window.history.back(); 
      } else {
          setActiveModal('NONE');
      }
  };

  const normalize = (str: string) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

  // --- DATA COMPUTATION ---
  const filteredTrips = useMemo(() => {
      let data = trips;
      if (dateFilter.type === 'MONTH' && dateFilter.value) {
          data = data.filter(t => t.startDate.startsWith(dateFilter.value));
      } else if (dateFilter.type === 'RANGE' && dateFilter.start && dateFilter.end) {
          data = data.filter(t => t.startDate >= dateFilter.start && t.startDate <= dateFilter.end);
      }
      return data.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [trips, dateFilter]);

  const allBusinessVehicles = useMemo(() => {
      const fleetMap = new Map(officialFleet.map(v => [normalize(v.number), v]));
      const tripVehicleNums = Array.from(new Set(trips.map(t => normalize(t.vehicleNumber))));
      const mergedList = [...officialFleet];
      tripVehicleNums.forEach(num => {
          if (!fleetMap.has(num)) {
              mergedList.push({ id: `hired-${num}`, number: num, ownerName: 'Hired / Market Truck', documents: {} as any, lastUpdated: 0 });
          }
      });
      return mergedList;
  }, [officialFleet, trips]);

  const stats = useMemo(() => filteredTrips.reduce((acc, t) => {
      acc.totalTrips++;
      acc.totalFreight += safeNumber(t.freightAmount);
      acc.totalExp += safeNumber(t.totalExpense);
      return acc;
  }, { totalTrips: 0, totalFreight: 0, totalExp: 0 }), [filteredTrips]);

  const allExpenses = useMemo(() => filteredTrips.flatMap(t => (t.expenses || []).map(e => ({ ...e, vehicleNumber: t.vehicleNumber, tripId: t.id }))).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [filteredTrips]);

  const getFilteredTripCount = (vNum: string) => filteredTrips.filter(t => normalize(t.vehicleNumber) === normalize(vNum)).length;
  const getFilteredTripProfit = (vNum: string) => filteredTrips.filter(t => normalize(t.vehicleNumber) === normalize(vNum)).reduce((s, t) => s + (t.freightAmount - t.totalExpense), 0);
  const getActiveTrip = (vNum: string) => trips.find(t => normalize(t.vehicleNumber) === normalize(vNum) && t.status === 'RUNNING');

  const sortedVehicles = useMemo(() => {
      let list = [...allBusinessVehicles];
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          list = list.filter(v => v.number.toLowerCase().includes(q) || v.ownerName.toLowerCase().includes(q));
      }
      list.sort((a, b) => {
          const aActive = !!getActiveTrip(a.number);
          const bActive = !!getActiveTrip(b.number);
          if (aActive && !bActive) return -1; 
          if (!aActive && bActive) return 1;
          if (vehicleSort === 'TRIPS') return getFilteredTripCount(b.number) - getFilteredTripCount(a.number);
          if (vehicleSort === 'PROFIT') return getFilteredTripProfit(b.number) - getFilteredTripProfit(a.number);
          return (b.lastUpdated || 0) - (a.lastUpdated || 0);
      });
      return list;
  }, [allBusinessVehicles, vehicleSort, searchQuery, filteredTrips]);

  const visibleVehicles = useMemo(() => sortedVehicles.slice(0, displayLimit), [sortedVehicles, displayLimit]);
  const visibleExpenses = useMemo(() => allExpenses.slice(0, displayLimit), [allExpenses, displayLimit]);

  // --- ACTIONS ---
  const handleStartTrip = () => {
      if (!isPremium && trips.length >= 100) { notify("Free Limit", "Upgrade for more trips.", "warning"); setIsPricingOpen(true); return; }
      openModal('ENTER_VEHICLE');
  };
  
  const handleStartTripForVehicle = (vNum: string) => {
      const active = getActiveTrip(vNum);
      if (active) {
          setActiveTripForEditor(active);
          pushView('TRIP_EDITOR', '#trip-editor');
          closeModal();
      } else {
          if (!isPremium && trips.length >= 100) { notify("Limit Reached", "Upgrade Plan", "warning"); setIsPricingOpen(true); return; }
          const newTrip: any = { startDate: getIndianDate(), vehicleNumber: vNum, driverName: '', route: { from: '', to: '' }, partyName: '', freightAmount: '', expenses: [], status: 'RUNNING' };
          setEditingTrip(newTrip); 
          openModal('ADD_TRIP');
      }
  };

  const handleSaveTrip = async (data: any) => {
      try {
          hapticFeedback(30);
          const tripBase = {
              startDate: data.date, driverName: data.driver.toUpperCase(), route: { from: data.from.toUpperCase(), to: data.to.toUpperCase() },
              partyName: data.party.toUpperCase(), freightAmount: parseFloat(data.freight) || 0, brokerName: data.brokerName || '', brokerAmount: parseFloat(data.brokerAmount) || 0
          };

          if (activeModal === 'ADD_TRIP') {
              const trip: Trip = { ...tripBase, id: `trip-${Date.now()}`, tripNumber: parseInt(Date.now().toString().slice(-7)), vehicleNumber: editingTrip?.vehicleNumber || 'UNKNOWN', expenses: [], totalExpense: 0, netProfit: tripBase.freightAmount, status: 'RUNNING', lastUpdated: Date.now() };
              await addOrUpdateTrip(trip);
              setActiveTripForEditor(trip);
              pushView('TRIP_EDITOR', '#trip-editor');
              notify("Success", "Trip Started", "success");
          } else if (activeModal === 'EDIT_TRIP' && editingTrip) {
              const updated = { ...editingTrip, ...tripBase, netProfit: tripBase.freightAmount - editingTrip.totalExpense, lastUpdated: Date.now() };
              await addOrUpdateTrip(updated);
              if (activeTripForEditor?.id === updated.id) setActiveTripForEditor(updated);
              notify("Updated", "Manifest saved", "success");
          }
          closeModal();
      } catch (e) { notify("Error", "Save failed", "error"); }
  };

  const handleSaveExpense = async (data: any) => {
      if (!data.amount || isNaN(parseFloat(data.amount))) { notify("Invalid Amount", "Check amount", "warning"); return; }
      hapticFeedback(20);
      if (!activeTripForEditor) return;
      try {
          let updatedTrip = { ...activeTripForEditor };
          if (!updatedTrip.expenses) updatedTrip.expenses = [];
          let newExp: TripExpense | undefined = undefined;
          
          if (activeModal === 'ADD_EXPENSE') {
              newExp = { id: `exp-${Date.now()}`, date: data.date, time: data.time, type: data.type, amount: parseFloat(data.amount) || 0, paidBy: data.paidBy || 'OWNER', notes: data.notes || '' };
              updatedTrip.expenses = [...updatedTrip.expenses, newExp];
          } else if (activeModal === 'EDIT_EXPENSE' && editingExpense) {
              updatedTrip.expenses = updatedTrip.expenses.map(e => e.id === editingExpense.id ? { ...e, date: data.date, time: data.time, type: data.type, amount: parseFloat(data.amount)||0, paidBy: data.paidBy, notes: data.notes } : e);
          }
          const totalExp = updatedTrip.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          updatedTrip.totalExpense = totalExp;
          updatedTrip.netProfit = (Number(updatedTrip.freightAmount) || 0) - totalExp;
          updatedTrip.lastUpdated = Date.now();
          
          await addOrUpdateTrip(updatedTrip, newExp);
          setActiveTripForEditor(updatedTrip);
          notify("Saved", "Expense recorded", "success");
          closeModal();
      } catch (e) { notify("Error", "Could not save expense", "error"); }
  };

  const handleExportRequest = (format: 'xlsx' | 'pdf') => {
      handleExportAllTrips(filteredTrips, format, user, dateFilter.label, profile);
      closeModal();
  };

  const renderContent = () => {
    if (view === 'TRIP_IMPORT') {
      return <TripImport onBack={() => window.history.back()} onConfirm={async (t) => { await importTrips(t); window.history.back(); }} />;
    }
    if (view === 'TRIP_EDITOR' && activeTripForEditor) {
      return <TripEditor activeTrip={activeTripForEditor} onBack={() => window.history.back()} onPrint={() => handlePrintTrip(activeTripForEditor, profile)} onEndTrip={() => endTrip(activeTripForEditor).then(() => window.history.back())} isEnding={false} onEditTrip={() => { setEditingTrip(activeTripForEditor); openModal('EDIT_TRIP'); }} onEditExpense={(e) => { setEditingExpense(e); openModal('EDIT_EXPENSE'); }} onDelete={(id) => removeExpense(activeTripForEditor.id, id)} onAddExpense={() => openModal('ADD_EXPENSE')} />;
    }
    if (view === 'VEHICLE_HISTORY' && selectedVehicle) {
      const vTrips = filteredTrips.filter(t => normalize(t.vehicleNumber) === normalize(selectedVehicle.number));
      return <TripHistory selectedVehicle={selectedVehicle} activeTrip={getActiveTrip(selectedVehicle.number) || null} dateFilter={dateFilter} onFilterChange={setDateFilter} vehicleHistoryTrips={vTrips} onBack={() => window.history.back()} onViewEditor={(t) => { setActiveTripForEditor(t); pushView('TRIP_EDITOR', '#trip-editor'); }} onStartTrip={() => handleStartTripForVehicle(selectedVehicle.number)} onPrintHistory={() => handlePrintVehicleHistory(selectedVehicle, vTrips, dateFilter.label, profile || user)} onEditTrip={(t) => { setEditingTrip(t); setActiveTripForEditor(t); openModal('EDIT_TRIP'); }} onDeleteTrip={(id) => { setTripToDelete(id); openModal('CONFIRM_DELETE'); }} onPrintSingleTrip={(t) => handlePrintTrip(t, profile)} onAddExpense={(t) => { setActiveTripForEditor(t); openModal('ADD_EXPENSE'); }} onGenerateBill={(t) => { setEditingTrip(t); openModal('BILL_DETAILS'); }} isPremium={isPremium} onUnlockPremium={() => { notify("Premium", "Unlock full history", "info"); setIsPricingOpen(true); }} />;
    }
    
    // Default List View
    return (
      <div className="h-full w-full overflow-y-auto no-scrollbar">
        <div className="pt-4 pb-40 px-4 max-w-lg mx-auto">
          <TripBookHeader onBack={onBack} onOpenFilter={() => openModal('FILTER_DATE')} dateLabel={dateFilter.label} />
          <TripBookStatsSection stats={stats} activeView={view === 'ALL_EXPENSES' ? 'EXPENSES' : (vehicleSort === 'DEFAULT' ? 'ALL' : vehicleSort)} onViewTrips={() => { if(view !== 'VEHICLES') setView('VEHICLES'); setVehicleSort('TRIPS'); listTopRef.current?.scrollIntoView({ behavior: 'smooth' }); }} onViewFare={() => { if(view !== 'VEHICLES') setView('VEHICLES'); setVehicleSort('PROFIT'); listTopRef.current?.scrollIntoView({ behavior: 'smooth' }); }} onViewExpenses={() => pushView('ALL_EXPENSES', '#all-expenses')} filterOnlyWithTrips={false} view={view} />
          {view === 'VEHICLES' && (
            <>
              <div ref={listTopRef}></div>
              <TripBookQuickActions onStartTrip={handleStartTrip} onImport={() => isPremium ? pushView('TRIP_IMPORT', '#trip-import') : setIsPricingOpen(true)} onExport={() => openModal('EXPORT_MENU')} isPremium={isPremium} />
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search trucks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm outline-none font-bold text-sm text-slate-900 dark:text-white" />
                {vehicleSort !== 'DEFAULT' && <button onClick={() => setVehicleSort('DEFAULT')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase">Clear</button>}
              </div>
              <VehicleGrid 
                vehicles={visibleVehicles} 
                loading={tripsLoading} 
                onVehicleClick={(v) => { 
                    setSelectedVehicle(v); 
                    pushView('VEHICLE_HISTORY', '#vehicle-history'); 
                }} 
                getActiveTrip={getActiveTrip} 
                getTripCount={getFilteredTripCount} 
                getTripProfit={getFilteredTripProfit} 
                onShowAll={() => setVehicleSort('DEFAULT')} 
                currentSort={vehicleSort} 
              />
              {visibleVehicles.length < sortedVehicles.length && <div className="flex justify-center mt-6"><button onClick={() => setDisplayLimit(prev => prev + BATCH_SIZE)} className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center gap-2">Load More <ChevronDown size={14} /></button></div>}
            </>
          )}
          {view === 'ALL_EXPENSES' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Daily Records</h3><button onClick={() => window.history.back()} className="text-[10px] font-black text-indigo-600 uppercase">Back</button></div>
              <ExpenseList expenses={visibleExpenses} onSelect={(e) => { const t = trips.find(trip => trip.id === e.tripId); if(t) { setActiveTripForEditor(t); pushView('TRIP_EDITOR', '#trip-editor'); } }} />
              {visibleExpenses.length < allExpenses.length && <div className="flex justify-center mt-6"><button onClick={() => setDisplayLimit(prev => prev + BATCH_SIZE)} className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center gap-2">Load More <ChevronDown size={14} /></button></div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
      <>
          {renderContent()}
          <TripBookModalManager activeModal={activeModal} setActiveModal={setActiveModal} editingTrip={editingTrip} editingExpense={editingExpense} handleSaveTrip={handleSaveTrip} handleSaveExpense={handleSaveExpense} handleStartTripForVehicle={handleStartTripForVehicle} executeDelete={() => { if(tripToDelete) removeTrip(tripToDelete); closeModal(); }} onExport={handleExportRequest} onAddExpenseToTrip={() => openModal('ADD_EXPENSE')} onFinalizeBill={(data) => { if (editingTrip) addOrUpdateTrip({ ...editingTrip, invoiceNumber: data.invoiceNo, billDate: data.billDate, billStatus: 'DONE' }); closeModal(); }} onApplyDateFilter={setDateFilter} isPremium={isPremium} />
          {profile && <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} userProfile={profile} />}
      </>
  );
};
