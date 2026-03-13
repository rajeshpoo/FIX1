
import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, ChevronRight, Settings, Smartphone, Power } from 'lucide-react';
import { createPortal } from 'react-dom';

const MANUFACTURERS = {
    XIAOMI: {
        name: 'Xiaomi / Redmi / POCO',
        keywords: ['xiaomi', 'redmi', 'poco', 'miui'],
        steps: [
            'Go to "Security" App',
            'Tap "Permissions"',
            'Tap "Auto-start"',
            'Find "FleetDost" and Turn ON toggle'
        ]
    },
    OPPO: {
        name: 'Oppo / Realme',
        keywords: ['oppo', 'realme', 'coloros'],
        steps: [
            'Open "Phone Manager"',
            'Tap "Privacy Permissions"',
            'Tap "Startup Manager"',
            'Turn ON toggle for "FleetDost"'
        ]
    },
    VIVO: {
        name: 'Vivo / iQOO',
        keywords: ['vivo', 'iqoo', 'funtouch'],
        steps: [
            'Open "iManager" App',
            'Tap "App Manager"',
            'Tap "Autostart Manager"',
            'Enable "FleetDost"'
        ]
    },
    ONEPLUS: {
        name: 'OnePlus',
        keywords: ['oneplus', 'oxygen'],
        steps: [
            'Go to Settings > Battery',
            'Tap "Battery Optimization"',
            'Find "FleetDost"',
            'Select "Don\'t Optimize"'
        ]
    },
    SAMSUNG: {
        name: 'Samsung',
        keywords: ['samsung'],
        steps: [
            'Go to Settings > Apps',
            'Find "FleetDost"',
            'Battery > Allow Background Activity',
            'Select "Unrestricted"'
        ]
    }
};

export const AutoStartPermission: React.FC<{ onGranted: () => void }> = ({ onGranted }) => {
    const [deviceType, setDeviceType] = useState<keyof typeof MANUFACTURERS | 'GENERIC'>('GENERIC');
    const [step, setStep] = useState(1);

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        let detected: keyof typeof MANUFACTURERS | 'GENERIC' = 'GENERIC';

        // Simple Heuristic Detection
        if (ua.includes('redmi') || ua.includes('miui') || ua.includes('xiaomi')) detected = 'XIAOMI';
        else if (ua.includes('oppo') || ua.includes('realme')) detected = 'OPPO';
        else if (ua.includes('vivo')) detected = 'VIVO';
        else if (ua.includes('oneplus')) detected = 'ONEPLUS';
        else if (ua.includes('samsung')) detected = 'SAMSUNG';

        setDeviceType(detected);
    }, []);

    const currentGuide = MANUFACTURERS[deviceType as keyof typeof MANUFACTURERS] || {
        name: 'Android Device',
        steps: [
            'Open Settings > Apps',
            'Find "FleetDost"',
            'Enable "Autostart" or "Background Run"',
            'Set Battery to "Unrestricted"'
        ]
    };

    const handleOpenSettings = () => {
        // Just simulate the action as we can't deep link to specific settings pages from web reliably
        // User has to do it manually following instructions.
        setStep(2);
    };

    const handleConfirm = () => {
        localStorage.setItem('autostart_granted', 'true');
        onGranted();
    };

    return createPortal(
        <div className="fixed inset-0 z-[11000] bg-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in font-sans">
            {/* Background Pulse */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-600/20 rounded-full blur-[100px] animate-pulse"></div>

            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/20">
                        <Power size={36} className="text-white animate-pulse" strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-3">
                        Action Required
                    </h2>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed px-2">
                        To receive alerts when app is closed, you <span className="text-red-400 font-bold">MUST</span> enable Auto Start.
                    </p>
                </div>

                {/* Device Detection Badge */}
                <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
                        <Smartphone size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {currentGuide.name} Detected
                        </span>
                    </div>
                </div>

                {/* Steps */}
                <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 space-y-4 mb-8">
                    {currentGuide.steps.map((text, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                {i + 1}
                            </div>
                            <p className="text-xs font-bold text-slate-300">{text}</p>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {step === 1 ? (
                        <button 
                            onClick={handleOpenSettings}
                            className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <Settings size={16} /> Open Settings Now
                        </button>
                    ) : (
                        <button 
                            onClick={handleConfirm}
                            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all animate-pop-in"
                        >
                            <CheckCircle2 size={16} /> I Have Enabled It
                        </button>
                    )}
                    
                    {step === 1 && (
                        <p className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest mt-4">
                            Step 1 of 2
                        </p>
                    )}
                    {step === 2 && (
                        <button onClick={() => setStep(1)} className="w-full py-3 text-slate-500 font-black text-[9px] uppercase tracking-widest">
                            Show Instructions Again
                        </button>
                    )}
                </div>

            </div>
        </div>
    , document.body);
};
