
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Crown, CheckCircle2, Loader2, ShieldCheck, Zap, Star, TrendingUp, Gift, AlertTriangle, RefreshCw } from 'lucide-react';
import { notify } from '../services/firebaseService';
import { getApiUrl } from '../utils/helpers';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
        resolve(true);
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: any;
    adminMode?: boolean;
    onGift?: (planId: 'MONTHLY_149' | 'QUARTERLY_299' | 'YEARLY_999') => Promise<void>;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, userProfile, adminMode = false, onGift }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<{ title: string; message: string; isTokenError?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleAction = async (planId: 'MONTHLY_149' | 'QUARTERLY_299' | 'YEARLY_999') => {
      setLoading(planId);
      setPaymentError(null); 

      // --- ADMIN GIFT FLOW ---
      if (adminMode && onGift) {
          try {
              await onGift(planId);
              onClose();
          } catch (e) {
              console.error(e);
          } finally {
              setLoading(null);
          }
          return;
      }

      // --- WEB PAYMENT FLOW ---
      try {
          const isLoaded = await loadRazorpayScript();
          if (!isLoaded) {
              setPaymentError({ title: "Gateway Error", message: "Could not load Razorpay. Check internet." });
              setLoading(null);
              return;
          }

          const apiUrl = getApiUrl('/api/create-order');
          
          const orderRes = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId, userId: userProfile.uid })
          });

          if (!orderRes.ok) throw new Error("Server could not create order.");
          
          const orderData = await orderRes.json();
          
          if (!orderData.id) {
              setPaymentError({ title: "Configuration Error", message: "Order ID missing from server." });
              setLoading(null);
              return;
          }

          const options = {
              key: orderData.keyId,
              amount: orderData.amount,
              currency: orderData.currency,
              name: "FleetDost",
              description: `Premium Upgrade`,
              image: "https://cdn-icons-png.flaticon.com/512/3774/3774278.png",
              order_id: orderData.id,
              prefill: {
                  name: userProfile.displayName || '',
                  email: userProfile.email || '',
                  contact: userProfile.phoneNumber ? userProfile.phoneNumber.replace(/\D/g,'').slice(-10) : ''
              },
              theme: { color: "#4f46e5" },
              
              handler: async function (response: any) {
                  setLoading('VERIFYING');
                  try {
                      const verifyRes = await fetch(getApiUrl('/api/verify-payment'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              razorpay_order_id: response.razorpay_order_id,
                              razorpay_payment_id: response.razorpay_payment_id,
                              razorpay_signature: response.razorpay_signature,
                              userId: userProfile.uid,
                              planId: planId
                          })
                      });

                      const verifyData = await verifyRes.json();
                      if (verifyRes.ok && verifyData.status === 'success') {
                          notify("Success", "Premium Activated!", "success");
                          onClose();
                          window.location.reload();
                      } else {
                          notify("Pending", "Payment recorded. Updating...", "warning");
                          onClose();
                      }
                  } catch (err) {
                      console.error("Verification Error", err);
                      setPaymentError({ title: "Activation Delay", message: "Payment successful but activation failed. Contact support." });
                  } finally {
                      setLoading(null);
                  }
              },
              modal: { 
                  ondismiss: () => setLoading(null) 
              }
          };

          const rzp1 = new (window as any).Razorpay(options);
          
          rzp1.on('payment.failed', function (response: any){
                console.error("Payment Failed", response.error);
                
                let errorTitle = "Payment Failed";
                let errorMsg = response.error.description || 'Transaction declined by bank.';
                let isToken = false;

                // Smart Error Detection for Saved Cards
                if (errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('card_id')) {
                    errorTitle = "Invalid Card Token";
                    errorMsg = "Your saved card token is expired or invalid. Please retry and select 'Add New Card' or enter card details manually.";
                    isToken = true;
                }

                // Force close loading state immediately
                setLoading(null);
                
                // Set error which triggers the High Z-Index Portal
                setPaymentError({ title: errorTitle, message: errorMsg, isTokenError: isToken });
          });

          rzp1.open();

      } catch (e: any) {
          console.error("Payment Start Error", e);
          setPaymentError({ title: "Connection Error", message: "Could not initiate payment gateway." });
          setLoading(null);
      }
  };

  return (
    <>
        <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4 font-sans">
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-sm:w-full max-w-sm bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] shadow-2xl border border-white/10 animate-pop-in max-h-[90vh] overflow-y-auto no-scrollbar">
            
            <div className="bg-slate-900 text-white p-8 pb-10 rounded-b-[2.5rem] relative overflow-hidden">
                <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all text-white/70 hover:text-white z-20">
                    <X size={18} />
                </button>
                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 pointer-events-none"><Crown size={120} /></div>
                <div className="relative z-10 text-center">
                    {adminMode ? (
                        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 shadow-lg">
                            <Gift size={10} fill="currentColor" /> Admin Gift Mode
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 shadow-lg">
                            <Star size={10} fill="currentColor" /> Premium Access
                        </div>
                    )}
                    <h2 className="text-3xl font-black tracking-tight mb-2">
                        {adminMode ? 'Grant Premium' : <><span className="text-amber-400">Unlimited</span> Access</>}
                    </h2>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-[220px] mx-auto">
                        {adminMode ? `Gifting subscription to ${userProfile.displayName || 'User'}` : 'Digitize your fleet and save on heavy RTO fines with smart alerts.'}
                    </p>
                </div>
            </div>

            <div className="p-6 -mt-6 relative z-10 space-y-4">
                <button onClick={() => handleAction('YEARLY_999')} disabled={!!loading} className="w-full relative group text-left">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 to-orange-600 rounded-[2rem] blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 shadow-xl flex items-center justify-between">
                    <div className="absolute -top-3 left-6 bg-slate-900 text-amber-400 text-[8px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-amber-500/30">BEST VALUE</div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Yearly</h3>
                            <Zap size={14} className="text-amber-500 fill-amber-500" />
                        </div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{adminMode ? '365 Days Access' : '₹83 / month'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {adminMode ? 'FREE' : '₹999'}
                        </p>
                        {adminMode && <p className="text-[8px] font-bold text-slate-400 uppercase">For User</p>}
                    </div>
                    </div>
                </button>

                <button onClick={() => handleAction('QUARTERLY_299')} disabled={!!loading} className="w-full bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between active:scale-95 transition-all text-left">
                    <div><h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Quarterly</h3><p className="text-[10px] font-bold text-slate-400 mt-0.5">3 Months Access</p></div>
                    <div className="text-right"><p className="text-xl font-black text-slate-700 dark:text-slate-300">{adminMode ? 'FREE' : '₹299'}</p></div>
                </button>

                <button onClick={() => handleAction('MONTHLY_149')} disabled={!!loading} className="w-full bg-slate-50 dark:bg-slate-800/50 p-4 rounded-[1.8rem] border border-transparent hover:border-slate-200 flex items-center justify-center active:scale-95 transition-all group text-left">
                    <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"><TrendingUp size={16} /></div>
                    <div><h3 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase">Monthly</h3><p className="text-[9px] text-slate-400">Basic Trial</p></div>
                    </div>
                    <p className="text-lg font-black text-slate-600 dark:text-slate-400 ml-auto">{adminMode ? 'FREE' : '₹149'}</p>
                </button>

                {!adminMode && (
                    <div className="pt-4 px-2 grid grid-cols-2 gap-y-3 gap-x-2">
                        {['Unlimited Trucks', 'Lifetime Ledger', 'Excel Export', 'Priority OCR'].map((feat, i) => (
                            <div key={i} className="flex items-center gap-2"><CheckCircle2 size={12} className="text-indigo-500" strokeWidth={3} /><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{feat}</span></div>
                        ))}
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-slate-400 opacity-70">
                    <ShieldCheck size={12} />
                    <p className="text-[8px] font-black uppercase tracking-widest">
                        {adminMode ? 'ADMINISTRATIVE OVERRIDE' : '100% SECURE VIA RAZORPAY'}
                    </p>
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center z-50">
                    <Loader2 size={48} className="animate-spin text-indigo-600 mb-6"/>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        {loading === 'VERIFYING' ? 'Verifying Payment...' : 'Connecting to Server...'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Please wait while we secure your plan.</p>
                </div>
            )}
        </div>
        </div>

        {/* HIGH PRIORITY ERROR OVERLAY - RENDERS OUTSIDE STACKING CONTEXT */}
        {paymentError && createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
                <div className="relative w-full max-w-[320px] bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 text-center shadow-2xl animate-pop-in border border-red-200 dark:border-red-900/30">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl animate-shake">
                        <AlertTriangle size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 leading-tight">{paymentError.title}</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        {paymentError.message}
                    </p>
                    
                    <button 
                        onClick={() => setPaymentError(null)}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={14} /> Try Again
                    </button>
                    {paymentError.isTokenError && (
                        <p className="mt-4 text-[9px] font-bold text-indigo-500 uppercase tracking-widest animate-pulse">
                            Tip: Don't use saved card. Use "Add New Card".
                        </p>
                    )}
                </div>
            </div>,
            document.body
        )}
    </>
  );
};
