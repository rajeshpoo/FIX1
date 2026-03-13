
import React, { useEffect } from 'react';
import { X, ArrowLeft, MessageCircle, Shield, FileText, CheckCircle, Globe, Truck, Zap, AlertCircle, Database, Camera, Lock, User, RefreshCw, Server, Gavel, Eye } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Updated Number
const DEV_PHONE = "917852005541"; 

const PolicyModalBase: React.FC<ModalProps & { title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-pop-in border border-slate-200 dark:border-slate-800">
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
      <div className="text-indigo-600 dark:text-indigo-400">{icon}</div>
      <h4 className="font-black uppercase text-[10px] tracking-widest">{title}</h4>
    </div>
    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-6 leading-5">
      {children}
    </div>
  </div>
);

export const AboutModal: React.FC<ModalProps> = ({ isOpen, onClose }) => (
  <PolicyModalBase isOpen={isOpen} onClose={onClose} title="About FleetDost">
    <div className="flex flex-col items-center text-center mb-8">
      <div className="bg-indigo-600 rounded-[1.5rem] p-4 shadow-glow mb-6">
        <Truck size={40} className="text-white" />
      </div>
      <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">FleetDost</h3>
      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">Cloud Edition v1.4.2</p>
    </div>

    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-red-500" />
          <h4 className="text-[10px] font-black uppercase tracking-widest">Our Mission</h4>
        </div>
        <p className="font-bold text-slate-700 dark:text-slate-300 italic">"Digitizing India's Transport Business."</p>
        <p className="mt-4">FleetDost is designed to help transport owners manage their vehicle documents effortlessly, preventing heavy RTO fines through real-time smart alerts.</p>
      </div>

      <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-10"><Zap size={80}/></div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-4">Developer</h4>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-white">RP</div>
          <div>
            <p className="font-black text-base">Rajesh Poonia</p>
            <p className="text-xs text-indigo-200">Full Stack Engineer</p>
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-xs font-bold text-indigo-300">
          <span className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"><Globe size={12}/> Portfolio</span>
          <span 
             onClick={() => window.open(`https://wa.me/${DEV_PHONE}?text=Hi Rajesh, I need support with FleetDost App.`, '_blank')}
             className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
          >
             <MessageCircle size={12}/> WhatsApp
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Platform Capabilities</h4>
        <div className="grid grid-cols-2 gap-2">
          {['Cloud Sync', 'OCR Scan', 'Smart Alerts', 'Secure DB'].map(feat => (
            <div key={feat} className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-bold">
              <CheckCircle size={12} className="text-indigo-500" /> {feat}
            </div>
          ))}
        </div>
      </div>
    </div>
    <p className="mt-12 text-center text-[9px] font-black uppercase tracking-widest opacity-40">Handcrafted in Rajasthan, India 🇮🇳</p>
  </PolicyModalBase>
);

export const PrivacyPolicyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => (
  <PolicyModalBase isOpen={isOpen} onClose={onClose} title="Privacy Policy">
    <div className="mb-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Last Updated: 1 January 2026</p>
      <p className="mt-2 text-xs">Developer <span className="font-bold text-slate-900 dark:text-white">Rajesh Poonia</span> respects your privacy. This policy explains how we handle your data.</p>
    </div>

    <Section icon={<User size={14} />} title="1. Information Collection">
      We collect minimal personal information (Name, Email, Phone Number) via Google Login to create your account. We also collect the Fleet Data (Vehicle Numbers, Document Expiry Dates, Owner Names) that you explicitly enter into the app.
    </Section>

    <Section icon={<Database size={14} />} title="2. Use of Information">
      Your data is used exclusively for:
      <ul className="list-disc pl-4 mt-1 space-y-1">
        <li>Providing real-time document expiry alerts.</li>
        <li>Synchronizing your fleet data across your devices via Cloud.</li>
        <li>Generating reports (PDF/Excel) requested by you.</li>
      </ul>
    </Section>

    <Section icon={<Server size={14} />} title="3. Storage & Security">
      <p>Your data is stored safely in Google Firebase Cloud Database. We implement standard security measures to protect your information.</p>
      <p className="mt-1">We do <span className="font-bold">not</span> sell, trade, or rent your personal identification information to others.</p>
    </Section>

    <Section icon={<Camera size={14} />} title="4. Permissions">
      <p><span className="font-bold">Camera:</span> Required only if you use the OCR feature to scan vehicle number plates.</p>
      <p><span className="font-bold">Notifications:</span> Required to send you daily alerts about expiring documents.</p>
    </Section>

    <Section icon={<Lock size={14} />} title="5. Data Control & Deletion">
      You retain full ownership of your data. You can export your data at any time. You can also permanently delete your account and all associated data via the "Factory Reset" option in Settings.
    </Section>

    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-900/30 mt-6">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-2"><MessageCircle size={14}/> Contact Us</h4>
      <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">For any privacy-related questions, please contact the developer:</p>
      <button 
         onClick={() => window.open(`https://wa.me/${DEV_PHONE}?text=Hi, I have a question regarding FleetDost Privacy Policy.`, '_blank')}
         className="mt-4 w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
      >
        <MessageCircle size={14}/> Contact on WhatsApp
      </button>
    </div>
  </PolicyModalBase>
);

export const TermsConditionsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => (
  <PolicyModalBase isOpen={isOpen} onClose={onClose} title="Terms & Conditions">
    <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">By using <span className="font-bold text-slate-900 dark:text-white">FleetDost</span>, you agree to these terms.</p>
    </div>

    <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-[1.5rem] border border-orange-100 dark:border-orange-900/30 mb-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2 flex items-center gap-2"><AlertCircle size={14}/> Reminder Tool Only</h4>
        <p className="text-xs text-orange-900 dark:text-orange-200 font-bold leading-relaxed">
            FleetDost is strictly a supportive reminder tool. It is the user's sole responsibility to ensure actual vehicle documents are valid and renewed on time.
        </p>
    </div>

    <Section icon={<FileText size={14} />} title="1. Accuracy of Data">
        Users are responsible for ensuring the accuracy of the dates and vehicle numbers entered. The Developer is not liable for any errors in data entry that lead to missed renewals.
    </Section>

    <Section icon={<Shield size={14} />} title="2. Limitation of Liability">
        <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">NO LIABILITY FOR FINES:</p>
        Rajesh Poonia (Developer) shall not be held liable for any direct, indirect, or incidental damages, including but not limited to RTO challans, fines, or business losses arising from the use or failure of this app.
    </Section>

    <Section icon={<CheckCircle size={14} />} title="3. Usage Rights">
        You are granted a limited, non-exclusive, non-transferable license to use the App for personal or business fleet management purposes. You agree not to reverse-engineer or attempt to extract the source code.
    </Section>

    <Section icon={<RefreshCw size={14} />} title="4. Service Availability">
        While we strive for 100% uptime, the app relies on third-party services (Google Cloud). We do not guarantee uninterrupted service and are not responsible for data unavailability during server outages.
    </Section>

    <Section icon={<Gavel size={14} />} title="5. Governing Law">
        These terms shall be governed by the laws of India. Any disputes arising out of the use of this application shall be subject to the jurisdiction of courts in Rajasthan, India.
    </Section>

    <Section icon={<Eye size={14} />} title="6. Modifications">
        The developer reserves the right to modify these terms or update app features without prior notice to improve security and user experience. Continued use implies acceptance of the new terms.
    </Section>
  </PolicyModalBase>
);
