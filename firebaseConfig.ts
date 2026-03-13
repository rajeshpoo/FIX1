import { initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// ✅ FIX: Hardcoded fallback values hataye — env variables se hi chalega
// Agar koi variable missing ho toh startup par clear error aayega
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Dev environment mein missing vars ka pata chalega turant
if (import.meta.env.DEV) {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => `VITE_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
  if (missing.length > 0) {
    console.error(`❌ Missing Firebase env vars:\n${missing.join('\n')}\n.env.local file check karo.`);
  }
}

export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

export const useMock = false;

const app = initializeApp(firebaseConfig);

// App Check initialization
if (typeof window !== 'undefined' && recaptchaSiteKey) {
  try {
    if (location.hostname === 'localhost') {
      // @ts-ignore
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    console.log('App Check initialized');
  } catch (e) {
    console.warn('App Check init failed:', e);
  }
}

export const auth = firebaseAuth.getAuth(app);
export const googleProvider = new firebaseAuth.GoogleAuthProvider();
export const functions = getFunctions(app, 'asia-south1');
export const storage = getStorage(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

let messagingInstance = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messagingInstance = getMessaging(app);
  }
} catch (err) {
  console.warn('Messaging initialization skipped.');
}
export const messaging = messagingInstance;
