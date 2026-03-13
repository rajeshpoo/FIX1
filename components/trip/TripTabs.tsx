import React from 'react';
import { Truck, History, IndianRupee } from 'lucide-react';

export type TripTab = 'VEHICLES' | 'HISTORY' | 'EXPENSES';

interface TabsProps {
  activeTab: TripTab;
  setActiveTab: (tab: TripTab) => void;
}

export const TripTabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'VEHICLES', label: 'Vehicles', icon: Truck },
    { id: 'HISTORY', label: 'History', icon: History },
    { id: 'EXPENSES', label: 'Expenses', icon: IndianRupee },
  ];

  return (
    <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1.5 rounded-2xl mb-6">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id as TripTab)}
          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === id 
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
};