
import React from 'react';
import { Trip, TripExpense, UserProfile } from '../../types';
import { 
  TripFormModal, ExpenseFormModal, BillGenerationModal, ExportMenuModal, 
  DateFilterModal, StartTripModal, DeleteConfirmModal 
} from './TripModals';

interface Props {
  activeModal: string;
  setActiveModal: (m: any) => void;
  editingTrip: Trip | null;
  editingExpense: TripExpense | null;
  handleSaveTrip: (data: any) => void;
  handleSaveExpense: (data: any) => void;
  handleStartTripForVehicle: (vNum: string) => void;
  executeDelete: () => void;
  onExport: (fmt: 'xlsx' | 'pdf') => void;
  onAddExpenseToTrip: () => void;
  onFinalizeBill: (data: any) => void;
  onApplyDateFilter: (filter: any) => void;
  isPremium?: boolean;
}

export const TripBookModalManager: React.FC<Props> = ({
  activeModal, setActiveModal, editingTrip, editingExpense,
  handleSaveTrip, handleSaveExpense, handleStartTripForVehicle,
  executeDelete, onExport, onAddExpenseToTrip, onFinalizeBill, onApplyDateFilter,
  isPremium = false
}) => {
  return (
    <>
      {activeModal === 'FILTER_DATE' && (
        <DateFilterModal onClose={() => setActiveModal('NONE')} onApply={onApplyDateFilter} />
      )}
      
      {activeModal === 'CONFIRM_DELETE' && (
        <DeleteConfirmModal isOpen={true} isTrip={true} onClose={() => setActiveModal('NONE')} onDelete={executeDelete} />
      )}
      
      {activeModal === 'ENTER_VEHICLE' && (
        <StartTripModal isOpen={true} onClose={() => setActiveModal('NONE')} onNext={handleStartTripForVehicle} />
      )}
      
      {activeModal === 'ADD_TRIP' && editingTrip && (
        <TripFormModal 
          isOpen={true} onClose={() => setActiveModal('NONE')} isEdit={false} 
          initialData={{ date: editingTrip.startDate, driver: editingTrip.driverName, from: editingTrip.route.from, to: editingTrip.route.to, party: editingTrip.partyName, freight: editingTrip.freightAmount }} 
          onSave={handleSaveTrip} 
        />
      )}
      
      {activeModal === 'EDIT_TRIP' && editingTrip && (
        <TripFormModal 
          isOpen={true} onClose={() => setActiveModal('NONE')} isEdit={true} 
          initialData={{ date: editingTrip.startDate, driver: editingTrip.driverName, from: editingTrip.route.from, to: editingTrip.route.to, party: editingTrip.partyName, freight: editingTrip.freightAmount }} 
          onSave={handleSaveTrip}
          onAddExpenseClick={onAddExpenseToTrip}
        />
      )}
      
      {activeModal === 'ADD_EXPENSE' && (
        <ExpenseFormModal 
          isOpen={true} onClose={() => setActiveModal('NONE')} isEdit={false} 
          initialData={{ date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0,5), type: 'FUEL', amount: '', paidBy: 'OWNER' }} 
          onSave={handleSaveExpense} 
        />
      )}
      
      {activeModal === 'EDIT_EXPENSE' && editingExpense && (
        <ExpenseFormModal 
          isOpen={true} onClose={() => setActiveModal('NONE')} isEdit={true} 
          initialData={{ date: editingExpense.date, time: editingExpense.time || '', type: editingExpense.type, amount: editingExpense.amount, paidBy: editingExpense.paidBy }} 
          onSave={handleSaveExpense} 
        />
      )}
      
      {activeModal === 'BILL_DETAILS' && editingTrip && (
        <BillGenerationModal 
          isOpen={true} onClose={() => setActiveModal('NONE')} 
          initialData={{ invoiceNo: editingTrip.invoiceNumber || '', billDate: editingTrip.billDate || new Date().toISOString().split('T')[0] }} 
          onSave={onFinalizeBill} 
        />
      )}
      
      {activeModal === 'EXPORT_MENU' && (
        <ExportMenuModal onClose={() => setActiveModal('NONE')} onExport={onExport as any} isPremium={isPremium} />
      )}
    </>
  );
};
