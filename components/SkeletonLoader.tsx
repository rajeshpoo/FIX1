
import React from 'react';

export const VehicleCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden mb-3">
    {/* Shimmer Effect Overlay */}
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-100/50 dark:via-slate-800/50 to-transparent z-10 pointer-events-none"></div>
    
    <div className="flex justify-between items-start mb-4 relative">
        <div className="space-y-2.5">
            {/* Vehicle Number Skeleton */}
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            {/* Owner Name Skeleton */}
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/50 rounded-md"></div>
        </div>
        {/* Status Badge Skeleton */}
        <div className="h-6 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
    </div>

    {/* Document Pills Skeleton */}
    <div className="grid grid-cols-3 gap-2 mt-4 relative">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-7 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-50 dark:border-slate-700/50"></div>
        ))}
        <div className="col-span-3 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
    </div>
  </div>
);

export const DashboardStatsSkeleton = () => (
    <div className="flex overflow-x-auto no-scrollbar gap-4 mb-8">
        {[1, 2].map((i) => (
            <div key={i} className="min-w-full p-1">
                <div className="h-52 bg-slate-200 dark:bg-slate-900 rounded-[2.5rem] relative overflow-hidden border-4 border-white/20">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
                </div>
            </div>
        ))}
    </div>
);

export const TripCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden mb-4">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-100/50 dark:via-slate-800/50 to-transparent z-10 pointer-events-none"></div>
    
    <div className="flex justify-between items-start mb-4">
        <div>
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg mb-2"></div>
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/50 rounded-md"></div>
        </div>
        <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
    </div>

    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        <div className="text-right">
            <div className="h-2 w-12 bg-slate-100 dark:bg-slate-800 rounded mb-1 ml-auto"></div>
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto"></div>
        </div>
    </div>
  </div>
);

export const LedgerCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden mb-3 flex items-center justify-between">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-100/50 dark:via-slate-800/50 to-transparent z-10 pointer-events-none"></div>
    
    <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl shrink-0"></div>
        <div className="space-y-2 w-full">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/50 rounded-md"></div>
        </div>
    </div>
    <div className="text-right">
        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg mb-1"></div>
        <div className="h-2 w-8 bg-slate-100 dark:bg-slate-800/50 rounded ml-auto"></div>
    </div>
  </div>
);
