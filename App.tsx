
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, Home, Search, Bell, Loader2, X, Truck, 
  ShieldCheck, ChevronRight, Zap, Cloud, CloudOff,
  Layout, Book, Download, Upload, BellRing, Smartphone, 
  CheckCircle2, FileText, Settings, Sparkles, Activity, PieChart, Wallet, ArrowUpRight, ArrowDownLeft, AlertTriangle, BarChart3, ArrowDown, WifiOff, TrendingUp
} from 'lucide-react';
import { Vehicle, ViewState, UserProfile, Trip, LedgerAccount, Bilty, AppNotification } from './types';
import { 
    subscribeToAuthChanges, logoutUser, saveVehicle, deleteVehicle, notify, 
    updateUserProfile, syncFullData, resetAllUserData, seedDemoData, 
    resetVehicleData, requestNotificationPermission, updateUserExpirySettings, 
    resetLedgerData, resetTripData, resetBiltyData, 
    subscribeToVehicles, subscribeToTrips, subscribeToUserProfile, subscribeToLedgers, subscribeToBilties,
    subscribeToNotifications, markNotificationsAsRead,
    saveInAppNotification,
    processOfflineQueue,
    checkAppVersion,
    ensureDeviceToken
} from './services/firebaseService';
import { onMessage } from 'firebase/messaging';
import { messaging, db } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { AuthScreen, EmailVerificationScreen } from './components/AuthScreen';
import { OnboardingPhone } from './components/OnboardingPhone';
import { VehicleList } from './components/VehicleList';
import { AddVehicleModal } from './components/AddVehicleModal';
import { SettingsSheet } from './components/SettingsSheet';
import { ExportModal } from './components/ExportModal';
import { getTrafficLightStats, getStatusColor, getDaysRemaining } from './utils/helpers';
import { AboutModal, PrivacyPolicyModal, TermsConditionsModal } from './components/PolicyModals';
import { PricingModal } from './components/PricingModal';
import { UserProvider, useUser } from './context/UserContext';
import { generateFleetReportPDF } from './utils/pdfGenerator';
import { handleExportFleet } from './utils/tripUtils';
import { hapticFeedback } from './utils/haptics';
import { usePullToRefresh, PULL_THRESHOLD } from './hooks/usePullToRefresh';

import { BiltyBook } from './components/BiltyBook';
import { LedgerBook } from './components/LedgerBook';
import { TripBook } from './components/TripBook';
import { AdminPanel } from './components/AdminPanel';
import { GlobalSearch } from './components/GlobalSearch';
import { ImportView } from './components/ImportView';
import { AIAssistant } from './components/AIAssistant';
import { NotificationPromptModal } from './components/NotificationPromptModal';
import { NotificationCenter } from './components/NotificationCenter';
import { DownloadSuccessModal } from './components/DownloadSuccessModal';
import { SecurityLock } from './components/SecurityLock';
import { DashboardStatsSkeleton } from './components/SkeletonLoader';
import { AutoStartPermission } from './components/AutoStartPermission';
import { InstallAppCard } from './components/InstallAppCard';
import { SimpleLineChart } from './components/SimpleLineChart';

// NATIVE IMPORTS
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

type HealthFilter = 'all' | 'expired' | 'warning' | 'safe';

interface ToastMsg {
  id: number;
  title: string;
  body: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// --- ANIMATED COUNTER COMPONENT ---
const CountUp: React.FC<{ value: number; prefix?: string; suffix?: string; decimals?: number; trigger?: boolean }> = ({ value, prefix = '', suffix = '', decimals = 0, trigger = true }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!trigger) {
        setDisplayValue(0);
        return;
    }

    let startTimestamp: number | null = null;
    const duration = 1200; 
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const easeOut = (x: number): number => {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
      };

      const current = startValue + (value - startValue) * easeOut(progress);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, trigger]); 

  const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
  }).format(displayValue);

  return <>{prefix}{formatted}{suffix}</>;
};

// ... (DashboardCarousel Component kept same)
const DashboardCarousel: React.FC<{ 
  stats: any, 
  trips: Trip[],
  accounts: LedgerAccount[],
  totalVehicles: number,
  setFilterStatus: (s: HealthFilter) => void,
  filterStatus: HealthFilter,
  onNavigate: (view: any) => void,
  loading: boolean
}> = ({ stats, trips, accounts, totalVehicles, setFilterStatus, filterStatus, onNavigate, loading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  const [isPaused, setIsPaused] = useState(false); 

  useEffect(() => {
      const interval = setInterval(() => {
          if (!isPaused && scrollRef.current) {
              const nextIndex = (activeCard + 1) % 3;
              const width = scrollRef.current.clientWidth;
              scrollRef.current.scrollTo({
                  left: width * nextIndex,
                  behavior: 'smooth'
              });
          }
      }, 4500);

      return () => clearInterval(interval);
  }, [activeCard, isPaused]);

  const finance = useMemo(() => {
      return trips.reduce((acc, t) => {
          acc.revenue += (t.freightAmount || 0);
          acc.expense += (t.totalExpense || 0);
          acc.profit += ((t.freightAmount || 0) - (t.totalExpense || 0));
          return acc;
      }, { revenue: 0, expense: 0, profit: 0 });
  }, [trips]);

  const chartData = useMemo(() => {
      const months = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthName = d.toLocaleString('default', { month: 'short' });
          const year = d.getFullYear();
          const monthIdx = d.getMonth();
          
          const monthlyProfit = trips
            .filter(t => {
                const tDate = new Date(t.startDate);
                return tDate.getMonth() === monthIdx && tDate.getFullYear() === year;
            })
            .reduce((sum, t) => sum + (t.netProfit || 0), 0);
            
          months.push({ label: monthName, value: monthlyProfit });
      }
      return months;
  }, [trips]);

  const dateRangeLabel = useMemo(() => {
      if (chartData.length < 2) return "";
      return `${chartData[0].label} to ${chartData[chartData.length-1].label}`;
  }, [chartData]);

  const ledgerSummary = useMemo(() => {
    return accounts.reduce((acc, account) => {
        if (account.balance > 0) {
            acc.receivable += account.balance;
        } else if (account.balance < 0) {
            acc.payable += Math.abs(account.balance);
        }
        return acc;
    }, { receivable: 0, payable: 0 });
  }, [accounts]);

  const cardClass = "min-w-full snap-center p-1"; 
  const bigNumClass = "text-[clamp(1.8rem,5vw,2.5rem)] font-black leading-tight";
  const labelClass = "text-[clamp(0.5rem,2vw,0.7rem)] font-black uppercase tracking-widest";

  if (loading) return <DashboardStatsSkeleton />;

  return (
    <div 
        className="relative mb-8 group"
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
        onMouseDown={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        ref={scrollRef}
        onScroll={() => {
            if (scrollRef.current) {
                const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
                if (index !== activeCard) setActiveCard(index);
            }
        }}
        className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        <div className={cardClass}>
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-700 rounded-[2.5rem] p-6 h-52 shadow-2xl relative overflow-hidden flex flex-col justify-between border-4 border-white/20">
             <div className="flex justify-between items-start relative z-10">
                <div>
                   <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full mb-2 border border-white/20">
                       <Sparkles size={12} className="text-amber-300" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">Fleet Master</span>
                   </div>
                   <h3 className="text-[clamp(1.2rem,4vw,1.5rem)] font-black text-white leading-none tracking-tight">Health Check</h3>
                </div>
                <div onClick={() => setFilterStatus('all')} className={`w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border-2 shadow-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all ${filterStatus === 'all' ? 'border-indigo-300 bg-white/30 scale-110' : 'border-white/40'}`}>
                    <span className="text-[clamp(1.8rem,5vw,2.5rem)] font-black leading-tight text-white">
                        <CountUp value={totalVehicles} trigger={activeCard === 0} />
                    </span>
                </div>
             </div>
             <div className="grid grid-cols-3 gap-3 relative z-10">
                <div onClick={() => setFilterStatus('expired')} className={`p-2 rounded-2xl border-2 transition-all active:scale-90 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${filterStatus === 'expired' ? 'bg-red-600 border-white scale-105 shadow-xl' : 'bg-white/10 border-white/10'}`}>
                   <span className="text-xl font-black text-white"><CountUp value={stats.expired} trigger={activeCard === 0} /></span>
                   <span className="text-[8px] font-black uppercase text-white/80">Expired</span>
                </div>
                <div onClick={() => setFilterStatus('warning')} className={`p-2 rounded-2xl border-2 transition-all active:scale-90 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${filterStatus === 'warning' ? 'bg-amber-500 border-white scale-105 shadow-xl' : 'bg-white/10 border-white/10'}`}>
                   <span className="text-xl font-black text-white"><CountUp value={stats.warning} trigger={activeCard === 0} /></span>
                   <span className="text-[8px] font-black uppercase text-white/80">Alert</span>
                </div>
                <div onClick={() => setFilterStatus('safe')} className={`p-2 rounded-2xl border-2 transition-all active:scale-90 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${filterStatus === 'safe' ? 'bg-emerald-500 border-white scale-105 shadow-xl' : 'bg-white/10 border-white/10'}`}>
                   <span className="text-xl font-black text-white"><CountUp value={stats.safe} trigger={activeCard === 0} /></span>
                   <span className="text-[8px] font-black uppercase text-white/80">Safe</span>
                </div>
             </div>
          </div>
        </div>

        <div className={cardClass}>
          <div onClick={() => onNavigate('trips')} className="bg-slate-900 rounded-[2.5rem] p-5 h-52 shadow-xl relative overflow-hidden flex flex-col justify-between text-white border-4 border-slate-800 cursor-pointer active:scale-[0.99] transition-all">
             <div className="flex justify-between items-start z-10">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/5 mb-1 backdrop-blur-md">
                       <Wallet size={12} className="text-emerald-400" />
                       <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Net Profit</span>
                    </div>
                    <h2 className={`${bigNumClass} ${finance.profit >= 0 ? 'text-white' : 'text-red-400'} truncate`}>
                       <span className="text-lg opacity-50 mr-1 font-bold">₹</span><CountUp value={finance.profit} trigger={activeCard === 1} />
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 ml-1">{dateRangeLabel}</p>
                </div>
                
                <div className="text-right space-y-2">
                    <div>
                        <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Inc</p>
                        <p className="text-xs font-black">₹<CountUp value={finance.revenue/100000} decimals={1} suffix="L" trigger={activeCard === 1} /></p>
                    </div>
                    <div>
                        <p className="text-[8px] font-bold text-red-400 uppercase tracking-wider">Exp</p>
                        <p className="text-xs font-black">₹<CountUp value={finance.expense/100000} decimals={1} suffix="L" trigger={activeCard === 1} /></p>
                    </div>
                </div>
             </div>
             
             <div className="flex-1 w-full relative min-h-[80px] z-0 mt-3 -mb-1">
                 <SimpleLineChart 
                    data={chartData} 
                    height={85} 
                    color={finance.profit >= 0 ? '#34d399' : '#f87171'} 
                 />
             </div>
          </div>
        </div>

        <div className={cardClass}>
          <div onClick={() => onNavigate('ledger')} className="bg-slate-900 rounded-[2.5rem] p-6 h-52 shadow-xl relative overflow-hidden flex flex-col justify-between text-white border-4 border-slate-800 cursor-pointer active:scale-[0.99] transition-all">
             <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/5 mb-3 backdrop-blur-md">
                   <Book size={12} className="text-indigo-400" />
                   <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Ledger Overview</span>
                </div>
                <h2 className={`${bigNumClass} text-white truncate`}>
                   Khaata Summary
                </h2>
             </div>
             <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between min-w-0">
                   <div className="min-w-0 overflow-hidden">
                      <p className={labelClass + " text-emerald-500 mb-0.5"}>Receivable</p>
                      <p className="text-sm font-black truncate">₹<CountUp value={ledgerSummary.receivable} trigger={activeCard === 2} /></p>
                   </div>
                   <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between min-w-0">
                   <div className="min-w-0 overflow-hidden">
                      <p className={labelClass + " text-red-500 mb-0.5"}>Payable</p>
                      <p className="text-sm font-black truncate">₹<CountUp value={ledgerSummary.payable} trigger={activeCard === 2} /></p>
                   </div>
                   <ArrowDownLeft size={14} className="text-red-500 shrink-0" />
                </div>
             </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-4">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeCard === i ? 'bg-indigo-600 w-4' : 'bg-slate-300 dark:bg-slate-700'}`} />
        ))}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, userProfile, loading: authLoading } = useUser();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [bilties, setBilties] = useState<Bilty[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // DEEP LINK LOGIC: Initialize View Stack based on URL Hash
  const [viewStack, setViewStack] = useState<(ViewState | 'home' | 'alerts' | 'search' | 'admin')[]>(() => {
      const hash = window.location.hash;
      if (hash === '#alerts') return ['home', 'alerts'];
      return ['home'];
  });
  
  const view = viewStack[viewStack.length - 1];
  
  const [filterStatus, setFilterStatus] = useState<HealthFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [showPhoneOnboarding, setShowPhoneOnboarding] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [downloadSuccessData, setDownloadSuccessData] = useState<{ filename: string; path: string; uri: string } | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [showAutoStart, setShowAutoStart] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallCard, setShowInstallCard] = useState(false);
  
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  const [darkMode, setDarkMode] = useState(() => {
      if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('theme');
          if (stored === 'dark') return true;
      }
      return false; 
  });
  
  const [expiryDays, setExpiryDays] = useState(15);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notifPermission, setNotifPermission] = useState('default');

  const APP_VERSION = "1.6.0"; 

  // --- SPLASH SCREEN CONTROL ---
  useEffect(() => {
    // Only remove splash screen when we are SURE about the auth state
    if (!authLoading) {
        const splash = document.getElementById('splash-screen');
        if (splash && !splash.classList.contains('fade-out')) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.style.display = 'none', 800);
        }
    }
  }, [authLoading]);

  // --- HISTORY STACK FIX FOR NOTIFICATIONS (COLD START) ---
  useEffect(() => {
      // If the app loads with #alerts (e.g., from a notification click),
      // the browser history is length 1 (just the alerts page).
      // Pressing 'Back' would exit the app.
      // We manually inject 'Home' into the history stack so Back goes to Home.
      if (window.location.hash === '#alerts') {
          // 1. Replace current 'Alerts' entry with 'Home'
          window.history.replaceState({ viewStack: ['home'] }, '', window.location.pathname);
          // 2. Push 'Alerts' on top
          window.history.pushState({ viewStack: ['home', 'alerts'] }, '', window.location.pathname + '#alerts');
          // 3. Ensure React state matches
          setViewStack(['home', 'alerts']);
      }
  }, []);

  // --- DEEP LINK LISTENER (Foreground Notification Click) ---
  useEffect(() => {
      const handleHashChange = () => {
          const hash = window.location.hash;
          if (hash === '#alerts') {
              setViewStack(prev => {
                  if (prev[prev.length - 1] === 'alerts') return prev;
                  // If we receive a hash change while running, we push to stack
                  return ['home', 'alerts']; 
              });
          }
      };

      window.addEventListener('hashchange', handleHashChange);
      
      // Safety check: if hash exists but viewStack doesn't match
      if (window.location.hash === '#alerts' && viewStack[viewStack.length-1] !== 'alerts') {
          setViewStack(['home', 'alerts']);
      }

      return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // PWA Install Logic
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('install_dismissed');
      if (!dismissed) setShowInstallCard(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallCard(false);
      }
    }
  };

  const handleInstallDismiss = () => {
    setShowInstallCard(false);
    localStorage.setItem('install_dismissed', 'true');
  };

  // ... (Keep existing Version Check, Native Init, PWA Install code)

  useEffect(() => {
    const isPhoneUser = user && !user.email;
    if (user && (user.emailVerified || isPhoneUser)) {
        ensureDeviceToken(user.uid);
        const skeletonMinTime = new Promise(resolve => setTimeout(resolve, 1200));
        const loadingTimeout = setTimeout(() => {
            if (isDataLoading) {
                console.warn("Forcing data load completion after 5s");
                setIsDataLoading(false);
            }
        }, 5000);

        const unsubVehicles = subscribeToVehicles(user.uid, async (data) => {
            setVehicles(data);
            await skeletonMinTime;
            setIsDataLoading(false); 
            clearTimeout(loadingTimeout);
        });
        const unsubTrips = subscribeToTrips(user.uid, setTrips);
        const unsubLedgers = subscribeToLedgers(user.uid, setAccounts);
        const unsubBilties = subscribeToBilties(user.uid, setBilties);
        const unsubNotifications = subscribeToNotifications(user.uid, setNotifications);
        
        if (navigator.onLine) processOfflineQueue();

        let unsubOnMessage: (() => void) | undefined;
        if (messaging) {
            unsubOnMessage = onMessage(messaging, (payload) => {
                // IGNORE HEARTBEAT MESSAGES
                if (payload.data?.type === 'HEARTBEAT') {
                    console.log("Ignored Heartbeat in Foreground");
                    return;
                }

                const title = payload.data?.title || payload.notification?.title || 'New Message';
                const body = payload.data?.body || payload.notification?.body || '';
                
                notify(title, body, 'info');
                
                const newNotif: AppNotification = {
                    id: `notif-${Date.now()}`,
                    title: title,
                    body: body,
                    type: payload.data?.tag?.includes('broadcast') ? 'BROADCAST' : 'ALERT',
                    timestamp: Date.now(),
                    isRead: false,
                    link: payload.data?.url || '/#alerts'
                };
                saveInAppNotification(user.uid, newNotif);
            });
        }
        return () => { 
            unsubVehicles(); unsubTrips(); unsubLedgers(); unsubBilties(); unsubNotifications();
            if (unsubOnMessage) unsubOnMessage();
            clearTimeout(loadingTimeout);
        };
    }
  }, [user]);

  // ... (Keep existing Navigation, Theme, and Rendering logic)

  useEffect(() => {
    // Theme application
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Handle native keyboard visibility
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/keyboard').then(({ Keyboard }) => {
        Keyboard.addListener('keyboardWillShow', () => setIsKeyboardOpen(true));
        Keyboard.addListener('keyboardWillHide', () => setIsKeyboardOpen(false));
      });
    }
  }, []);

  const navigate = (newView: ViewState | 'home' | 'alerts' | 'search' | 'admin') => {
    if (view === newView && viewStack.length > 1) return;
    hapticFeedback(10);
    const newStack = [...viewStack, newView];
    window.history.pushState({ viewStack: newStack }, '');
    setViewStack(newStack);
  };
  
  const navigateToHome = () => {
    hapticFeedback(10);
    setViewStack(['home']);
    window.history.replaceState({ viewStack: ['home'] }, '');
    // Ensure URL matches home
    if (window.location.hash) window.history.pushState("", document.title, window.location.pathname + window.location.search);
  };

  const handleBackNavigation = () => {
    if (viewStack.length > 1) {
        window.history.back();
    } else if (view !== 'home') {
        navigateToHome();
    }
  };

  const swipeRef = useRef({ startX: 0, active: false }).current;
  const SWIPE_THRESHOLD = 80;
  const SWIPE_EDGE = 40;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewStack.length > 1 && e.touches[0].clientX < SWIPE_EDGE) {
      swipeRef.startX = e.touches[0].clientX;
      swipeRef.active = true;
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeRef.active) return;
    const deltaX = e.changedTouches[0].clientX - swipeRef.startX;
    if (deltaX > SWIPE_THRESHOLD) handleBackNavigation();
    swipeRef.active = false;
    swipeRef.startX = 0;
  };
  
  const handleRefresh = async () => {
    if (!user) return;
    try {
        await syncFullData(user.uid);
        await ensureDeviceToken(user.uid);
        notify("Synced!", "Your fleet data is up to date.", "success");
    } catch (e) {
        notify("Sync Failed", "Could not connect to the server.", "error");
    }
  };
  const { isRefreshing, pullPosition, touchHandlers } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    const handleToast = (e: CustomEvent) => {
      const newToast = { ...e.detail, id: Date.now() + Math.random() };
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToast.id)), 4000);
    };
    window.addEventListener('fleetdost-toast' as any, handleToast);
    return () => window.removeEventListener('fleetdost-toast' as any, handleToast);
  }, []);

  useEffect(() => {
      const handleFileSaved = (e: CustomEvent) => {
          setDownloadSuccessData(e.detail);
      };
      window.addEventListener('fleetdost-file-saved' as any, handleFileSaved);
      return () => window.removeEventListener('fleetdost-file-saved' as any, handleFileSaved);
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Clear URL hash if explicitly triggered by Back when no modal is open
      if (window.location.hash === '#alerts') {
          // If user hit back from alerts, clear hash
          // Handled by viewStack logic below
      } else if (window.location.hash === '') {
          // Normal navigation
      }

      if (downloadSuccessData || isPricingOpen || isTermsOpen || isPrivacyOpen || isAboutOpen || isExportOpen || isSettingsOpen || isModalOpen) {
        window.history.pushState(null, '', window.location.href); 
        setDownloadSuccessData(null);
        setIsPricingOpen(false); setIsTermsOpen(false); setIsPrivacyOpen(false); setIsAboutOpen(false); setIsExportOpen(false); setIsSettingsOpen(false); setIsModalOpen(false);
        return;
      }
      
      const newStack = e.state?.viewStack;
      if (newStack && Array.isArray(newStack) && newStack.length > 0) {
        setViewStack(newStack);
      } else {
        // Fallback for when history state is lost but browser history exists
        if (viewStack.length > 1) {
            setViewStack(prev => prev.slice(0, -1));
        } else {
            setViewStack(['home']);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isPricingOpen, isTermsOpen, isPrivacyOpen, isAboutOpen, isExportOpen, isSettingsOpen, isModalOpen, downloadSuccessData, viewStack]);

  useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && user) {
           ensureDeviceToken(user.uid);
           if (navigator.onLine) {
               syncFullData(user.uid);
           }
        }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  useEffect(() => {
      if (view === 'alerts') {
          const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
          if (unreadIds.length > 0 && user) {
              markNotificationsAsRead(user.uid, unreadIds);
          }
      }
  }, [view, notifications, user]);

  const stats = useMemo(() => getTrafficLightStats(vehicles, expiryDays), [vehicles, expiryDays]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
  
  const processedVehicles = useMemo(() => {
      const scored = vehicles.map(v => {
          const docList = Object.values(v.documents || {});
          let status: HealthFilter = 'safe';
          let minDays = 9999;
          docList.forEach((d: any) => {
              if (d && d.expiryDate) {
                  const s = getStatusColor(d.expiryDate, expiryDays);
                  const days = getDaysRemaining(d.expiryDate);
                  if (s === 'red') status = 'expired';
                  else if (s === 'yellow' && status !== 'expired') status = 'warning';
                  if (days < minDays) minDays = days;
              }
          });
          return { ...v, derivedStatus: status, minDays };
      });

      let filtered = scored;
      if (filterStatus !== 'all') filtered = scored.filter(v => v.derivedStatus === filterStatus);
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(v => v.number.toLowerCase().includes(q) || v.ownerName.toLowerCase().includes(q));
      }

      const statusWeight = { 'expired': 0, 'warning': 1, 'safe': 2, 'all': 3 };
      return filtered.sort((a, b) => {
          if (statusWeight[a.derivedStatus] !== statusWeight[b.derivedStatus]) return statusWeight[a.derivedStatus] - statusWeight[b.derivedStatus];
          return a.minDays - b.minDays;
      });
  }, [vehicles, filterStatus, searchQuery, expiryDays]);

  const handleAddVehicleClick = () => {
      hapticFeedback(20);
      if (userProfile?.planType !== 'PREMIUM' && vehicles.length >= 5) {
          notify("Limit Reached", "Free plan allows 5 vehicles. Upgrade now!", "warning");
          setIsPricingOpen(true);
          return;
      }
      setEditingVehicle(null);
      setIsModalOpen(true);
  };

  const handleSaveVehicle = async (v: Vehicle) => {
    if (!user) return;
    // ✅ FIX: Double protection — frontend + saveVehicle layer
    // Firestore rules mein bhi limit hai (server-side)
    if (!editingVehicle && userProfile?.planType !== 'PREMIUM' && vehicles.length >= 5) {
      notify("Limit Reached", "Free plan allows 5 vehicles. Upgrade to Premium!", "warning");
      setIsPricingOpen(true);
      return;
    }
    await saveVehicle(user.uid, v);
    notify(editingVehicle ? "Updated" : "Added", `Vehicle ${v.number} saved`, "success");
    setIsModalOpen(false);

    const currentNotifPermission = ('Notification' in window) ? Notification.permission : 'denied';
    const alreadyPrompted = localStorage.getItem('notificationPrompted') === 'true';

    if (vehicles.length === 0 && currentNotifPermission === 'default' && !alreadyPrompted) {
      setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 500);
    }
  };

  const handleEnableNotifications = async () => {
    if (!user) return;
    setShowNotificationPrompt(false);
    localStorage.setItem('notificationPrompted', 'true');
    await requestNotificationPermission(user.uid);
    setTimeout(() => { if ('Notification' in window) setNotifPermission(Notification.permission); }, 1000);
  };

  const handleAINavigation = (targetView: any, query?: string) => {
      navigate(targetView);
      if (targetView === 'home' && query === '__FILTER_EXPIRED__') {
          setFilterStatus('expired');
      } else if (query) {
          setSearchQuery(query);
      }
  };

  const handleAIAction = (action: string) => {
      if (action === 'ADD_VEHICLE') {
          handleAddVehicleClick();
      } else if (action === 'START_TRIP') {
          navigate('trips');
      } else if (action === 'CREATE_BILTY') {
          navigate('bilty');
          setTimeout(() => window.dispatchEvent(new CustomEvent('bilty-open-create')), 100);
      } else if (action === 'CREATE_LEDGER') {
          navigate('ledger');
          setTimeout(() => window.dispatchEvent(new CustomEvent('ledger-open-create')), 100);
      }
  };

  const handleExport = (type: 'xlsx' | 'csv' | 'pdf' | 'share') => {
      if (type === 'pdf') {
          generateFleetReportPDF(processedVehicles, userProfile);
      } else if (type === 'xlsx' || type === 'csv') {
          handleExportFleet(processedVehicles, type, userProfile);
      } else {
          notify("Exporting", `Generating ${type.toUpperCase()}...`, "info");
      }
      setIsExportOpen(false);
  };

  const renderView = (viewToRender: string | ViewState | 'alerts' | 'search' | 'admin') => {
    const commonProps = { user: user!, onBack: handleBackNavigation, initialSearch: searchQuery };
    switch (viewToRender) {
      case 'home':
        return (
          <div className="h-full w-full overflow-y-auto no-scrollbar scroll-smooth pt-4 pb-40" {...touchHandlers}>
            <div 
                className="absolute top-2 left-0 right-0 flex justify-center items-center pointer-events-none transition-transform duration-200 z-10"
                style={{ transform: `translateY(${pullPosition-60}px)` }}
            >
                <div className={`p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg transition-all duration-200 ${isRefreshing || pullPosition > PULL_THRESHOLD ? 'opacity-100' : 'opacity-0'}`}>
                    {isRefreshing 
                        ? <Loader2 className="animate-spin text-indigo-500" size={20} /> 
                        : <ArrowDown size={20} className="text-slate-400 transition-transform" style={{ transform: `rotate(${pullPosition > PULL_THRESHOLD ? '180deg' : '0deg'})` }} />
                    }
                </div>
            </div>
            <main className="max-w-md mx-auto px-5 pt-2">
              <div className="space-y-8">
                {showInstallCard && <InstallAppCard onInstall={handleInstallClick} onDismiss={handleInstallDismiss} />}
                <DashboardCarousel stats={stats} trips={trips} accounts={accounts} totalVehicles={vehicles.length} setFilterStatus={setFilterStatus} filterStatus={filterStatus} onNavigate={navigate} loading={isDataLoading} />
                <div className="grid grid-cols-3 gap-3">
                    <div onClick={() => navigate('ledger')} className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all border border-slate-100 dark:border-white/5 cursor-pointer">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center"> <Book size={18} /> </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Accounts</span>
                    </div>
                    <div onClick={() => navigate('import')} className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all border border-slate-100 dark:border-white/5 cursor-pointer">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center"> <Upload size={18} /> </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Import</span>
                    </div>
                    <div onClick={() => setIsExportOpen(true)} className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all border border-slate-100 dark:border-white/5 cursor-pointer">
                        <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center"> <Download size={18} /> </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Reports</span>
                    </div>
                </div>
                <div id="vehicle-list-section" className="space-y-4">
                    <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Activity size={14} className="text-indigo-600" /><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{filterStatus === 'all' ? 'Your Fleet' : `${filterStatus.toUpperCase()} Vehicles`}</h3></div>{filterStatus !== 'all' && (<button onClick={() => setFilterStatus('all')} className="text-[8px] font-black uppercase text-indigo-600 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">Clear Filter</button>)}</div>
                    <div className="relative mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Truck Number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-sm outline-none font-bold text-sm text-slate-900 dark:text-white" /></div>
                    <VehicleList vehicles={processedVehicles} expiryDays={expiryDays} onEdit={(v) => { setEditingVehicle(v); setIsModalOpen(true); }} onDelete={async (id) => { if(user) await deleteVehicle(user.uid, id); }} loading={isDataLoading} />
                </div>
              </div>
            </main>
          </div>
        );
      case 'alerts':
        return <NotificationCenter notifications={notifications} vehicles={vehicles} expiryDays={expiryDays} onBack={handleBackNavigation} />;
      case 'bilty': return <BiltyBook {...commonProps} onBack={() => { handleBackNavigation(); setSearchQuery(''); }} />;
      case 'ledger': return <LedgerBook {...commonProps} onBack={() => { handleBackNavigation(); setSearchQuery(''); }} />;
      case 'trips': return <TripBook {...commonProps} vehicles={vehicles} onBack={() => { handleBackNavigation(); setSearchQuery(''); }} />;
      case 'import': return <ImportView onBack={handleBackNavigation} isPremium={userProfile?.planType === 'PREMIUM'} onOpenPricing={() => setIsPricingOpen(true)} onImport={async (iv) => { if (!user) return; for (const v of iv) await saveVehicle(user.uid, v); }} />;
      case 'search': return <GlobalSearch {...commonProps} vehicles={vehicles} onNavigate={(v, q) => { navigate(v as any); setSearchQuery(q); }} />;
      case 'admin': return <AdminPanel {...commonProps} />;
      default: return null;
    }
  };

  if (authLoading) return null;

  return (
    <div className="fixed inset-0 bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 transition-colors duration-500 overflow-hidden flex flex-col">
      <SecurityLock 
          isOpen={isLocked} 
          onSuccess={() => setIsLocked(false)} 
      />

      <div className="fixed top-4 left-0 right-0 z-[10000] flex flex-col items-center gap-2 pointer-events-none px-4 safe-area-top">
        {!isOnline && (
            <div className="w-full max-w-sm bg-slate-900 text-white rounded-2xl p-3 flex items-center justify-between shadow-xl animate-slide-down pointer-events-auto border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-xl"><WifiOff size={16} className="text-red-400" /></div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide">You are Offline</p>
                        <p className="text-[10px] text-slate-400">Changes will sync when online.</p>
                    </div>
                </div>
            </div>
        )}
        
        {toasts.map(t => (<div key={t.id} className="animate-slide-down bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 flex items-start gap-3 max-w-sm pointer-events-auto backdrop-blur-md"><div className={`p-2 rounded-full shrink-0 ${ t.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600' }`}>{t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</div><div className="flex-1"><h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{t.title}</h4><p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t.body}</p></div><button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-slate-400"> <X size={14} /> </button></div>))}
      </div>

      {!user ? (<AuthScreen />) : (user.email && !user.emailVerified) ? (<EmailVerificationScreen user={user} onVerified={() => window.location.reload()} />) : showPhoneOnboarding ? (<OnboardingPhone user={user} onComplete={() => setShowPhoneOnboarding(false)} /> ) : (
        <>
            {/* Always Visible Header - Part of Flex Layout */}
            <header className="z-50 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div onClick={navigateToHome} className="flex items-center gap-3 group cursor-pointer active:scale-95 transition-all"><div className="bg-indigo-600 rounded-xl p-2 shadow-lg shrink-0"><Truck size={18} className="text-white" strokeWidth={2.5} /></div><div className="flex flex-col"><h1 className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tighter leading-none">FleetDost</h1><div className="flex items-center gap-1 mt-0.5">{isOnline ? <Cloud size={10} className="text-emerald-500" /> : <CloudOff size={10} className="text-red-500 animate-pulse" />}<span className={`text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-indigo-500' : 'text-red-500'}`}> {isOnline ? 'Realtime Sync' : 'Offline Mode'} </span></div></div></div>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('alerts')} className="relative p-2.5 bg-slate-100/50 dark:bg-white/5 rounded-full transition-colors active:bg-slate-200"><Bell size={22} className="text-slate-700 dark:text-white" />{unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>}</button>
                    <button onClick={() => setIsSettingsOpen(true)} className="w-11 h-11 rounded-full border-2 border-indigo-500/20 overflow-hidden shadow-md active:scale-90 transition-all">{userProfile?.photoURL ? <img src={userProfile.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">{user?.displayName?.[0]}</div>}</button>
                </div>
            </header>
            
            <div 
              className="relative h-full w-full flex-1 overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
                <div key={String(view)} className="absolute inset-0 bg-background-light dark:bg-background-dark animate-fade-in">
                    {renderView(view)}
                </div>
            </div>

            {/* Always Visible Bottom Nav (Except keyboard) - Higher Z-Index */}
            {!isKeyboardOpen && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 safe-bottom z-[70] transition-all duration-300 pb-[env(safe-area-inset-bottom)]">
                    <div className="flex justify-between items-center px-6 h-[4.5rem]">
                        <button onClick={navigateToHome} className={`flex flex-col items-center gap-1 transition-colors ${view === 'home' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><Home size={22} strokeWidth={view === 'home' ? 3 : 2.5} /><span className="text-[9px] font-black uppercase tracking-wider">Home</span></button>
                        <button onClick={() => navigate('search')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'search' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><Search size={22} strokeWidth={view === 'search' ? 3 : 2.5} /><span className="text-[9px] font-black uppercase tracking-wider">Search</span></button>
                        <div className="relative -top-6"><button onClick={handleAddVehicleClick} className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center border-4 border-slate-50 dark:border-slate-950 active:scale-90 transition-transform group"><Plus size={30} strokeWidth={3} className="group-hover:rotate-90 transition-transform" /></button></div>
                        <button onClick={() => navigate('trips')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'trips' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><Truck size={22} strokeWidth={view === 'trips' ? 3 : 2.5} /><span className="text-[9px] font-black uppercase tracking-wider">Trips</span></button>
                        <button onClick={() => navigate('bilty')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'bilty' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={22} strokeWidth={view === 'bilty' ? 3 : 2.5} /><span className="text-[9px] font-black uppercase tracking-wider">Bilty</span></button>
                    </div>
                </div>
            )}

            <AIAssistant onNavigate={handleAINavigation} onAction={handleAIAction} vehicles={vehicles} trips={trips} accounts={accounts} bilties={bilties} />
            <AddVehicleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveVehicle} initialData={editingVehicle} />
            {user && (<SettingsSheet isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} userProfile={userProfile} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} onLogout={logoutUser} onAbout={() => setIsAboutOpen(true)} onPrivacy={() => setIsPrivacyOpen(true)} onTerms={() => setIsTermsOpen(true)} onUpdateProfile={async (n, p) => { if(user) await updateUserProfile(user, n, p); }} onSync={async () => { if(user) await syncFullData(user.uid); }} onResetVehicles={async () => { if(user) await resetVehicleData(user.uid); }} onResetLedger={async () => { if(user) await resetLedgerData(user.uid); }} onResetTrips={async () => { if(user) await resetTripData(user.uid); }} onResetBilties={async () => { if(user) await resetBiltyData(user.uid); }} onFactoryReset={async () => { if(user) await resetAllUserData(user.uid); }} onSeedDemo={async () => { if(user) await seedDemoData(user.uid); }} expiryDays={expiryDays} setExpiryDays={(d) => { setExpiryDays(d); if (user) updateUserExpirySettings(user.uid, d); }} notifPermission={notifPermission} onEnableNotifications={handleEnableNotifications} onOpenPricing={() => setIsPricingOpen(true)} onOpenAdmin={() => { navigate('admin'); setIsSettingsOpen(false); }} />)}
            <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} onExport={handleExport} isPremium={userProfile?.planType === 'PREMIUM'} />
            <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
            <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
            <TermsConditionsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
            {isPricingOpen && userProfile && <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} userProfile={userProfile} />}
            <NotificationPromptModal isOpen={showNotificationPrompt} onClose={() => { setShowNotificationPrompt(false); localStorage.setItem('notificationPrompted', 'true'); }} onEnable={handleEnableNotifications} />
            
            {showAutoStart && (
                <AutoStartPermission onGranted={() => setShowAutoStart(false)} />
            )}

            <DownloadSuccessModal 
                isOpen={!!downloadSuccessData} 
                onClose={() => setDownloadSuccessData(null)} 
                fileData={downloadSuccessData} 
            />
        </>
      )}
    </div>
  );
};

const App = () => (
  <UserProvider>
    <AppContent />
  </UserProvider>
);

export default App;
