
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Delete, Lock, LogOut, AlertTriangle, X } from 'lucide-react';
import { hapticFeedback } from '../utils/haptics';
import { logoutUser, notify } from '../services/firebaseService';

interface Props {
  isOpen: boolean;
  isSetupMode?: boolean;
  onSuccess: (pin?: string) => void;
  onCancel?: () => void;
}

export const SecurityLock: React.FC<Props> = ({ isOpen, isSetupMode = false, onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'ENTER' | 'CREATE' | 'CONFIRM'>('ENTER');
  const [error, setError] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isSetupMode) {
          setStep('CREATE');
      } else {
          setStep('ENTER');
      }
      setPin('');
      setConfirmPin('');
      setError(false);
      setShowForgotConfirm(false);
      document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { 
        document.body.style.overflow = 'unset'; 
    };
  }, [isOpen, isSetupMode]);

  const handlePress = (num: string) => {
    hapticFeedback(10);
    if (error) setError(false);
    
    if (step === 'CONFIRM') {
        if (confirmPin.length < 4) {
            const newPin = confirmPin + num;
            setConfirmPin(newPin);
            if (newPin.length === 4) validate(newPin);
        }
    } else {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) validate(newPin);
        }
    }
  };

  const handleDelete = () => {
    hapticFeedback(10);
    if (error) setError(false);
    if (step === 'CONFIRM') setConfirmPin(prev => prev.slice(0, -1));
    else setPin(prev => prev.slice(0, -1));
  };

  const validate = (inputPin: string) => {
      if (step === 'ENTER') {
          const storedPin = localStorage.getItem('fleetdost_pin');
          if (storedPin === inputPin) {
              hapticFeedback([10, 50, 10]);
              onSuccess();
          } else {
              hapticFeedback([50, 50, 50]);
              setError(true);
              setTimeout(() => {
                  setPin('');
                  setError(false);
              }, 400);
          }
      } else if (step === 'CREATE') {
          setTimeout(() => {
              setStep('CONFIRM');
              setConfirmPin('');
          }, 300);
      } else if (step === 'CONFIRM') {
          if (inputPin === pin) {
              hapticFeedback([10, 50, 10]);
              localStorage.setItem('fleetdost_pin', inputPin);
              notify("Secure", "App Lock Enabled", "success");
              onSuccess(inputPin);
          } else {
              hapticFeedback([50, 50, 50]);
              setError(true);
              notify("Mismatch", "PINs do not match. Try again.", "error");
              setTimeout(() => {
                  setStep('CREATE');
                  setPin('');
                  setConfirmPin('');
                  setError(false);
              }, 600);
          }
      }
  };

  const confirmLogout = async () => {
      hapticFeedback(20);
      localStorage.removeItem('fleetdost_pin');
      await logoutUser();
      window.location.reload();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-slate-950 flex flex-col items-center justify-center font-sans animate-fade-in select-none touch-none">
        
        {/* Header Area */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs space-y-8">
            <div className="flex flex-col items-center animate-slide-up">
                <div 
                    className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl transition-all duration-300 ${error ? 'bg-red-500 text-white animate-shake' : 'bg-indigo-600 text-white'}`}
                >
                    {error ? <Lock size={40} /> : <ShieldCheck size={40} strokeWidth={2} />}
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                    {step === 'ENTER' ? 'FleetDost Locked' : step === 'CREATE' ? 'Create PIN' : 'Confirm PIN'}
                </h2>
                <p className={`text-xs font-bold uppercase tracking-widest transition-colors ${error ? 'text-red-500' : 'text-slate-500'}`}>
                    {error ? (step === 'ENTER' ? 'Wrong PIN' : 'Mismatch') : (step === 'ENTER' ? 'Enter Passcode' : 'Set a pass code')}
                </p>
            </div>

            {/* Dots Indicator */}
            <div className="flex gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <div 
                        key={i} 
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                            (step === 'CONFIRM' ? confirmPin.length : pin.length) > i 
                            ? (error ? 'bg-red-500 border-red-500' : 'bg-indigo-500 border-indigo-500 scale-110') 
                            : 'border-slate-700 bg-slate-900'
                        }`} 
                    />
                ))}
            </div>
        </div>

        {/* Numpad */}
        <div className="pb-12 w-full max-w-xs px-6">
            <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button 
                        key={num}
                        onClick={() => handlePress(num.toString())}
                        className="w-full aspect-square rounded-full bg-slate-900/50 border border-slate-800 text-white text-2xl font-bold flex items-center justify-center active:bg-slate-800 active:scale-95 transition-all shadow-lg"
                    >
                        {num}
                    </button>
                ))}
                
                {/* Bottom Row - Left Action */}
                <div className="flex items-center justify-center">
                    {isSetupMode && (
                        <button onClick={onCancel} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest p-4">Cancel</button>
                    )}
                </div>
                
                <button 
                    onClick={() => handlePress('0')}
                    className="w-full aspect-square rounded-full bg-slate-900/50 border border-slate-800 text-white text-2xl font-bold flex items-center justify-center active:bg-slate-800 active:scale-95 transition-all shadow-lg"
                >
                    0
                </button>

                {/* Bottom Row - Right Action */}
                {pin.length > 0 || confirmPin.length > 0 ? (
                    <button 
                        onClick={handleDelete}
                        className="w-full aspect-square rounded-full flex items-center justify-center text-slate-400 active:text-white active:scale-95 transition-all"
                    >
                        <Delete size={28} />
                    </button>
                ) : (
                    <button 
                        onClick={isSetupMode ? undefined : () => setShowForgotConfirm(true)}
                        className="flex flex-col items-center justify-center text-slate-500 active:text-red-400 transition-colors"
                    >
                        {!isSetupMode && (
                            <>
                                <LogOut size={20} className="mb-1" />
                                <span className="text-[8px] font-bold uppercase tracking-widest">Forgot</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>

        {/* CUSTOM FORGOT PASSWORD MODAL */}
        {showForgotConfirm && (
            <div className="absolute inset-0 z-[10002] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] w-full max-w-[320px] text-center shadow-2xl animate-pop-in relative">
                    
                    <button 
                        onClick={() => setShowForgotConfirm(false)}
                        className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 border border-red-500/20">
                        <AlertTriangle size={32} />
                    </div>
                    
                    <h3 className="text-xl font-black text-white tracking-tight mb-2">Forgot PIN?</h3>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed mb-6 px-2">
                        For security reasons, resetting your lock requires you to sign out and log in again.
                    </p>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={confirmLogout} 
                            className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut size={14} /> Log Out & Reset
                        </button>
                        <button 
                            onClick={() => setShowForgotConfirm(false)} 
                            className="w-full py-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>,
    document.body
  );
};
