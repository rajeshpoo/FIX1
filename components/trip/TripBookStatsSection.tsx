
import React from 'react';
import { TripStats } from './TripStats';

interface Props {
  stats: { totalTrips: number; totalFreight: number; totalExp: number };
  activeView: string;
  onViewTrips: () => void;
  onViewFare: () => void;
  onViewExpenses: () => void;
  filterOnlyWithTrips: boolean;
  view: string;
}

export const TripBookStatsSection: React.FC<Props> = ({ 
  stats, activeView, onViewTrips, onViewFare, onViewExpenses, filterOnlyWithTrips, view 
}) => {
  const currentView = filterOnlyWithTrips && view === 'VEHICLES' ? 'VEHICLES_FILTERED' : view;
  
  return (
    <TripStats 
      stats={stats} 
      activeView={currentView as any} 
      onViewTrips={onViewTrips} 
      onViewFare={onViewFare} 
      onViewExpenses={onViewExpenses} 
    />
  );
};
