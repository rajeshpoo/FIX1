
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Search, ShieldAlert, CheckCircle, Ban, User, Loader2, 
  RefreshCw, Users, Shield, UserX, ChevronRight, X, History, Phone, 
  Mail, AlertTriangle, UserCheck, Megaphone, UserCog, Send, 
  Crown, Gift, Calendar, Zap, Lock, 
  Activity, CheckCircle2, TrendingUp, Filter, Radar, RotateCcw, ShieldCheck,
  ChevronDown, XCircle, MessageCircle, Radio
} from 'lucide-react';
import { UserProfile, SystemBroadcast } from '../types';
import { 
    getAllUsers, toggleUserBan, notify, updateUserRole, 
    giftSubscriptionToUser, revokeSubscription, queueBroadcast, 
    subscribeToBroadcastHistory 
} from '../services/firebaseService';
import { auth } from '../firebaseConfig';
import { PricingModal } from './PricingModal';
import { DeleteModal } from './DeleteModal';
import { hapticFeedback } from '../utils/haptics';

interface Props {
  onBack: () => void;
}

type FilterCategory = 'ALL' | 'ADMINS' | 'SUSPENDED';
type ViewMode = 'ACCOUNTS' | 'BROADCASTS' | 'RADAR';

const SUPREME_EMAIL = 'rajeshpoonia812@gmail.com';

const UserCard: React.FC<{ user: UserProfile; onAction: (type: string, user: UserProfile) => void }> = ({ user, onAction }) => {
    const isBanned = user.isBanned;
    const isAdmin = user.role === 'admin';
    const isPremium = user.planType === 'PREMIUM';
    const isGifted = user.subscription?.isGifted;
    const isSupreme = user.email === SUPREME_EMAIL;

    // Supreme/Owner Card Design (Gold Theme)
    if (isSupreme) {
        return (
            <div className="mb-4 rounded-[2rem] p-6 bg-[#FFFCF3] border border-amber-200/60 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                {/* Decorative Crown Pattern */}
                <div className="absolute -right-6 -top-6 text-amber-500/10 rotate-12 pointer-events-none">
                    <Crown size={120} />
                </div>
                
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 ring-4 ring-amber-100">
                        <Crown size={32} fill="currentColor" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1.5">
                            {user.displayName || 'System Owner'}
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-wider border border-amber-200">
                                <ShieldCheck size={12} /> Supreme Authority
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 font-mono tracking-wide">{user.email}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Standard User Card Design
    return (
        <div className={`mb-4 rounded-[2rem] p-5 border shadow-sm transition-all duration-300 relative overflow-hidden ${isBanned ? 'bg-red-50/50 border-red-100' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
            <div className="flex items-start gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-md shrink-0 ${isBanned ? 'bg-red-500' : isAdmin ? 'bg-indigo-600' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
                    {user.photoURL ? (
                        <img src={user.photoURL} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                        user.displayName?.[0]?.toUpperCase() || 'U'
                    )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                        {user.displayName || 'Unknown User'}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 truncate mb-2">{user.email}</p>
                    
                    <div className="flex flex-wrap gap-1.5">
                        {isAdmin && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-black uppercase tracking-wide border border-indigo-100">Admin</span>}
                        {isPremium && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[9px] font-black uppercase tracking-wide border border-amber-100 flex items-center gap-1"><Crown size={10}/> Premium</span>}
                        {isBanned && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[9px] font-black uppercase tracking-wide border border-red-200">Suspended</span>}
                        {!isBanned && !isAdmin && !isPremium && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-wide">Standard</span>}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-2">
                {/* Suspend/Activate Button */}
                <button 
                    onClick={() => onAction(isBanned ? 'UNBAN' : 'BAN', user)}
                    className={`py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isBanned ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                >
                    {isBanned ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                    {isBanned ? 'ACTIVATE' : 'SUSPEND'}
                </button>

                {/* Role Button */}
                <button 
                    onClick={() => onAction('ROLE', user)}
                    className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors active:scale-95"
                >
                    <UserCog size={18} />
                </button>

                {/* Gift/Revoke Button Logic */}
                {isPremium && !isGifted ? (
                    <div className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 flex items-center justify-center cursor-not-allowed opacity-50" title="Paid Plan Active">
                        <CheckCircle2 size={18} />
                    </div>
                ) : isPremium && isGifted ? (
                    <button 
                        onClick={() => onAction('REVOKE', user)}
                        className="py-3 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95"
                        title="Cancel Gift"
                    >
                        <UserX size={18} />
                    </button>
                ) : (
                    <button 
                        onClick={() => onAction('GIFT', user)}
                        className="py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-amber-50 hover:text-amber-600 transition-colors active:scale-95"
                        title="Gift Premium"
                    >
                        <Gift size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

export const AdminPanel: React.FC<Props> = ({ onBack }) => {
  const currentUser = auth.currentUser;
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('ACCOUNTS');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ALL'); // NEW: Filter State
  const [loading, setLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);
  const [expandedBroadcast, setExpandedBroadcast] = useState<string | null>(null);

  // Modals State
  const [confirmData, setConfirmData] = useState<{ user: UserProfile, type: 'BAN' | 'UNBAN' | 'REVOKE' } | null>(null);
  const [roleTarget, setRoleTarget] = useState<UserProfile | null>(null);
  const [giftTarget, setGiftTarget] = useState<UserProfile | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  
  // Broadcast Form
  const [broadcastMsg, setBroadcastMsg] = useState({ title: '', body: '' });
  const [broadcastTarget, setBroadcastTarget] = useState<'ALL' | 'FREE' | 'PREMIUM'>('ALL');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Stats
  const stats = useMemo(() => ({
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      suspended: users.filter(u => u.isBanned).length
  }), [users]);

  // Load Data
  useEffect(() => {
      loadData();
      const unsub = subscribeToBroadcastHistory(setBroadcasts);
      return () => unsub();
  }, []);

  const loadData = async () => {
      setLoading(true);
      try {
          const { users: allUsers } = await getAllUsers(null);
          setUsers(allUsers);
      } catch (e) {
          console.error(e);
          notify("Error", "Failed to load users", "error");
      } finally {
          setLoading(false);
      }
  };

  // Filtering Logic (Updated to handle cards)
  useEffect(() => {
      let res = users;
      
      // 1. Category Filter
      if (filterCategory === 'ADMINS') {
          res = res.filter(u => u.role === 'admin');
      } else if (filterCategory === 'SUSPENDED') {
          res = res.filter(u => u.isBanned);
      }

      // 2. Search Filter
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          res = res.filter(u => 
              (u.displayName?.toLowerCase() || '').includes(q) || 
              (u.email?.toLowerCase() || '').includes(q) ||
              (u.phoneNumber || '').includes(q)
          );
      }
      setFilteredUsers(res);
  }, [users, searchQuery, filterCategory]);

  // Actions
  const handleUserAction = (type: string, user: UserProfile) => {
      hapticFeedback(20);
      if (user.email === SUPREME_EMAIL) {
          notify("Restricted", "Cannot modify Supreme Admin", "error");
          return;
      }
      if (type === 'BAN') setConfirmData({ user, type: 'BAN' });
      if (type === 'UNBAN') setConfirmData({ user, type: 'UNBAN' });
      if (type === 'REVOKE') setConfirmData({ user, type: 'REVOKE' });
      if (type === 'ROLE') setRoleTarget(user);
      if (type === 'GIFT') setGiftTarget(user);
  };

  const executeConfirmAction = async () => {
      if (!confirmData) return;
      const { user, type } = confirmData;
      hapticFeedback(30);
      
      try {
          if (type === 'BAN') await toggleUserBan(user.uid, true);
          if (type === 'UNBAN') await toggleUserBan(user.uid, false);
          if (type === 'REVOKE') await revokeSubscription(user.uid);
          
          notify("Success", type === 'REVOKE' ? "Plan Revoked" : `User ${type === 'BAN' ? 'Suspended' : 'Activated'}`, "success");
          
          // Force refresh local state immediately for responsiveness
          setUsers(prev => prev.map(u => {
              if (u.uid === user.uid) {
                  if (type === 'BAN') return { ...u, isBanned: true };
                  if (type === 'UNBAN') return { ...u, isBanned: false };
                  if (type === 'REVOKE') return { ...u, planType: 'FREE', subscription: undefined };
              }
              return u;
          }));
      } catch (e) {
          notify("Error", "Action failed", "error");
      } finally {
          setConfirmData(null);
      }
  };

  const executeRoleChange = async (role: 'admin' | 'user') => {
      if (!roleTarget) return;
      hapticFeedback(30);
      try {
          await updateUserRole(roleTarget.uid, role);
          notify("Success", `Role updated to ${role}`, "success");
          setUsers(prev => prev.map(u => u.uid === roleTarget.uid ? { ...u, role } : u));
      } catch (e) {
          notify("Error", "Failed to update role", "error");
      } finally {
          setRoleTarget(null);
      }
  };

  const executeGift = async (planId: any) => {
      if (!giftTarget) return;
      hapticFeedback(30);
      try {
          let days = 30;
          if (planId === 'QUARTERLY_299') days = 90;
          if (planId === 'YEARLY_999') days = 365;
          
          await giftSubscriptionToUser(giftTarget.uid, days);
          notify("Gifted", `Premium added to ${giftTarget.displayName}`, "success");
          
          // Refresh data to reflect
          setUsers(prev => prev.map(u => u.uid === giftTarget.uid ? { 
              ...u, 
              planType: 'PREMIUM', 
              subscription: { 
                  status: 'ACTIVE', 
                  planId, 
                  startDate: Date.now(), 
                  expiryDate: Date.now() + (days * 86400000), 
                  autoRenewal: false, 
                  isGifted: true 
              } 
          } : u));
      } catch (e) {
          notify("Error", "Gift failed", "error");
      } finally {
          setGiftTarget(null);
      }
  };

  const sendBroadcast = async () => {
      if (!broadcastMsg.title || !broadcastMsg.body || !currentUser) {
          notify("Incomplete", "Please enter title and message", "warning");
          return;
      }
      hapticFeedback(30);
      setSendingBroadcast(true);
      try {
          await queueBroadcast(broadcastMsg.title, broadcastMsg.body, broadcastTarget, currentUser.uid);
          notify("Sent", "Broadcast queued successfully", "success");
          setShowBroadcastModal(false);
          setBroadcastMsg({ title: '', body: '' });
      } catch (e) {
          notify("Error", "Broadcast failed", "error");
      } finally {
          setSendingBroadcast(false);
      }
  };

  // WhatsApp Link for Failures
  const openWhatsApp = (phone: string, name: string) => {
      if (!phone) return;
      const text = `Hello ${name}, we tried sending a system alert but it failed to reach you. Please check the FleetDost app for updates.`;
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  // Separation Logic
  const supremeUser = users.find(u => u.email === SUPREME_EMAIL);
  const otherUsers = filteredUsers.filter(u => u.email !== SUPREME_EMAIL);

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar pt-4 pb-40 px-5">
      
      {/* 1. Command Center Header (Sticky) - ADJUSTED TOP POS */}
      <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mx-5 px-5 border-b border-slate-100 dark:border-slate-800/50 shadow-sm mb-5 transition-all">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <button onClick={onBack} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 transition-colors active:scale-90">
                      <ArrowLeft size={20} strokeWidth={2.5} />
                  </button>
                  <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Admin Panel</h2>
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1 flex items-center gap-1">
                          <ShieldCheck size={10} /> Command Center
                      </p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => setShowBroadcastModal(true)} className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl shadow-sm border border-amber-100 active:scale-90 transition-transform">
                      <Megaphone size={20} />
                  </button>
                  <button onClick={loadData} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100 active:scale-90 transition-transform">
                      <RotateCcw size={20} className={loading ? "animate-spin" : ""} />
                  </button>
              </div>
          </div>
      </div>

      {/* 2. Premium Tabs */}
      <div className="px-1 py-4 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button onClick={() => setViewMode('ACCOUNTS')} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'ACCOUNTS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>Accounts</button>
              <button onClick={() => setViewMode('BROADCASTS')} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'BROADCASTS' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>Broadcasts</button>
              <button onClick={() => setViewMode('RADAR')} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'RADAR' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>Radar</button>
          </div>
      </div>

      <div className="pb-20">
          
          {viewMode === 'ACCOUNTS' && (
              <div className="space-y-6 animate-fade-in">
                  {/* Stats Grid (HUD) - PREMIUM ACTIONABLE FILTERS */}
                  <div className="grid grid-cols-3 gap-3">
                      {/* 1. TOTAL USERS CARD */}
                      <div 
                        onClick={() => { setFilterCategory('ALL'); hapticFeedback(10); }}
                        className={`p-5 rounded-[2rem] flex flex-col justify-between h-36 relative overflow-hidden cursor-pointer transition-all duration-300 border active:scale-95 group ${
                            filterCategory === 'ALL' 
                            ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 border-indigo-500/50' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-900/50'
                        }`}
                      >
                          <div className={`p-2.5 w-fit rounded-xl backdrop-blur-md transition-colors ${filterCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'}`}>
                              <Users size={18} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                            <h3 className={`text-3xl font-black leading-none tracking-tighter mb-1 ${filterCategory === 'ALL' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{stats.total}</h3>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${filterCategory === 'ALL' ? 'text-indigo-100' : 'text-slate-400'}`}>All Users</p>
                          </div>
                          {/* Background Decor */}
                          <Users size={80} className={`absolute -right-4 -bottom-4 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 ${filterCategory === 'ALL' ? 'text-white/10' : 'text-indigo-600/5'}`} />
                      </div>

                      {/* 2. ADMINS CARD */}
                      <div 
                        onClick={() => { setFilterCategory('ADMINS'); hapticFeedback(10); }}
                        className={`p-5 rounded-[2rem] flex flex-col justify-between h-36 relative overflow-hidden cursor-pointer transition-all duration-300 border active:scale-95 group ${
                            filterCategory === 'ADMINS' 
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 border-emerald-500/50' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-900/50'
                        }`}
                      >
                          <div className={`p-2.5 w-fit rounded-xl backdrop-blur-md transition-colors ${filterCategory === 'ADMINS' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'}`}>
                              <Shield size={18} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                            <h3 className={`text-3xl font-black leading-none tracking-tighter mb-1 ${filterCategory === 'ADMINS' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{stats.admins}</h3>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${filterCategory === 'ADMINS' ? 'text-emerald-100' : 'text-slate-400'}`}>Admins</p>
                          </div>
                          <Shield size={80} className={`absolute -right-4 -bottom-4 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 ${filterCategory === 'ADMINS' ? 'text-white/10' : 'text-emerald-600/5'}`} />
                      </div>

                      {/* 3. SUSPENDED CARD */}
                      <div 
                        onClick={() => { setFilterCategory('SUSPENDED'); hapticFeedback(10); }}
                        className={`p-5 rounded-[2rem] flex flex-col justify-between h-36 relative overflow-hidden cursor-pointer transition-all duration-300 border active:scale-95 group ${
                            filterCategory === 'SUSPENDED' 
                            ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl shadow-red-500/30 border-red-500/50' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-red-200 dark:hover:border-red-900/50'
                        }`}
                      >
                          <div className={`p-2.5 w-fit rounded-xl backdrop-blur-md transition-colors ${filterCategory === 'SUSPENDED' ? 'bg-white/20 text-white' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                              <UserX size={18} strokeWidth={2.5} />
                          </div>
                          <div className="relative z-10">
                            <h3 className={`text-3xl font-black leading-none tracking-tighter mb-1 ${filterCategory === 'SUSPENDED' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{stats.suspended}</h3>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${filterCategory === 'SUSPENDED' ? 'text-red-100' : 'text-slate-400'}`}>Suspended</p>
                          </div>
                          <UserX size={80} className={`absolute -right-4 -bottom-4 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 ${filterCategory === 'SUSPENDED' ? 'text-white/10' : 'text-red-600/5'}`} />
                      </div>
                  </div>

                  {/* Filter Indicator */}
                  {filterCategory !== 'ALL' && (
                      <div className="flex justify-center -mt-2 animate-fade-in">
                          <button onClick={() => setFilterCategory('ALL')} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                              <Filter size={12} /> Filter Active: {filterCategory} <X size={12} className="ml-1"/>
                          </button>
                      </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                          type="text" 
                          placeholder="Search accounts..." 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900 rounded-[1.5rem] outline-none font-bold text-sm shadow-sm border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white transition-all focus:border-indigo-500/20"
                      />
                  </div>

                  {/* User List */}
                  <div>
                      {/* SUPREME ADMIN - Always Top */}
                      {supremeUser && filterCategory === 'ALL' && (
                          <div className="animate-slide-up" style={{animationDelay: '50ms'}}>
                              <UserCard user={supremeUser} onAction={() => {}} />
                          </div>
                      )}

                      {/* OTHER USERS */}
                      {loading ? (
                          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" /></div>
                      ) : (
                          <div className="space-y-4">
                              {otherUsers.length > 0 ? otherUsers.map(user => (
                                  <UserCard key={user.uid} user={user} onAction={handleUserAction} />
                              )) : (
                                  <div className="text-center py-10 opacity-50">
                                      <p className="text-xs font-bold text-slate-400">No users found</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {viewMode === 'BROADCASTS' && (
              <div className="space-y-4 animate-fade-in">
                  <button 
                      onClick={() => setShowBroadcastModal(true)}
                      className="w-full bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden group active:scale-[0.98] transition-all duration-300"
                  >
                      <div className="absolute top-0 right-0 p-12 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-all"></div>
                      <div className="absolute bottom-0 left-0 p-12 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                      
                      <div className="relative z-10 flex items-center justify-between">
                          <div className="text-left">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg">
                                      <Radio size={14} className="animate-pulse" />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200">System Alert</span>
                              </div>
                              <h3 className="text-2xl font-black tracking-tight leading-none mb-1">Create Broadcast</h3>
                              <p className="text-xs font-medium text-indigo-100/80">Send push notifications to all devices.</p>
                          </div>
                          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Send size={28} className="text-white -ml-1 mt-1" strokeWidth={2.5} />
                          </div>
                      </div>
                  </button>

                  <div className="flex items-center gap-3 pl-2 mt-8 mb-4">
                      <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <History size={12} /> Recent Alerts
                      </span>
                      <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                  </div>
                  
                  <div className="space-y-4">
                      {broadcasts.map(b => (
                          <div 
                              key={b.id} 
                              onClick={() => setExpandedBroadcast(expandedBroadcast === b.id ? null : b.id)}
                              className={`group bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border transition-all duration-300 relative overflow-hidden ${expandedBroadcast === b.id ? 'ring-2 ring-indigo-500/20' : 'hover:shadow-md active:scale-[0.99]'} ${b.status === 'SENT' ? 'border-l-[6px] border-l-emerald-500 border-slate-100 dark:border-slate-800' : 'border-l-[6px] border-l-amber-500 border-slate-100 dark:border-slate-800'}`}
                          >
                              {/* Header */}
                              <div className="flex justify-between items-start mb-3">
                                  <div>
                                      <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">{b.title}</h4>
                                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                          {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                      b.status === 'SENT' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 
                                      b.status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                  }`}>
                                      {b.status}
                                  </span>
                              </div>

                              {/* Body Preview */}
                              <p className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium ${expandedBroadcast === b.id ? '' : 'line-clamp-2'}`}>
                                  {b.body}
                              </p>

                              {/* Stats Footer */}
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                                  <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                                          <Users size={10} /> {b.target} Users
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] font-black uppercase">
                                      {b.sentCount ? (
                                          <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12}/> {b.sentCount}</span>
                                      ) : null}
                                      {b.failCount ? (
                                          <span className="text-red-500 flex items-center gap-1"><XCircle size={12}/> {b.failCount}</span>
                                      ) : null}
                                      <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${expandedBroadcast === b.id ? 'rotate-180' : ''}`} />
                                  </div>
                              </div>

                              {/* Expanded Failure Details */}
                              {expandedBroadcast === b.id && b.failureDetails && b.failureDetails.length > 0 && (
                                  <div className="mt-4 bg-red-50 dark:bg-red-900/10 rounded-xl p-3 border border-red-100 dark:border-red-900/20 animate-slide-up">
                                      <div className="flex justify-between items-center mb-2">
                                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10}/> Delivery Failures</p>
                                          <span className="text-[8px] text-red-400 font-bold">Tap to WhatsApp</span>
                                      </div>
                                      <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar pr-1">
                                          {b.failureDetails.map((fail, idx) => (
                                              <div 
                                                key={idx} 
                                                onClick={(e) => { e.stopPropagation(); openWhatsApp(fail.phone, fail.name); }}
                                                className="bg-white dark:bg-slate-950 p-2 rounded-lg shadow-sm flex justify-between items-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all group/fail"
                                              >
                                                  <div>
                                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{fail.name}</p>
                                                      <p className="text-[9px] font-mono text-red-400">{fail.error}</p>
                                                  </div>
                                                  <MessageCircle size={14} className="text-emerald-500 opacity-50 group-hover/fail:opacity-100 transition-opacity" />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {viewMode === 'RADAR' && (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 animate-fade-in opacity-60">
                  <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                      <Radar size={48} className="text-slate-300 animate-spin-slow duration-[10s]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-200/20 to-transparent"></div>
                  </div>
                  <h3 className="text-lg font-black text-slate-500 uppercase tracking-tight">System Radar</h3>
                  <p className="text-xs font-medium mt-2">Real-time geo-activity map coming soon.</p>
              </div>
          )}

      </div>

      {/* --- MODALS --- */}

      <DeleteModal 
          isOpen={!!confirmData}
          onClose={() => setConfirmData(null)}
          onDelete={executeConfirmAction}
          title={confirmData?.type === 'BAN' ? 'Suspend Account?' : confirmData?.type === 'UNBAN' ? 'Reactivate User?' : 'Revoke Premium Gift?'}
          warningText={confirmData?.type === 'BAN' ? 'User will lose access immediately.' : confirmData?.type === 'REVOKE' ? 'User will revert to Free plan.' : 'User will regain access.'}
      />

      {roleTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-pop-in border border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl font-black text-center mb-8 text-slate-900 dark:text-white uppercase tracking-tight">Assign Role</h3>
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => executeRoleChange('user')} className="p-6 rounded-[1.8rem] border-2 border-slate-100 hover:border-indigo-500 flex flex-col items-center gap-3 bg-slate-50 dark:bg-slate-900 transition-all hover:shadow-lg active:scale-95 group">
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-400 group-hover:text-indigo-500 transition-colors"><User size={24} /></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-indigo-600">Standard</span>
                      </button>
                      <button onClick={() => executeRoleChange('admin')} className="p-6 rounded-[1.8rem] border-2 border-slate-100 hover:border-indigo-500 flex flex-col items-center gap-3 bg-slate-50 dark:bg-slate-900 transition-all hover:shadow-lg active:scale-95 group">
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm text-indigo-600"><Shield size={24} /></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Admin</span>
                      </button>
                  </div>
                  <button onClick={() => setRoleTarget(null)} className="w-full mt-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-colors">Cancel</button>
              </div>
          </div>
      )}

      {giftTarget && (
          <PricingModal 
              isOpen={true} 
              onClose={() => setGiftTarget(null)} 
              userProfile={giftTarget} 
              adminMode={true}
              onGift={executeGift}
          />
      )}

      {showBroadcastModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-pop-in border border-slate-800">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black uppercase tracking-tight text-white">New Alert</h3>
                      <button onClick={() => setShowBroadcastModal(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"><X size={20} className="text-slate-400"/></button>
                  </div>
                  <div className="space-y-5">
                      <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Title</label>
                          <input 
                              value={broadcastMsg.title}
                              onChange={e => setBroadcastMsg({...broadcastMsg, title: e.target.value})}
                              className="w-full p-4 bg-slate-800 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-all placeholder:text-slate-600 text-white"
                              placeholder="System Update"
                          />
                      </div>
                      <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Message</label>
                          <textarea 
                              value={broadcastMsg.body}
                              onChange={e => setBroadcastMsg({...broadcastMsg, body: e.target.value})}
                              className="w-full p-4 bg-slate-800 rounded-2xl font-medium text-sm outline-none h-32 resize-none border-2 border-transparent focus:border-indigo-500 transition-all placeholder:text-slate-600 text-white"
                              placeholder="Type your message here..."
                          />
                      </div>
                      <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Audience</p>
                          <div className="flex bg-slate-800 p-1.5 rounded-2xl">
                              {['ALL', 'FREE', 'PREMIUM'].map(t => (
                                  <button key={t} onClick={() => setBroadcastTarget(t as any)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${broadcastTarget === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                              ))}
                          </div>
                      </div>
                      <button 
                          onClick={sendBroadcast} 
                          disabled={sendingBroadcast}
                          className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-slate-200"
                      >
                          {sendingBroadcast ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Send Broadcast
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
