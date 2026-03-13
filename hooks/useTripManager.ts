
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Trip, TripExpense, Vehicle } from '../types';
import { 
  saveTripAtomic, // Import Atomic Save
  deleteTrip, notify, 
  fetchLedgers, saveLedger, saveTransaction, 
  deleteTransactionsByRef,
  saveTripsBulk
} from '../services/firebaseService';

// ... (keep helper functions if needed, but atomic save replaces most logic)

export const useTripManager = (uid: string, fleet: Vehicle[]) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, `users/${uid}/trips`), orderBy('lastUpdated', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const tripList: Trip[] = [];
      snapshot.forEach(doc => tripList.push({ ...doc.data() } as Trip));
      setTrips(tripList);
      setLoading(false);
    });
  }, [uid]);

  const addOrUpdateTrip = async (trip: Trip, newExpense?: TripExpense) => {
    // 1. Capture the OLD trip state before saving the new one (if it exists)
    const oldTrip = trips.find(t => t.id === trip.id);

    // 2. Use Atomic Save (Transaction) to handle Trip + Ledger safely
    try {
        await saveTripAtomic(uid, trip, oldTrip, newExpense);
        return true;
    } catch (e) {
        console.error("Save failed in hook", e);
        notify("Error", "Failed to save trip. Try again.", "error");
        return false;
    }
  };

  const removeTrip = async (tripId: string) => {
      // NOTE: Deletion is still separate but less risky than creation race conditions.
      // For perfection, deleteTrip should also be atomic if it affects ledger heavily.
      // Current implementation in firebaseService handles cleanup reasonably well.
      
      const tripToDelete = trips.find(t => t.id === tripId);
      // Logic for reverse ledger entry is inside removeOldLedgerEntry (if we kept it exposed)
      // Ideally, deleteTrip in firebaseService handles this.
      // Assuming existing deleteTrip cleans up transactions via deleteTransactionsByRef.
      
      await deleteTrip(uid, tripId);
      // Note: Ledger balance reversal on deletion is complex. 
      // The current system deletes the transaction but doesn't auto-revert the balance 
      // in the deleteTrip function provided in context. 
      // TO FIX COMPLETELY: We should implement an atomic deleteTrip function.
      // However, per instructions, we fixed the "Save" race condition.
  };

  const removeExpense = async (tripId: string, expenseId: string) => {
      const trip = trips.find(t => t.id === tripId);
      if (!trip) return;
      
      const updatedExpenses = trip.expenses.filter(e => e.id !== expenseId);
      const totalExp = updatedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const updatedTrip: Trip = {
          ...trip,
          expenses: updatedExpenses,
          totalExpense: totalExp,
          netProfit: (Number(trip.freightAmount) || 0) - totalExp,
          lastUpdated: Date.now()
      };
      
      // Use atomic save to update trip stats safely
      await saveTripAtomic(uid, updatedTrip, trip);
      
      if (expenseId.startsWith('exp-')) {
          await deleteTransactionsByRef(uid, expenseId);
      }
  };

  const importTrips = async (importedTrips: Trip[]) => {
      try {
          await saveTripsBulk(uid, importedTrips);
          notify("Import Successful", `${importedTrips.length} trips synced with cloud.`, "success");
      } catch (e) {
          notify("Import Failed", "Could not sync imported trips.", "error");
      }
  };

  const endTrip = async (trip: Trip) => {
    const endedTrip: Trip = { 
        ...trip, 
        status: 'COMPLETED', 
        endDate: new Date().toISOString().split('T')[0], 
        lastUpdated: Date.now() 
    };
    // Use atomic save to ensure ledger update triggers correctly on completion
    await saveTripAtomic(uid, endedTrip, trip);
    notify("Success", "Trip Completed & Ledger Updated", "success");
  };

  return { trips, loading, addOrUpdateTrip, removeTrip, endTrip, removeExpense, importTrips };
};
