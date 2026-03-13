
import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Activity, Radio, Sparkles, Volume2, MessageSquare, BrainCircuit, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { askGeminiAI } from '../services/firebaseService';
import { Vehicle, Trip, LedgerAccount, Bilty } from '../types';
import { getIndianDate } from '../utils/helpers';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

interface AssistantProps {
  onNavigate: (view: any, query?: string) => void;
  onAction: (action: string, data?: any) => void;
  vehicles?: Vehicle[];
  trips?: Trip[];
  accounts?: LedgerAccount[];
  bilties?: Bilty[];
}

// --- SYSTEM PERSONA & INTELLIGENCE CONFIG ---
const SYSTEM_PERSONA = `
IDENTITY: You are the 'FleetDost Manager', a smart AI assistant for transport business.
CREATOR: You were developed by "Rajesh Poonia". If asked who made you or who is the developer, PROUDLY say "Rajesh Poonia".
LANGUAGE: Mix of Hindi and English (Hinglish). Example: "Aapki 3 gadiyan expired hain."
TONE: Professional, Loyal, Efficient. Like a trusted Munim ji.
MEMORY: Use the provided CHAT HISTORY to understand context (e.g., "uska", "wo", "previous").
`;

const FORM_SCHEMAS = {
    BILTY: [
        { key: 'vehicleNumber', label: 'Truck Number', question: 'Kaunsi gadi (Truck Number) load ho rahi hai?' },
        { key: 'date', label: 'Loading Date', question: 'Loading ki date aaj ki rakhni hai ya koi aur?' },
        { key: 'fromStation', label: 'From', question: 'Maal kahan se uthaya (From Station)?' },
        { key: 'toStation', label: 'To', question: 'Kahan deliver hoga (To Station)?' },
        { key: 'consignorName', label: 'Consignor', question: 'Bhej ne wali party (Consignor) ka naam?' },
        { key: 'consigneeName', label: 'Consignee', question: 'Paane wali party (Consignee) ka naam?' },
        { key: 'itemDetails.description', label: 'Goods', question: 'Maal (Item) kya hai?' },
        { key: 'itemDetails.weight', label: 'Weight', question: 'Vazan (Weight) kitna hai?' },
        { key: 'itemDetails.packages', label: 'Packages', question: 'Kitne packet/nag (Packages) hain?' },
        { key: 'freight.amount', label: 'Freight', question: 'Total Bhada (Freight) kitna tay hua?' },
        { key: 'invoiceNo', label: 'Invoice No', question: 'Party ka Invoice Number kya hai (agar hai to)?' },
        { key: 'driverName', label: 'Driver Name', question: 'Driver ka naam kya hai?' },
        { key: 'driverMobile', label: 'Driver Mobile', question: 'Driver ka mobile number?' },
        { key: 'brokerName', label: 'Broker Name', question: 'Kya isme koi Broker hai? Agar hai to naam bataiye.' },
    ],
    TRIP: [
        { key: 'vehicleNumber', label: 'Vehicle', question: 'Kis gadi ki trip start karni hai?' },
        { key: 'driver', label: 'Driver', question: 'Driver ka naam?' },
        { key: 'from', label: 'From', question: 'Loading kahan se hui?' },
        { key: 'to', label: 'To', question: 'Unloading kahan hogi?' },
        { key: 'party', label: 'Party', question: 'Party ka naam?' },
        { key: 'freight', label: 'Freight', question: 'Bhada kitna tay hua?' },
        { key: 'advance', label: 'Advance', question: 'Kuch advance mila hai?' }
    ]
};

export const AIAssistant: React.FC<AssistantProps> = ({ onNavigate, vehicles = [], trips = [], accounts = [] }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('Ready');
  const [fullResponseText, setFullResponseText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // STATE MACHINE & MEMORY
  const [mode, setMode] = useState<'IDLE' | 'BILTY' | 'TRIP'>('IDLE');
  const [draftData, setDraftData] = useState<any>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [autoLoop, setAutoLoop] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]); // MEMORY

  // DRAGGABLE STATE
  const [pos, setPos] = useState({ x: typeof window !== 'undefined' ? window.innerWidth - 80 : 0, y: typeof window !== 'undefined' ? window.innerHeight - 150 : 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimer = useRef<any>(null);

  const generateSystemContext = () => {
      const vehicleSummary = vehicles.map(v => `${v.number} (${v.ownerName})`).join(', ');
      const ledgerSummary = accounts
          .sort((a,b) => b.lastUpdated - a.lastUpdated)
          .slice(0, 8)
          .map(a => `${a.name}: ₹${Math.abs(a.balance)} ${a.balance > 0 ? 'Dr' : 'Cr'}`)
          .join('\n');
      const activeTrips = trips
          .filter(t => t.status === 'RUNNING')
          .slice(0, 3)
          .map(t => `${t.vehicleNumber}: ${t.route.from}->${t.route.to}`)
          .join('\n');

      return `
        LIVE APP DATA (Read Only):
        VEHICLES: [${vehicleSummary || 'None'}]
        LEDGERS: [${ledgerSummary || 'None'}]
        ACTIVE TRIPS: [${activeTrips || 'None'}]
      `;
  };

  useEffect(() => {
    // Only Setup Web Speech if NOT on Native Platform
    if (!Capacitor.isNativePlatform()) {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false; 
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-IN'; // Recognizing Indian English helps with Hinglish

            recognitionRef.current.onresult = (event: any) => {
                let liveTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                liveTranscript += event.results[i][0].transcript;
                }
                setTranscript(liveTranscript);
                setErrorMsg(null);
                
                clearTimeout(silenceTimer.current);

                if (event.results[0].isFinal && liveTranscript.length > 1) {
                    recognitionRef.current.stop();
                    processWithGemini(liveTranscript);
                } else {
                    silenceTimer.current = setTimeout(() => {
                        if (liveTranscript.length > 2) {
                            recognitionRef.current.stop(); 
                            processWithGemini(liveTranscript);
                        }
                    }, 700); 
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                // Web Auto-loop logic
                if (autoLoop && !processing && !isSpeaking && !isConfirming && isOpen && !errorMsg) {
                    setTimeout(() => {
                        try { 
                            if (!isSpeaking && isOpen) { 
                                recognitionRef.current.start(); 
                                setIsListening(true); 
                                setAiFeedback("Listening..."); 
                            }
                        } catch(e) {}
                    }, 300);
                }
            };
            
            recognitionRef.current.onerror = (e: any) => {
                console.log("Mic Error", e);
                setIsListening(false);
                if (autoLoop && e.error === 'no-speech') {
                    setTimeout(() => { try{recognitionRef.current.start(); setIsListening(true);}catch(x){} }, 500);
                }
            };
        }
    } else {
        // NATIVE SETUP (ANDROID)
        SpeechRecognition.requestPermissions().catch(e => console.warn("Speech permission denied", e));
    }
  }, [transcript, processing, mode, draftData, autoLoop, isSpeaking, isConfirming, isOpen, errorMsg]);

  // Handle Resize to keep button in view
  useEffect(() => {
      const handleResize = () => {
          setPos(p => {
              const maxX = window.innerWidth - 70;
              const maxY = window.innerHeight - 70;
              return { x: Math.min(p.x, maxX), y: Math.min(p.y, maxY) };
          });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const speakResponse = async (text: string) => {
      // 1. Native TTS
      if (Capacitor.isNativePlatform()) {
          try {
              await TextToSpeech.speak({
                  text: text,
                  lang: 'hi-IN',
                  rate: 1.0,
                  pitch: 1.0,
                  volume: 1.0,
                  category: 'ambient',
              });
              // Native doesn't give precise onEnd, so we approximate or wait for promise
              // Auto-loop logic for native needs to be simpler or handled via UI button
              return; 
          } catch(e) {
              console.warn("Native TTS failed, falling back", e);
          }
      }

      // 2. Web TTS
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel(); 

      const wasAutoLoop = autoLoop;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1; 
      utterance.pitch = 1.0;
      utterance.lang = 'hi-IN'; // Hindi voice preference

      utterance.onstart = () => {
          setIsSpeaking(true);
          if (isListening && !Capacitor.isNativePlatform()) {
              recognitionRef.current?.stop();
          } 
      };
      
      utterance.onend = () => {
          setIsSpeaking(false);
          // Resume listening after speaking (Web Only)
          if (wasAutoLoop && !isConfirming && isOpen && !errorMsg && !Capacitor.isNativePlatform()) {
              setAiFeedback("Listening...");
              setTimeout(() => {
                  try { 
                      recognitionRef.current.start(); 
                      setIsListening(true); 
                  } catch(e){}
              }, 200);
          }
      };
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google हिन्दी') || v.lang.includes('hi-IN'));
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
  };

  const startNativeListening = async () => {
      try {
          setIsListening(true);
          setTranscript('');
          
          await SpeechRecognition.start({
              language: "en-IN",
              maxResults: 1,
              prompt: "Speak now...",
              partialResults: true,
              popup: false,
          });

          SpeechRecognition.addListener('partialResults', (data: any) => {
              if (data.matches && data.matches.length > 0) {
                  setTranscript(data.matches[0]);
              }
          });
      } catch (e) {
          console.error("Native Speech Error", e);
          setIsListening(false);
          setErrorMsg("Mic Error");
      }
  };

  const stopNativeListening = async () => {
      try {
          await SpeechRecognition.stop();
          setIsListening(false);
          if (transcript.length > 1) {
              processWithGemini(transcript);
          }
      } catch(e) {
          console.error(e);
      }
  };

  const toggleListening = async () => {
    if (isSpeaking) { 
        if (!Capacitor.isNativePlatform()) window.speechSynthesis.cancel(); 
        else await TextToSpeech.stop();
        setIsSpeaking(false); 
        return; 
    }
    
    if (isListening) { 
        if (Capacitor.isNativePlatform()) {
            await stopNativeListening();
        } else {
            recognitionRef.current?.stop(); 
        }
        setIsListening(false); 
        setAutoLoop(false); 
    } else {
      setIsOpen(true);
      setIsMinimized(false);
      setTranscript('');
      setErrorMsg(null);
      setAutoLoop(true); 
      setAiFeedback("Listening...");

      if (Capacitor.isNativePlatform()) {
          startNativeListening();
      } else {
          try { 
              recognitionRef.current.start(); 
              setIsListening(true); 
          } catch(e){
              console.error("Toggle Error", e);
              setErrorMsg("Mic not supported");
          }
      }
    }
  };

  const getNextMissingField = (currentMode: string, currentData: any) => {
      const schema = FORM_SCHEMAS[currentMode as keyof typeof FORM_SCHEMAS];
      if (!schema) return null;
      for (const field of schema) {
          const keys = field.key.split('.');
          let val = currentData;
          for (const k of keys) {
              val = val ? val[k] : undefined;
          }
          if (!val && val !== 0) return field; 
      }
      return null;
  };

  // SUPER INTELLIGENT PROMPT GENERATOR
  const generatePrompt = (text: string, currentHistory: {role: string, text: string}[]) => {
      const missingField = mode !== 'IDLE' ? getNextMissingField(mode, draftData) : null;
      const today = getIndianDate();
      const databaseContext = generateSystemContext();
      
      // Convert history to string format
      const historyStr = currentHistory.slice(-8).map(h => `${h.role === 'user' ? 'USER' : 'AI'}: ${h.text}`).join('\n');

      return `
        ${SYSTEM_PERSONA}

        --- MEMORY (PREVIOUS CONVERSATION) ---
        ${historyStr}
        -------------------------------------

        --- REAL-TIME APP DATA ---
        ${databaseContext}
        --------------------------

        --- CURRENT CONTEXT ---
        USER SAYS: "${text}"
        CURRENT FORM MODE: ${mode}
        MISSING FIELD: ${missingField ? missingField.key : 'NONE'}
        DATE: ${today}

        INSTRUCTIONS:
        1. If user asks "Who are you?" or "Developer?", use SYSTEM_PERSONA.
        2. If user refers to "wo" or "usko" (previous context), check MEMORY.
        3. If mode is active (BILTY/TRIP), extract data for MISSING FIELD.
        4. If user asks about vehicles/ledger, check APP DATA.
        5. Output JSON. "speak" must be in Hinglish.

        OUTPUT JSON FORMAT:
        { "action": "START_BILTY"|"START_TRIP"|"UPDATE"|"QUERY_ANSWER", "extracted": {"key":"value"}, "speak": "Hindi response" }
      `;
  };

  const processWithGemini = async (text: string) => {
      if (!text || text.length < 2 || processing) return;
      setProcessing(true);
      setErrorMsg(null);
      
      // Optimistic History Update
      const newHistory = [...chatHistory, { role: 'user' as const, text }];
      setChatHistory(newHistory);
      
      try {
          // Pass the updated history to the prompt generator
          const prompt = generatePrompt(text, newHistory);
          
          const result: any = await askGeminiAI(prompt);
          
          let nextMode = mode;
          let replyText = result.speak || "Okay, main samajh gaya.";
          
          const mergeDeep = (target: any, updates: any) => {
              const newObj = { ...target };
              for (const key in updates) {
                  if (key.includes('.')) {
                      const [parent, child] = key.split('.');
                      newObj[parent] = { ...newObj[parent], [child]: updates[key] };
                  } else {
                      newObj[key] = updates[key];
                  }
              }
              return newObj;
          };

          if (result.action === 'QUERY_ANSWER') {
              // Just a question, no mode change
              setFullResponseText(replyText);
              speakResponse(replyText);
              setChatHistory(prev => [...prev, { role: 'model', text: replyText }]);
              setProcessing(false);
              return; 
          }

          let currentDraft = mergeDeep(draftData, result.extracted || {});

          if (result.action === 'START_BILTY') {
              nextMode = 'BILTY'; 
              currentDraft = {};
              replyText = "Ji, Bilty banate hain. " + FORM_SCHEMAS.BILTY[0].question;
              onNavigate('bilty');
              setTimeout(() => window.dispatchEvent(new CustomEvent('bilty-open-create')), 300);
          } else if (result.action === 'START_TRIP') {
              nextMode = 'TRIP';
              currentDraft = {};
              onNavigate('trips');
          }

          // Emit updates to the app forms
          if (result.extracted && Object.keys(result.extracted).length > 0) {
              const eventName = nextMode === 'BILTY' ? 'bilty-update-data' : 'trip-update-data';
              window.dispatchEvent(new CustomEvent(eventName, { detail: result.extracted }));
          }

          if (nextMode !== 'IDLE') {
              const nextField = getNextMissingField(nextMode, currentDraft);
              if (nextField) {
                  if (!result.speak || result.speak.includes("check")) {
                      replyText = "Note kiya. " + nextField.question;
                  }
              } else {
                  replyText = "Details complete ho gayi hain. Kripya Save dabayein.";
                  setIsConfirming(true);
                  setAutoLoop(false); 
              }
          }

          setMode(nextMode);
          setDraftData(currentDraft);
          setFullResponseText(replyText);
          
          // Update AI History
          setChatHistory(prev => [...prev, { role: 'model', text: replyText }]);
          
          speakResponse(replyText);

      } catch (e: any) {
          console.error("AI Error Full:", e);
          setAutoLoop(false);
          
          let userMsg = "Network weak hai. Dobara bole.";
          let detail = "Connection Error";

          if (e.message && e.message.includes('fetch')) {
              userMsg = "Internet check karein.";
              detail = "Network";
          } else if (e.message?.includes('429')) {
              userMsg = "Quota exceeded.";
              detail = "Quota 429";
          } else if (e.message?.includes('internal')) {
              userMsg = "Server Error.";
              detail = "Cloud Fn Error";
          }

          setErrorMsg(detail);
          speakResponse(userMsg);
      } finally {
          setProcessing(false);
      }
  };

  const handleManualConfirm = () => {
      setMode('IDLE');
      setDraftData({});
      setIsConfirming(false);
      setIsMinimized(true);
      setAutoLoop(false);
      speakResponse("Done.");
  };

  const handleClose = () => {
      setMode('IDLE');
      setDraftData({});
      setIsConfirming(false);
      setIsOpen(false);
      setIsListening(false);
      setAutoLoop(false);
      setErrorMsg(null);
      setChatHistory([]); // Reset short-term memory on close to keep sessions clean
      if (!Capacitor.isNativePlatform()) window.speechSynthesis.cancel();
  };

  // --- DRAG HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
      setIsDragging(true);
      hasMovedRef.current = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      dragStartRef.current = { x: clientX, y: clientY };
      startPosRef.current = { ...pos };
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDragging) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;

      // Small threshold to prevent jitter
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          hasMovedRef.current = true;
          setPos({
              x: startPosRef.current.x + dx,
              y: startPosRef.current.y + dy
          });
      }
  };

  const handleTouchEnd = () => {
      setIsDragging(false);
      if (hasMovedRef.current) {
          hasMovedRef.current = false;
          const screenW = window.innerWidth;
          const btnSize = 56; 
          const margin = 16;
          let newX = pos.x;
          let newY = pos.y;
          if (newX + btnSize / 2 < screenW / 2) newX = margin;
          else newX = screenW - btnSize - margin;
          setPos({ x: newX, y: newY });
          return; 
      }
      toggleListening();
  };

  if (!isOpen) {
      return (
        <button 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={() => isDragging && handleTouchEnd()}
            style={{ 
                position: 'fixed', 
                left: pos.x, 
                top: pos.y, 
                transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                touchAction: 'none',
                zIndex: 5000
            }}
            className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white dark:border-slate-900 group active:scale-95"
        >
            {isSpeaking ? <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse opacity-75"></div> : <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-75"></div>}
            <BrainCircuit size={24} strokeWidth={2} className="relative z-10" />
        </button>
      );
  }

  return (
    <div className={`fixed inset-x-0 bottom-0 z-[9000] flex flex-col justify-end pointer-events-none transition-all duration-300 ${isMinimized ? 'h-32' : 'h-full bg-slate-900/40 backdrop-blur-sm'}`}>
        {!isMinimized && <div className="absolute inset-0 pointer-events-auto" onClick={() => setIsMinimized(true)} />}
        <div className={`relative w-full bg-white dark:bg-slate-950 rounded-t-[2.5rem] shadow-2xl border-t border-slate-200 dark:border-white/10 pointer-events-auto overflow-hidden transition-all duration-300 ${isMinimized ? 'h-28 opacity-95' : 'pb-8 pt-6 px-6'}`}>
            {processing && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[shimmer_1s_infinite]"></div>}
            
            {isMinimized ? (
                <div className="flex items-center justify-between px-6 h-full cursor-pointer" onClick={() => setIsMinimized(false)}>
                    <div className="flex items-center gap-4 w-full">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isSpeaking ? 'bg-emerald-500 animate-pulse' : errorMsg ? 'bg-red-500' : 'bg-indigo-600'} text-white`}>
                            {errorMsg ? <AlertTriangle size={24} /> : isSpeaking ? <Volume2 size={24} /> : <Activity size={24} />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Manager AI</p>
                            <p className={`text-sm font-bold truncate pr-4 ${errorMsg ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{errorMsg ? `Error: ${errorMsg}` : (fullResponseText || aiFeedback)}</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full shrink-0"><X size={20}/></button>
                </div>
            ) : (
                <div className="flex flex-col items-center w-full max-w-sm mx-auto animate-slide-up">
                    <div className="flex justify-between items-center w-full mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${processing ? 'bg-indigo-600 text-white' : errorMsg ? 'bg-red-500 text-white' : isSpeaking ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                {errorMsg ? <AlertTriangle size={20} /> : processing ? <Sparkles size={20} className="animate-spin" /> : isSpeaking ? <Volume2 size={20} className="animate-pulse" /> : <Activity size={20} />}
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">Senior Manager</h3>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${errorMsg ? 'text-red-500' : 'text-slate-400'}`}>
                                    {errorMsg ? errorMsg : (mode === 'IDLE' ? 'Ready for Command' : `Drafting ${mode}`)}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsMinimized(true)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><ChevronDown size={18} /></button>
                            <button onClick={handleClose} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={18} /></button>
                        </div>
                    </div>

                    {isConfirming ? (
                        <div className="w-full bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] p-6 border-2 border-emerald-500/20 animate-pop-in mb-4 text-center">
                            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Form Completed!</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6">All details have been filled. Please verify and click the Save button on the form.</p>
                            <button onClick={handleManualConfirm} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                                OK, I Will Save
                            </button>
                        </div>
                    ) : (
                        <div className={`w-full min-h-[140px] flex flex-col items-center justify-center text-center p-5 rounded-[2rem] mb-6 border-2 border-dashed transition-all relative overflow-hidden ${errorMsg ? 'bg-red-50 border-red-200' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                            {autoLoop && !errorMsg && <div className="absolute top-0 right-0 p-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div></div>}
                            
                            {fullResponseText || errorMsg ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <div className={`flex gap-3 text-left w-full p-3 rounded-xl shadow-sm ${errorMsg ? 'bg-red-100' : 'bg-white dark:bg-slate-800'}`}>
                                        <div className={`p-1.5 rounded-lg h-fit ${errorMsg ? 'bg-red-200 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}><MessageSquare size={14}/></div>
                                        <p className={`text-sm font-bold leading-relaxed whitespace-pre-line animate-fade-in ${errorMsg ? 'text-red-700' : 'text-slate-800 dark:text-slate-200'}`}>{errorMsg ? "Error: Check Internet or API Key." : fullResponseText}</p>
                                    </div>
                                    {transcript && (
                                        <div className="flex gap-2 text-right w-full justify-end mt-2">
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg inline-block">"{transcript}"</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center opacity-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Listening for commands...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!isConfirming && (
                        <button onClick={toggleListening} className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all shadow-xl mb-4 ${isListening ? 'bg-red-500 text-white scale-110 shadow-red-500/40 ring-4 ring-red-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/40'}`}>
                            {isListening ? <Radio size={32} className="animate-pulse" /> : <Mic size={32} />}
                        </button>
                    )}
                    
                    {!isConfirming && isListening && (
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Auto-Mic Active</p>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
