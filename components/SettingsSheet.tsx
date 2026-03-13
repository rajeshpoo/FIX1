
import React, { useState, useEffect } from 'react';
import { FirebaseUser, Vehicle, Trip, LedgerAccount, Bilty } from '../types';
import { 
  X, Moon, Bell, ChevronRight, Shield as ShieldIcon, 
  RefreshCw, Trash2, FileText,
  ShieldCheck,
  Zap, Building2, User as UserIcon, BellRing, Phone,
  Crown, Star, Book, Truck, Receipt,
  LucideIcon,
  Code2,
  Database,
  Cloud,
  LogOut,
  Info,
  Shield,
  Plus,
  Minus,
  Copy,
  Send,
  Loader2,
  Link,
  Smartphone,
  CheckCircle2,
  MessageCircle,
  HelpCircle,
  Lock,
  Activity,
  Battery,
  Flame,
  DownloadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { SupportModal } from './SupportModal';
import { SecurityLock } from './SecurityLock';
import { ExportHubModal } from './ExportHubModal';
import { CloudBackupModal } from './CloudBackupModal';
import { UserProfile } from '../types';
import { notify, cancelSubscription, sendTestPushNotification, linkUserWithGoogle, setupRecaptcha, linkUserWithPhone, confirmPhoneLink, destroyRecaptcha, fetchVehicles, fetchTrips, fetchLedgers, fetchBilties } from '../services/firebaseService';
import { DeleteModal } from './DeleteModal';
import { hapticFeedback } from '../utils/haptics';

interface SettingItemProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon: Icon, title, subtitle, onClick, rightElement, danger }) => (
  <div 
    onClick={onClick ? () => { hapticFeedback(5); onClick(); } : undefined}
    className="flex items-center justify-between py-3 px-4 rounded-2xl mb-1 bg-white dark:bg-slate-900 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 cursor-pointer transition-all active:scale-[0.98] group"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl ${danger ? 'bg-red-50 text-red-500 dark:bg-red-950/30' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'} group-hover:scale-105 transition-transform`}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div className="text-left">
        <p className={`text-[13px] font-black tracking-tight ${danger ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>{title}</p>
        {subtitle && <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {rightElement ? rightElement : <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />}
  </div>
);

interface ResetGridCardProps {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
}

const ResetGridCard: React.FC<ResetGridCardProps> = ({ icon: Icon, title, onClick }) => (
    <div 
        onClick={onClick}
        className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-sm active:scale-0.95 transition-all hover:shadow-md group cursor-pointer aspect-square"
    >
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-xl group-hover:scale-110 transition-transform mb-2">
            <Icon size={20} strokeWidth={2.5} />
        </div>
        <h4 className="text-[9px] font-black text-slate-900 dark:text-white tracking-tight uppercase text-center leading-tight">{title}</h4>
    </div>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
  userProfile: UserProfile | null;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => Promise<void> | void;
  onAbout: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
  onUpdateProfile: (name: string, photo: string) => Promise<void>;
  onSync: () => Promise<void>;
  onResetVehicles: () => Promise<void>;
  onResetLedger: () => Promise<void>;
  onResetTrips: () => Promise<void>;
  onResetBilties: () => Promise<void>;
  onFactoryReset: () => Promise<void>;
  onSeedDemo: () => Promise<void>;
  expiryDays: number;
  setExpiryDays: (days: number) => void;
  notifPermission: string;
  onEnableNotifications: () => void;
  onOpenPricing: () => void;
  onOpenAdmin: () => void;
}

export const SettingsSheet: React.FC<Props> = ({ 
  isOpen, onClose, user, userProfile, darkMode, toggleDarkMode, onLogout, 
  onAbout, onPrivacy, onTerms, onUpdateProfile, onSync, onResetVehicles, onResetLedger, onResetTrips, onResetBilties, onFactoryReset, 
  onSeedDemo, expiryDays, setExpiryDays, onEnableNotifications,
  onOpenPricing, onOpenAdmin
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isExportHubOpen, setIsExportHubOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [confirmResetType, setConfirmResetType] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [notifPermission, setNotifPermission] = useState('default');
  const [isTestingSignal, setIsTestingSignal] = useState(false);
  
  // Data for export
  const [exportData, setExportData] = useState<{vehicles: Vehicle[], trips: Trip[], ledgers: LedgerAccount[], bilties: Bilty[]} | null>(null);

  // Linking State
  const [linking, setLinking] = useState(false);
  const [phoneForLink, setPhoneForLink] = useState('');
  const [otpForLink, setOtpForLink] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [showLinkPhoneModal, setShowLinkPhoneModal] = useState(false);
  
  // App Lock State
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [hasPin, setHasPin] = useState(!!localStorage.getItem('fleetdost_pin'));
  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);

  // IMMORTAL MODE STATE
  const [isImmortal, setIsImmortal] = useState(false);
  const wakeLockRef = React.useRef<any>(null);

  // Local state for slider to prevent jitter
  const [localExpiryDays, setLocalExpiryDays] = useState(expiryDays);

  useEffect(() => {
    if (isOpen) {
      if ('Notification' in window) setNotifPermission(Notification.permission);
      setHasPin(!!localStorage.getItem('fleetdost_pin'));
      // Check Immortal State from internal tracking
      setIsImmortal(!!(window as any)._immortalActive);
    }
  }, [isOpen]);

  useEffect(() => {
      setLocalExpiryDays(expiryDays);
  }, [expiryDays]);
  
  if (!isOpen) return null;

  // --- IMMORTAL MODE LOGIC ---
  const toggleImmortalMode = async () => {
      if (isImmortal) {
          // Turn OFF
          if (wakeLockRef.current) {
              await wakeLockRef.current.release();
              wakeLockRef.current = null;
          }
          const video = document.getElementById('keep-alive-video') as HTMLVideoElement;
          if (video) video.pause();
          
          (window as any)._immortalActive = false;
          setIsImmortal(false);
          notify("Normal Mode", "Battery saving enabled.", "info");
      } else {
          // Turn ON
          try {
              // 1. Play Silent Video (Media Masquerade)
              const video = document.getElementById('keep-alive-video') as HTMLVideoElement;
              if (video) {
                  video.play().catch(e => console.log("Video autoplay blocked", e));
              }

              // 2. Request CPU Wake Lock
              if ('wakeLock' in navigator) {
                  // @ts-ignore
                  wakeLockRef.current = await navigator.wakeLock.request('screen');
              }

              (window as any)._immortalActive = true;
              setIsImmortal(true);
              notify("Immortal Active", "App will run in background. High battery usage.", "success");
          } catch (e) {
              console.error(e);
              notify("Error", "Could not enable High Performance Mode", "error");
          }
      }
  };

  const handleLinkGoogle = async () => {
      setLinking(true);
      try {
          await linkUserWithGoogle(user);
          notify("Linked", "Google Account connected successfully", "success");
      } catch (e: any) {
          notify("Failed", e.message || "Could not link Google account", "error");
      } finally {
          setLinking(false);
      }
  };

  const handleStartPhoneLink = async () => {
      if (!phoneForLink || phoneForLink.length < 10) {
          notify("Invalid", "Enter valid 10-digit number", "warning");
          return;
      }
      setLinking(true);
      try {
          const verifier = setupRecaptcha('link-recaptcha');
          const formatted = `+91${phoneForLink.replace(/\D/g, '')}`;
          const vid = await linkUserWithPhone(user, formatted, verifier);
          setVerificationId(vid);
          notify("OTP Sent", `Code sent to ${formatted}`, "success");
      } catch (e: any) {
          notify("Error", e.message || "Failed to send OTP", "error");
          destroyRecaptcha();
      } finally {
          setLinking(false);
      }
  };

  const handleVerifyLinkOtp = async () => {
      if (!verificationId || !otpForLink) return;
      setLinking(true);
      try {
          await confirmPhoneLink(user, verificationId, otpForLink);
          notify("Success", "Phone number linked successfully", "success");
          setShowLinkPhoneModal(false);
          setPhoneForLink('');
          setOtpForLink('');
          setVerificationId(null);
      } catch (e: any) {
          notify("Error", "Invalid OTP or Link Failed", "error");
      } finally {
          setLinking(false);
      }
  };

  const handleTestSignal = async () => {
    if (!userProfile?.fcmToken) {
        notify("No Token", "Please enable notifications first.", "warning");
        return;
    }
    setIsTestingSignal(true);
    try {
        await sendTestPushNotification(userProfile.fcmToken);
        notify("Signal Sent", "Cloud notification is on its way!", "success");
    } catch (error: any) {
        console.warn("Cloud function test failed:", error);
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.ready;
                    await reg.showNotification('FleetDost Test (Local)', {
                        body: 'Cloud unreachable, but your device is ready for alerts.',
                        icon: 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png',
                        vibrate: [200, 100, 200],
                        tag: 'test-local'
                    } as any);
                } else {
                    new Notification('FleetDost Test (Local)', {
                        body: 'Cloud unreachable, but your device is ready.',
                        icon: 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png'
                    });
                }
                notify("Local Signal", "Cloud offline. Sent local check.", "info");
            } catch (localErr) {
                notify("Test Failed", error.message || "Could not trigger alert", "error");
            }
        } else {
            notify("Test Failed", error.message || "Internal error", "error");
        }
    } finally {
        setIsTestingSignal(false);
    }
  };

  const handleCancelSub = async () => {
      setIsCancelConfirmOpen(false); 
      setIsCancelling(true);
      try {
          await cancelSubscription(user);
          notify("Cancellation Scheduled", "Your plan will not auto-renew.", "info");
      } catch (e: any) {
          console.error(e);
          notify("Error", e.message || "Could not process cancellation.", "error");
      } finally {
          setIsCancelling(false);
      }
  };

  const handleExecuteReset = () => {
      switch(confirmResetType) {
          case 'ALL DATA': onFactoryReset(); break;
          case 'VEHICLES': onResetVehicles(); break;
          case 'LEDGER': onResetLedger(); break;
          case 'TRIPS': onResetTrips(); break;
          case 'BILTIES': onResetBilties(); break;
      }
      setConfirmResetType(null);
      setIsResetModalOpen(false);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalExpiryDays(parseInt(e.target.value));
  };

  const handleSliderCommit = () => {
      setExpiryDays(localExpiryDays);
  };

  const handleIncrement = () => {
    const newValue = Math.min(localExpiryDays + 1, 60);
    setLocalExpiryDays(newValue);
    setExpiryDays(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(localExpiryDays - 1, 1);
    setLocalExpiryDays(newValue);
    setExpiryDays(newValue);
  };

  const handlePinToggle = () => {
      if (hasPin) {
          setIsUnlockConfirmOpen(true);
      } else {
          setShowPinSetup(true);
      }
  };

  const handleRemoveLock = () => {
      localStorage.removeItem('fleetdost_pin');
      setHasPin(false);
      setIsUnlockConfirmOpen(false);
      notify("Unlocked", "App lock removed", "info");
  };

  const openExportHub = async () => {
      if (!isPremium) {
          onOpenPricing();
          return;
      }
      // Load data if not already loaded
      if (!exportData) {
          notify("Loading Data", "Preparing export data...", "info");
          const [v, t, l, b] = await Promise.all([
              fetchVehicles(user.uid),
              fetchTrips(user.uid),
              fetchLedgers(user.uid),
              fetchBilties(user.uid)
          ]);
          setExportData({ vehicles: v, trips: t, ledgers: l, bilties: b });
      }
      setIsExportHubOpen(true);
  };

  const openBackupModal = () => {
      if (!isPremium) {
          onOpenPricing();
          return;
      }
      setIsBackupModalOpen(true);
  };

  const isPremium = !!userProfile && 
    userProfile.planType === 'PREMIUM' && 
    (userProfile.subscription?.expiryDate ? Date.now() < userProfile.subscription.expiryDate : true);

  const isSubCancelled = userProfile?.subscription?.status === 'CANCELLED';

  const expiryDate = userProfile?.subscription?.expiryDate 
    ? new Date(userProfile.subscription.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
    : 'N/A';

  const isAdmin = userProfile?.role === 'admin' || user.email === 'rajeshpoonia812@gmail.com';

  const handleEnableNotifications = async () => {
    await onEnableNotifications();
    setTimeout(() => {
        setNotifPermission(Notification.permission);
    }, 1000);
  };

  const hasGoogle = user.providerData.some(p => p.providerId === 'google.com');
  const hasPhone = user.providerData.some(p => p.providerId === 'phone');

  // Format last heartbeat date with proper fallback
  const lastHeartbeat = userProfile?.lastHeartbeat 
    ? new Date(userProfile.lastHeartbeat).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'Pending Next Cycle';

  return (
    <div className="fixed inset-0 z-[100] flex justify-end font-sans">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
      <div className="relative w-full max-sm:sm max-w-sm bg-slate-50 dark:bg-slate-950 h-full shadow-2xl overflow-y-auto animate-slide-up no-scrollbar border-l border-white/10">
        
        {/* HEADER SECTION */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-6 pb-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] flex items-center gap-4 border-b border-slate-100 dark:border-white/5 shadow-sm">
           <button onClick={onClose} className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 active:scale-90 transition-transform">
              <X size={20} strokeWidth={2.5}/>
           </button>
           <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Settings Hub
           </h2>
        </div>

        <div className="p-5 space-y-8 pb-40">
          
          {/* 1. TOP PROFILE SECTION */}
          <div className="flex flex-col items-center pt-2">
              {/* ... (Existing Profile UI) ... */}
              <div className="relative mb-3">
                  <div className="w-24 h-24 rounded-full border-[4px] border-indigo-500/10 p-1 bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center overflow-hidden">
                      {userProfile?.photoURL ? (
                          <img src={userProfile.photoURL} className="w-full h-full object-cover rounded-full" alt="User" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white font-black text-2xl rounded-full">
                              {userProfile?.displayName?.charAt(0) || 'H'}
                          </div>
                      )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-indigo-600 rounded-full border-[2px] border-white dark:border-slate-900 flex items-center justify-center text-white shadow-xl rotate-3">
                      <ShieldCheck size={12} fill="currentColor" />
                  </div>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1 tracking-tight">{userProfile?.displayName || 'Fleet Owner'}</h3>
              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.25em] mb-3">{user.email}</p>
              <button onClick={() => setIsProfileModalOpen(true)} className="px-5 py-1.5 rounded-full bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-[0.1em] border border-slate-200 dark:border-indigo-800/40 shadow-sm active:scale-95 transition-all">Edit Details</button>
          </div>

          {/* 2. PREMIUM SUBSCRIPTION CARD */}
          <div className="px-1">
            {/* ... (Existing Premium Card Logic) ... */}
            {isPremium ? (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[1.8rem] p-5 text-white shadow-lg relative overflow-hidden border border-indigo-500/30 group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                    <Crown size={60} className="text-amber-400" />
                  </div>
                  
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4 text-left">
                          <div className="p-2 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-lg">
                            <Crown size={16} className="text-slate-900" fill="currentColor" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black tracking-tight leading-none text-amber-100 uppercase">VIP ELITE</h4>
                            <p className="text-[7px] font-black text-amber-500/80 uppercase tracking-widest mt-0.5">Premium Active</p>
                          </div>
                      </div>

                      <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 mb-4 border border-white/10 flex justify-between items-center">
                          <div>
                              <p className="text-[6px] font-black text-indigo-300 uppercase tracking-widest">Valid Until</p>
                              <p className="text-[11px] font-black">{expiryDate}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-[6px] font-black text-indigo-300 uppercase tracking-widest">Status</p>
                              <p className={`text-[11px] font-black ${isSubCancelled ? 'text-amber-400' : 'text-emerald-400'}`}>{isSubCancelled ? 'Will not Renew' : 'Auto-Renew'}</p>
                          </div>
                      </div>

                      {!isSubCancelled && (
                          <button onClick={() => setIsCancelConfirmOpen(true)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                              Cancel Plan
                          </button>
                      )}
                      {isSubCancelled && (
                          <div className="mt-3 text-center bg-white/5 border border-white/10 rounded-xl p-3">
                              <p className="text-[9px] font-bold text-slate-300">Your plan will not renew. Premium benefits will continue until {expiryDate}.</p>
                          </div>
                      )}
                  </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[1.8rem] p-6 text-white shadow-xl relative overflow-hidden text-center">
                  <div className="mb-4 flex justify-center">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                          <Crown size={24} className="text-amber-400" fill="currentColor" />
                      </div>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight mb-2">Upgrade to Pro</h3>
                  <p className="text-[10px] text-slate-300 font-medium mb-5 px-4 leading-relaxed">Unlock unlimited vehicles, trips, Excel exports and priority support.</p>
                  <button onClick={onOpenPricing} className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
                      View Plans
                  </button>
              </div>
            )}
          </div>
          
          {/* ... (Account Linking Section) ... */}
          {(!hasGoogle || !hasPhone) && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Secure Account</p>
                <div className="bg-white dark:bg-slate-900/50 rounded-[1.8rem] p-2 border border-slate-100 dark:border-white/5 space-y-1">
                    {!hasGoogle && (
                        <SettingItem 
                            icon={Link} 
                            title="Link Google Account" 
                            subtitle="Secure Login" 
                            onClick={handleLinkGoogle} 
                            rightElement={linking ? <Loader2 size={14} className="animate-spin text-indigo-500"/> : <Plus size={14} className="text-emerald-500"/>}
                        />
                    )}
                    {!hasPhone && (
                        <SettingItem 
                            icon={Smartphone} 
                            title="Link Phone Number" 
                            subtitle="Enable Mobile Login" 
                            onClick={() => setShowLinkPhoneModal(true)} 
                            rightElement={linking ? <Loader2 size={14} className="animate-spin text-indigo-500"/> : <Plus size={14} className="text-emerald-500"/>}
                        />
                    )}
                </div>
              </div>
          )}

          {/* ... (Connectivity Section) ... */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Connectivity</p>
            <div className="bg-white dark:bg-slate-900/50 rounded-[1.8rem] p-4 border border-slate-100 dark:border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${userProfile?.fcmToken ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <BellRing size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Token Status</p>
                    <p className={`text-[9px] font-black uppercase ${userProfile?.fcmToken ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {userProfile?.fcmToken ? 'Connected' : 'Not Connected'}
                    </p>
                  </div>
                </div>
                {userProfile?.fcmToken && (
                  <button onClick={() => { navigator.clipboard.writeText(userProfile.fcmToken!); notify("Copied", "Token copied to clipboard", "info"); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 active:scale-90 transition-transform">
                    <Copy size={14} />
                  </button>
                )}
              </div>

              {/* PULSE MONITOR INDICATOR (New) */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                      <Activity size={14} className="text-indigo-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Hourly Pulse</span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{lastHeartbeat}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={handleEnableNotifications} className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <RefreshCw size={14} /> Re-Sync
                </button>
                <button onClick={handleTestSignal} disabled={!userProfile?.fcmToken || isTestingSignal} className="py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
                  {isTestingSignal ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Test Signal
                </button>
              </div>
            </div>
          </div>

          {/* ... (Admin Console Section) ... */}
          {isAdmin && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Administration</p>
                <div 
                  onClick={onOpenAdmin} 
                  className="bg-gradient-to-br from-indigo-700 via-slate-900 to-slate-900 rounded-[1.8rem] p-5 border border-indigo-500/30 flex items-center justify-center cursor-pointer hover:brightness-110 transition-all shadow-2xl shadow-indigo-500/10"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 backdrop-blur-sm text-white rounded-2xl shadow-lg border border-white/10">
                            <ShieldCheck size={20}/>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Admin Console</p>
                            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Control Panel</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-indigo-300 ml-auto"/>
                </div>
              </div>
          )}

          {/* 4. APP CONTROLS */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">App Controls</p>
            <div className="bg-white dark:bg-slate-900/50 rounded-[1.8rem] p-2 border border-slate-100 dark:border-white/5 space-y-1">
                
                {/* Expiry Slider */}
                <div className="p-3 border-b border-slate-100 dark:border-white/5 pb-4">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl"><BellRing size={18}/></div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Alert Window</span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                           <button onClick={handleDecrement} className="px-2.5 py-2 text-slate-500 active:scale-90 transition-transform"><Minus size={14} /></button>
                           <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 w-12 text-center">{localExpiryDays} Days</span>
                           <button onClick={handleIncrement} className="px-2.5 py-2 text-slate-500 active:scale-90 transition-transform"><Plus size={14} /></button>
                        </div>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="60" 
                        value={localExpiryDays} 
                        onChange={handleSliderChange} 
                        onMouseUp={handleSliderCommit}
                        onTouchEnd={handleSliderCommit}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600" 
                    />
                </div>

                {/* Dark Mode */}
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl"><Moon size={18}/></div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dark Mode</span>
                    </div>
                    <button onClick={() => { toggleDarkMode(); hapticFeedback(10); }} className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${darkMode ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

                {/* Notifications */}
                <SettingItem 
                    icon={Bell} 
                    title="Notifications" 
                    subtitle={notifPermission === 'granted' ? 'Active' : notifPermission === 'denied' ? 'Blocked' : 'Enable Now'}
                    onClick={handleEnableNotifications} 
                    rightElement={
                        notifPermission === 'granted' ? <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div> : 
                        notifPermission === 'denied' ? <div className="w-2 h-2 bg-red-500 rounded-full"></div> : 
                        <ChevronRight size={14} />
                    } 
                />
            </div>
          </div>

          {/* 7. APP SECURITY (Updated with App Lock & Immortal Mode) */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">App Security</p>
            <div className="bg-white dark:bg-slate-900/50 rounded-[1.8rem] p-2 border border-slate-100 dark:border-white/5 space-y-1">
                {/* IMMORTAL MODE TOGGLE */}
                <SettingItem 
                    icon={Flame} 
                    title="Immortal Mode" 
                    subtitle={isImmortal ? "Bypassing Battery Saver" : "Prevent Background Kill"} 
                    onClick={toggleImmortalMode}
                    rightElement={isImmortal ? <div className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase">ACTIVE</div> : <div className="w-12 h-6 bg-slate-300 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div></div>}
                />

                <SettingItem 
                    icon={Lock} 
                    title="App Lock" 
                    subtitle={hasPin ? "PIN Enabled" : "Secure with PIN"} 
                    onClick={handlePinToggle}
                    rightElement={hasPin ? <div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-black uppercase">ON</div> : <ChevronRight size={14} />}
                />
                
                {/* MOVED EXPORT HUB HERE */}
                <SettingItem 
                    icon={FileSpreadsheet} 
                    title="Export Master Hub" 
                    subtitle="Advanced Data Controls" 
                    onClick={openExportHub} 
                    rightElement={!isPremium ? <Lock size={12} className="text-amber-500" /> : undefined}
                />

                <div onClick={() => setIsResetModalOpen(true)} className="flex items-center justify-between p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-all group border border-red-100 dark:border-red-900/10 mt-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl"><Trash2 size={18}/></div>
                        <div>
                            <p className="text-xs font-bold text-red-600 dark:text-red-400">Wipe Master Hub</p>
                            <p className="text-[8px] font-black text-red-400/70 uppercase tracking-widest">Reset Data Zones</p>
                        </div>
                    </div>
                    <ChevronRight size={14} className="text-red-400"/>
                </div>
            </div>
          </div>

          {/* 5. SUPPORT & LEGAL (Moved Down) */}
          <div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Support & Legal</p>
             <div className="bg-white dark:bg-slate-900/50 rounded-[1.8rem] p-2 border border-slate-100 dark:border-white/5 space-y-1">
                <SettingItem icon={HelpCircle} title="Help & Support" subtitle="Report Issues" onClick={() => setIsSupportModalOpen(true)} />
                <SettingItem icon={Info} title="About FleetDost" subtitle="Version 1.4.2" onClick={onAbout} />
                <SettingItem icon={Shield} title="Privacy Policy" subtitle="Data Protection" onClick={onPrivacy} />
                <SettingItem icon={FileText} title="Terms & Conditions" subtitle="Usage Rules" onClick={onTerms} />
             </div>
          </div>

          {/* 6. BUSINESS & TOOLS */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Business Tools</p>
            <div className="bg-white dark:bg-slate-900/50 rounded-[1.8rem] p-2 border border-slate-100 dark:border-white/5 space-y-1">
                <SettingItem icon={RefreshCw} title="Cloud Sync" subtitle="Force Backup" onClick={onSync} />
                
                {/* NEW CLOUD BACKUP */}
                <SettingItem 
                    icon={DownloadCloud} 
                    title="Google Drive Backup" 
                    subtitle="Personal Cloud Vault" 
                    onClick={openBackupModal}
                    rightElement={!isPremium ? <Lock size={12} className="text-amber-500" /> : undefined}
                />
                
                {/* Developer Card (Keep Existing) */}
                <div 
                    onClick={() => window.open('https://wa.me/917852005541?text=Hi%20Rajesh%2C%20I%20am%20using%20FleetDost%20App%20and%20wanted%20to%20connect%20regarding...', '_blank')}
                    className="flex items-center justify-between py-3 px-4 rounded-2xl mb-1 bg-slate-900 text-white border border-slate-800 cursor-pointer transition-all active:scale-[0.98] group shadow-xl shadow-indigo-900/10 relative overflow-hidden"
                >
                    {/* ... (Keep Inner Content) ... */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2 rounded-xl bg-white/10 text-white ring-1 ring-white/20 shadow-inner group-hover:scale-110 transition-transform"><Code2 size={18} strokeWidth={2.5} /></div>
                        <div className="text-left">
                            <p className="text-[13px] font-black tracking-tight text-white group-hover:text-indigo-200 transition-colors">Developed by</p>
                            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">Rajesh Poonia</p>
                        </div>
                    </div>
                    <div className="relative z-10"><div className="p-2 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-600/40 group-hover:bg-indigo-500 transition-colors"><MessageCircle size={14} fill="currentColor" className="opacity-90" /></div></div>
                </div>
                <SettingItem icon={Database} title="Demo Fleet Seed" subtitle="Load Sample Data" onClick={onSeedDemo} />
            </div>
          </div>

          {/* 8. FOOTER */}
          <button onClick={onLogout} className="w-full py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center gap-2">
            <LogOut size={14} />
            Sign Out
          </button>
          
          <div className="text-center pb-6 mt-4">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">FleetDost v1.4.2</p>
          </div>
        </div>
      </div>

      {/* Security Lock Setup Modal */}
      <SecurityLock 
          isOpen={showPinSetup} 
          isSetupMode={true}
          onSuccess={() => { setShowPinSetup(false); setHasPin(true); }}
          onCancel={() => setShowPinSetup(false)}
      />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        user={user} 
        initialPhoto={userProfile?.photoURL || user.photoURL || undefined}
        onUpdate={async (name, photo) => {
            await onUpdateProfile(name, photo);
            setIsProfileModalOpen(false);
        }}
      />

      {/* Support Ticket Modal */}
      <SupportModal 
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        user={user}
      />

      {/* EXPORT HUB MODAL */}
      <ExportHubModal 
        isOpen={isExportHubOpen} 
        onClose={() => setIsExportHubOpen(false)}
        vehicles={exportData?.vehicles || []}
        trips={exportData?.trips || []}
        ledgers={exportData?.ledgers || []}
        bilties={exportData?.bilties || []}
        user={user}
        userProfile={userProfile}
      />

      {/* CLOUD BACKUP MODAL */}
      <CloudBackupModal 
        isOpen={isBackupModalOpen} 
        onClose={() => setIsBackupModalOpen(false)} 
        uid={user.uid}
      />

      {/* PHONE LINKING MODAL */}
      {showLinkPhoneModal && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => { setShowLinkPhoneModal(false); destroyRecaptcha(); }} />
              <div className="relative w-full max-sm:w-full max-w-sm bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 shadow-2xl animate-pop-in">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Link Mobile Number</h3>
                      <button onClick={() => { setShowLinkPhoneModal(false); destroyRecaptcha(); }}><X size={20} className="text-slate-400"/></button>
                  </div>
                  
                  {!verificationId ? (
                      <div className="space-y-4">
                          <input 
                              type="tel" 
                              placeholder="7852005541" 
                              value={phoneForLink} 
                              onChange={e => setPhoneForLink(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-center tracking-widest text-lg"
                          />
                          <div id="link-recaptcha" className="flex justify-center"></div>
                          <button onClick={handleStartPhoneLink} disabled={linking} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                              {linking ? <Loader2 className="animate-spin" /> : <Send size={16} />} Send OTP
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <input 
                              type="number" 
                              placeholder="OTP" 
                              value={otpForLink} 
                              onChange={e => setOtpForLink(e.target.value.slice(0, 6))} 
                              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-center tracking-[0.5em] text-xl"
                          />
                          <button onClick={handleVerifyLinkOtp} disabled={linking} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                              {linking ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={16} />} Verify & Link
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Reset Options Modal */}
      {isResetModalOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 animate-fade-in">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsResetModalOpen(false)} />
              <div className="relative w-full max-sm:w-full max-w-sm bg-white dark:bg-slate-950 rounded-[2.5rem] p-6 shadow-2xl animate-pop-in">
                  <div className="flex justify-between items-center mb-6 px-2">
                      <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Wipe Master Hub</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Zone to Clear</p>
                      </div>
                      <button onClick={() => setIsResetModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={16}/></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <ResetGridCard icon={Truck} title="Vehicles Wipe" onClick={() => { setConfirmResetType('VEHICLES'); }} />
                      <ResetGridCard icon={Book} title="Ledger Wipe" onClick={() => { setConfirmResetType('LEDGER'); }} />
                      <ResetGridCard icon={Truck} title="Trips Wipe" onClick={() => { setConfirmResetType('TRIPS'); }} />
                      <ResetGridCard icon={Receipt} title="Bilties Wipe" onClick={() => { setConfirmResetType('BILTIES'); }} />
                  </div>

                  <button 
                    onClick={() => setConfirmResetType('ALL DATA')}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                      <Trash2 size={16} /> Factory Reset (All Data)
                  </button>
              </div>
          </div>
      )}

      {/* Confirmation for Reset */}
      <DeleteModal 
        isOpen={!!confirmResetType}
        onClose={() => setConfirmResetType(null)}
        title={`Reset ${confirmResetType}?`}
        warningText="This action will permanently delete the selected data from the cloud."
        onDelete={handleExecuteReset}
      />

      {/* Confirmation for Unlock (Remove PIN) */}
      <DeleteModal 
        isOpen={isUnlockConfirmOpen}
        onClose={() => setIsUnlockConfirmOpen(false)}
        title="Remove App Lock?"
        warningText="Anyone with access to your phone can open the app."
        onDelete={handleRemoveLock}
      />

      {/* Cancel Subscription Confirmation */}
      <DeleteModal 
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title="Cancel Premium?"
        warningText="You will lose access to premium features after your current billing period ends."
        onDelete={handleCancelSub}
      />
    </div>
  );
};
