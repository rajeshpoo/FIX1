
import React, { useState, useEffect } from 'react';
import { 
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle,
  resetPassword, 
  notify,
  setupRecaptcha,
  sendOtpToPhone,
  verifyOtpOnly,
  checkUserExistsAndActive,
  destroyRecaptcha,
  reloadCurrentUser,
  logoutUser,
  resendVerificationEmail,
  createProfileForPhoneUser
} from '../services/firebaseService';
import { 
  Truck, Mail, Lock, Loader2, User as UserIcon, 
  Eye, EyeOff, AlertCircle, Phone, MessageSquare, ArrowRight, CheckCircle2, RefreshCw, LogOut, Send
} from 'lucide-react';
import { FirebaseUser } from '../types';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT';
type AuthMethod = 'PHONE' | 'EMAIL';

export const FullScreenLoader = () => (
  <div className="fixed inset-0 z-[10000] bg-[#020617] flex flex-col items-center justify-center overflow-hidden font-sans">
    {/* Background Ambience */}
    <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[120px]"></div>
    </div>

    <div className="relative z-10 flex flex-col items-center animate-fade-in">
      {/* Premium Logo Container */}
      <div className="relative mb-8 group">
        <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-1000 rounded-3xl"></div>
        
        <div className="w-20 h-20 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50"></div>
            <Truck className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.6)] relative z-20" strokeWidth={1.5} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent translate-y-[-100%] animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>

      {/* Typography */}
      <div className="text-center space-y-1 mb-8">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-400 tracking-tighter drop-shadow-sm">
          FleetDost
        </h1>
        <div className="flex items-center justify-center gap-2">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-indigo-500"></div>
            <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-[0.4em]">Premium Fleet OS</p>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-indigo-500"></div>
        </div>
      </div>
      
      {/* Modern Loading Indicator */}
      <div className="flex flex-col items-center gap-4 w-48">
          <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 w-full animate-[shimmer_1.5s_infinite_linear] origin-left"></div>
          </div>
          
          <div className="flex items-center gap-2 opacity-60">
              <Loader2 size={10} className="text-indigo-400 animate-spin" />
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Secure Sync...</span>
          </div>
      </div>
    </div>
  </div>
);

export const EmailVerificationScreen: React.FC<{ user: FirebaseUser; onVerified: () => void }> = ({ user, onVerified }) => {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Auto-poll for verification status every 3 seconds
    const interval = setInterval(async () => {
      setChecking(true);
      try {
        const reloadedUser = await reloadCurrentUser();
        if (reloadedUser && reloadedUser.emailVerified) {
          clearInterval(interval);
          onVerified();
        }
      } catch (e) {
        console.error("Verification poll error", e);
      } finally {
        setChecking(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [onVerified]);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
    } catch (e) {
      console.error(e);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-6 relative font-sans overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]"></div>

      <div className="relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl text-center animate-slide-up">
        <div className="w-20 h-20 mx-auto bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-xl relative group">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping opacity-75"></div>
          <Mail size={32} className="text-indigo-400 relative z-10" />
          {checking && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
          )}
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Check Your Email</h2>
        <p className="text-sm font-medium text-slate-400 mb-8 leading-relaxed">
          We sent a verification link to <br/>
          <span className="text-white font-bold">{user.email}</span>
        </p>

        <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 mb-8">
          <div className="flex items-start gap-3 text-left">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 mt-0.5">
              <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-0.5">Auto-Detecting...</p>
              <p className="text-[10px] text-slate-500 leading-tight">
                Click the link in your email app. We will automatically log you in here.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => window.open('https://mail.google.com', '_blank')}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Open Email App <ArrowRight size={14} />
          </button>

          <button 
            onClick={handleResend}
            disabled={resending}
            className="w-full py-3 bg-transparent text-slate-400 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            {resending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Resend Verification
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5">
          <button onClick={() => logoutUser()} className="flex items-center justify-center gap-2 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide mx-auto transition-colors group">
            <LogOut size={12} className="group-hover:-translate-x-0.5 transition-transform" /> Sign Out / Wrong Email
          </button>
        </div>
      </div>
    </div>
  );
};

export const AuthScreen: React.FC = () => {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('EMAIL');
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState<'SEND' | 'VERIFY'>('SEND');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    // Synchronously clean up the reCAPTCHA verifier on component unmount.
    return () => {
      destroyRecaptcha();
    };
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      if (authMode === 'FORGOT') {
        if (!email) throw new Error("Enter email address");
        await resetPassword(email);
        notify("Sent", "Please check your mail", "success");
        setAuthMode('LOGIN');
      } else if (authMode === 'SIGNUP') {
        if (!name || !email || !password || !phone) throw new Error("All fields are required");
        if (phone.length < 10) throw new Error("Invalid mobile number");
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        await registerWithEmail(email, password, name, formattedPhone);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let errorMessage = "Authentication Failed";
      
      const rawError = err.code || err.message || "";
      
      if (rawError.includes('auth/invalid-credential') || rawError.includes('auth/wrong-password')) {
          errorMessage = "Incorrect Password";
      } else if (rawError.includes('auth/user-not-found')) {
          errorMessage = "Account does not exist";
      } else if (rawError.includes('auth/email-already-in-use')) {
          errorMessage = "Email already registered";
      } else if (rawError.includes('auth/too-many-requests')) {
          errorMessage = "Account temporarily blocked. Try again later.";
      } else if (rawError.includes('network')) {
          errorMessage = "Network Error. Check internet.";
      } else if (err.message) {
          errorMessage = err.message;
      }

      setLocalError(errorMessage);
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      if (otpStep === 'SEND') {
        if (phone.length < 10) throw new Error("Enter valid 10-digit number");
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        const verifier = setupRecaptcha('recaptcha-container');
        if (!verifier) throw new Error("Recaptcha failed");
        
        console.log("Sending OTP to:", formattedPhone);
        const result = await sendOtpToPhone(formattedPhone, verifier);
        setConfirmationResult(result);
        setOtpStep('VERIFY');
        notify("OTP Sent", "Code sent to " + phone, "success");
        setLoading(false);
      } else {
        const user = await verifyOtpOnly(confirmationResult, otp);
        await createProfileForPhoneUser(user);
        await checkUserExistsAndActive(user);
      }
    } catch (err: any) {
      console.error("Phone Auth Error Detailed:", err);
      let msg = err.message || "Phone auth failed";
      
      if (msg.includes('auth/invalid-app-credential')) {
          msg = "Setup Error: Check Firebase Auth settings.";
      } else if (msg.includes('auth/quota-exceeded')) {
          msg = "SMS limit exceeded. Please use Test Number.";
      } else if (msg.includes('auth/invalid-verification-code')) {
          msg = "Wrong OTP entered.";
      }
      
      setLocalError(msg);
      setLoading(false);
      if (otpStep === 'SEND') destroyRecaptcha();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-4 relative font-sans overflow-y-auto">
      {/* SOLID PREMIUM BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 bg-[#020617] z-0"></div>
      <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full animate-blob pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[5%] w-[600px] h-[600px] bg-purple-900/20 blur-[130px] rounded-full animate-blob pointer-events-none" style={{ animationDelay: '2s' }}></div>
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center my-6">
        
        <div className="text-center mb-6 animate-pop-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl mb-4 border border-white/10 rotate-3 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
            <Truck className="w-8 h-8 text-white animate-[truckDrive_0.8s_ease-out]" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-1">FleetDost</h1>
          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] opacity-90">PREMIUM FLEET MANAGEMENT</p>
        </div>

        <div className="relative bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-2xl w-full animate-slide-up overflow-hidden">
          
          <div className="flex bg-slate-950/50 p-1 rounded-xl mb-6 border border-white/5 relative z-10">
             <button 
                onClick={() => { setAuthMethod('EMAIL'); setLocalError(null); setPhone(''); }} 
                className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${authMethod === 'EMAIL' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500'}`}
             >
                EMAIL
             </button>
             <button 
                onClick={() => { setAuthMethod('PHONE'); setLocalError(null); setPhone(''); }} 
                className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${authMethod === 'PHONE' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500'}`}
             >
                PHONE OTP
             </button>
          </div>

          <h2 className="text-xl font-bold text-white text-center mb-6 tracking-tight relative z-10">
            {authMethod === 'EMAIL' 
              ? (authMode === 'LOGIN' ? 'Welcome Back' : authMode === 'SIGNUP' ? 'Create Account' : 'Reset Account')
              : (otpStep === 'SEND' ? 'Mobile Login' : 'Verify OTP')
            }
          </h2>

          {localError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-pop-in relative z-10">
               <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
               <p className="text-[10px] font-bold text-red-200 leading-tight">{localError}</p>
            </div>
          )}

          {authMethod === 'EMAIL' ? (
            <form onSubmit={handleEmailAuth} className="space-y-3 relative z-10">
              {authMode === 'SIGNUP' && (
                <>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                    <input 
                        type="text" 
                        placeholder="Full Name" 
                        value={name} 
                        onChange={e => setName(e.target.value.toUpperCase())} 
                        className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner" 
                    />
                  </div>
                  
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                    <input 
                        type="tel" 
                        placeholder="Mobile Number" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                        className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner" 
                    />
                  </div>
                </>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner" 
                />
              </div>

              {authMode !== 'FORGOT' && (
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                  <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="w-full pl-11 pr-10 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                     {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}

              {authMode === 'LOGIN' && (
                <div className="flex justify-end pr-1">
                  <button type="button" onClick={() => setAuthMode('FORGOT')} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors">Forgot Password?</button>
                </div>
              )}

              <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-4 hover:bg-indigo-500"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (authMode === 'LOGIN' ? 'Sign In' : authMode === 'SIGNUP' ? 'Create Account' : 'Send Link')}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit} className="space-y-4 relative z-10">
               {otpStep === 'SEND' ? (
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                    <input 
                      type="tel" 
                      placeholder="Phone Number" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white font-black text-lg outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 tracking-widest shadow-inner" 
                    />
                  </div>
               ) : (
                  <div className="relative group">
                    <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                    <input 
                      type="number" 
                      autoFocus
                      placeholder="OTP" 
                      value={otp} 
                      onChange={e => setOtp(e.target.value.slice(0, 6))} 
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-white font-black text-2xl outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 tracking-[0.5em] text-center shadow-inner" 
                    />
                  </div>
               )}
               <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 hover:bg-indigo-500"
               >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (otpStep === 'SEND' ? 'Send OTP' : 'Verify & Login')}
                  {!loading && <ArrowRight size={16} />}
               </button>
            </form>
          )}

          <div className="flex items-center gap-4 my-6 relative z-10">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest opacity-60">OR</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          {/* WEB GOOGLE LOGIN */}
          <button 
            type="button"
            onClick={() => loginWithGoogle().catch(err => {
                let msg = err.message;
                if (msg.includes('popup-closed')) msg = "Sign-in cancelled.";
                else if (msg.includes('operation-not-supported') || msg.includes('popup-blocked')) msg = "Browser prevented popup. Try Email login.";
                setLocalError(msg);
            })} 
            className="w-full py-3.5 bg-white text-slate-900 rounded-xl font-bold uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-3 shadow-xl active:scale-[0.97] transition-all group relative z-10 overflow-hidden hover:bg-slate-50"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="G" />
            <span>Continue with Google</span>
          </button>

          <div className="mt-8 text-center relative z-10">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
               {authMode === 'SIGNUP' ? 'Already joined?' : "Don't have an account?"}
               <button 
                onClick={() => setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')} 
                className="ml-2 text-indigo-400 font-black underline underline-offset-8 decoration-indigo-500/40 hover:text-indigo-300 transition-colors"
               >
                 {authMode === 'SIGNUP' ? 'Sign In' : "Create Account"}
               </button>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
