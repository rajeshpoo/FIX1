
import React, { useState } from 'react';
import { FirebaseUser } from '../types';
import { notify, updateUserPhoneInDb, logoutUser } from '../services/firebaseService';
import { Phone, Save, Loader2, LogOut } from 'lucide-react';

interface Props {
  user: FirebaseUser;
  onComplete: () => void;
}

export const OnboardingPhone: React.FC<Props> = ({ user, onComplete }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!phoneNumber || phoneNumber.length < 10) {
      notify("Invalid Number", "Enter valid mobile number", "warning");
      return;
    }
    setLoading(true);
    
    try {
      // Format number (optional, but good for consistency)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/\D/g,'')}`;
      
      // Save directly to DB without OTP verification
      await updateUserPhoneInDb(user, formattedPhone);
      
      notify("Success", "Mobile number saved!", "success");
      onComplete();
    } catch (error: any) {
      console.error(error);
      notify("Error", "Failed to save mobile number", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-6">
      <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
        <div className="text-center mb-8">
           <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/40">
              <Phone className="w-10 h-10 text-white" strokeWidth={2.5} />
           </div>
           <h2 className="text-2xl font-black text-white tracking-tight mb-2">Add Mobile Number</h2>
           <p className="text-slate-400 text-sm font-medium">Please add your phone number to complete your profile.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
           <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">Mobile Number</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold">🇮🇳</div>
                    <input 
                      type="tel"
                      autoFocus 
                      value={phoneNumber} 
                      onChange={e => setPhoneNumber(e.target.value.replace(/[^\d+]/g, '').slice(0, 13))}
                      placeholder="7852005541"
                      className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-slate-700 rounded-2xl text-white font-black text-lg outline-none focus:border-indigo-500 transition-all"
                    />
                </div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-indigo-50 disabled:opacity-70 disabled:cursor-not-allowed"
           >
             {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  <span>Save Number</span>
                  <Save size={18} strokeWidth={3} />
                </>
             )}
           </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <button onClick={() => logoutUser()} className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 text-xs font-bold mx-auto transition-colors">
               <LogOut size={14} /> Sign Out
            </button>
        </div>
      </div>
    </div>
  );
};