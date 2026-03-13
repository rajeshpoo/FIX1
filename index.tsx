
import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; 

// PWA & Messaging Service Worker Registration
const registerServiceWorker = () => {
  const isSecureProtocol = window.location.protocol === 'https:' || window.location.protocol === 'http:';
  
  if ('serviceWorker' in navigator && isSecureProtocol) {
    const swUrl = './firebase-messaging-sw.js';

    navigator.serviceWorker.register(swUrl)
      .then((reg) => {
        console.log('Service Worker registered. Scope:', reg.scope);
        
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content available; please refresh.');
              }
            };
          }
        };

        return reg;
      })
      .catch((err) => {
        console.debug('Service Worker registration skipped or failed:', err);
        return null;
      });

    (window as any).swRegistrationPromise = navigator.serviceWorker.ready;
  } else {
      console.log('Service Worker skipped: Not supported or non-HTTP environment.');
  }
};

window.addEventListener('load', () => {
  registerServiceWorker();
});


// Global Error Handler
window.onerror = function(message, source, lineno, colno, error) {
  if (message && typeof message === 'string' && message.includes('ResizeObserver loop')) {
      return true;
  }
  console.error("Uncaught global error:", { message, source, lineno, colno, error });
};

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: any; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: any): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      // Force remove splash screen if error occurs
      const splash = document.getElementById('splash-screen');
      if (splash) splash.style.display = 'none';

      return (
        <div style={{padding: 24, color: 'white', background: '#0f172a', minHeight: '100vh', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
          <h1 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '16px'}}>System Interrupted</h1>
          <p style={{color: '#94a3b8', marginBottom: '24px'}}>The app could not initialize required components.</p>
          <pre style={{textAlign:'left', background:'#1e293b', padding:10, borderRadius:8, fontSize:10, marginBottom:20, maxWidth:'100%', overflow:'auto'}}>
              {this.state.error?.toString()}
          </pre>
          <button onClick={() => {
             const win = window as any;
             if (win.caches) {
               win.caches.keys().then((names: string[]) => Promise.all(names.map((name: string) => win.caches.delete(name))))
               .then(() => win.location.reload());
             } else {
               win.location.reload();
             }
          }} style={{background: '#ef4444', border: 'none', color: 'white', padding: '16px 32px', borderRadius: '16px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', textTransform:'uppercase'}}>Hard Reset</button>
        </div>
      );
    }
    return (this as any).props.children; 
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);

// NOTE: Splash screen is now handled by App.tsx to ensure Auth state is ready before showing UI
// We removed the fixed setTimeout here.

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
