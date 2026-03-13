
import React, { useMemo } from 'react';
import { AppNotification, Vehicle } from '../types';
import { ArrowLeft, Bell, AlertTriangle, Megaphone, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getDaysRemaining, getStatusColor } from '../utils/helpers';

const timeAgo = (timestamp: number) => {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

export const NotificationCenter: React.FC<{ 
    notifications: AppNotification[], 
    vehicles: Vehicle[], // Receive full vehicle list
    expiryDays: number,  // Window for alerts
    onBack: () => void 
}> = ({ notifications, vehicles = [], expiryDays, onBack }) => {
  
  // 1. Calculate Real-time Alerts from Vehicles (Hybrid List)
  const localAlerts = useMemo(() => {
      const alerts: AppNotification[] = [];
      vehicles.forEach(v => {
          if (!v.documents) return;
          Object.entries(v.documents).forEach(([key, doc]: [string, any]) => {
              if (doc && doc.expiryDate) {
                  const status = getStatusColor(doc.expiryDate, expiryDays);
                  if (status === 'red' || status === 'yellow') {
                      alerts.push({
                          id: `local-${v.id}-${key}`,
                          title: status === 'red' ? 'EXPIRED' : 'EXPIRING SOON',
                          body: `${v.number}: ${doc.name} ${status === 'red' ? 'has expired' : 'expires'} on ${doc.expiryDate}`,
                          type: 'ALERT',
                          timestamp: Date.now(), // Always fresh
                          isRead: false,
                          link: '/#home'
                      });
                  }
              }
          });
      });
      // Sort: Expired first
      return alerts.sort((a,b) => a.title === 'EXPIRED' ? -1 : 1);
  }, [vehicles, expiryDays]);

  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
  // Cloud Notifications (Filtered for recent history)
  const cloudNotifications = notifications.filter(n => n.timestamp >= twoDaysAgo);

  const hasContent = localAlerts.length > 0 || cloudNotifications.length > 0;

  return (
    <div className="h-full w-full overflow-y-auto pt-4 pb-40 px-5 max-w-md mx-auto animate-fade-in no-scrollbar">
      <div className="flex items-center gap-3.5 cursor-pointer mb-8" onClick={onBack}>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm active:scale-90 transition-all">
              <ArrowLeft size={20} strokeWidth={3} className="text-slate-600 dark:text-slate-300"/>
          </div>
          <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Notifications</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time & History</p>
          </div>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center text-center py-24 opacity-50">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <CheckCircle2 size={40} className="text-slate-300 dark:text-slate-700" />
          </div>
          <h3 className="text-lg font-black text-slate-500 dark:text-slate-400">All Caught Up</h3>
          <p className="text-xs font-medium text-slate-400 mt-1">You have no pending alerts.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Section 1: Active Local Alerts (Priority) */}
          {localAlerts.length > 0 && (
              <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Action Required (Live)</h4>
                  {localAlerts.map(n => (
                    <div key={n.id} className="p-5 rounded-[1.8rem] border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 shadow-sm flex items-start gap-4">
                        <div className="p-3 rounded-2xl shrink-0 mt-1 bg-white dark:bg-red-900/20 text-red-500 shadow-sm">
                            <ShieldAlert size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight pr-2">{n.title}</h4>
                                <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 mt-1 animate-pulse"></div>
                            </div>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1 leading-snug">{n.body}</p>
                            <p className="text-[9px] font-bold text-red-400 mt-2 uppercase">Critical • Fix Now</p>
                        </div>
                    </div>
                  ))}
              </div>
          )}

          {/* Section 2: Cloud History */}
          {cloudNotifications.length > 0 && (
              <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Today's Messages</h4>
                  {cloudNotifications.map(n => (
                    <div key={n.id} className={`p-5 rounded-[1.8rem] border flex items-start gap-4 transition-all ${!n.isRead ? 'bg-white dark:bg-slate-900 shadow-md border-slate-200 dark:border-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/30 border-transparent'}`}>
                    <div className={`p-3 rounded-2xl shrink-0 mt-1 ${
                        n.type === 'ALERT' 
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' 
                        : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'
                    }`}>
                        {n.type === 'ALERT' ? <AlertTriangle size={20} /> : <Megaphone size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight pr-2">{n.title}</h4>
                            {!n.isRead && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-snug">{n.body}</p>
                        <p className="text-[9px] font-bold text-slate-400/80 mt-3">{timeAgo(n.timestamp)}</p>
                    </div>
                    </div>
                  ))}
              </div>
          )}
        </div>
      )}
    </div>
  );
};
