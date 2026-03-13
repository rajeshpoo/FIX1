
// ... existing imports ...
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  onAuthStateChanged, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  updateProfile,
  User,
  reload,
  linkWithPopup,
  PhoneAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  ConfirmationResult
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, googleProvider, messaging, functions, vapidKey, storage } from '../firebaseConfig';
import { UserProfile, Vehicle, Trip, LedgerAccount, LedgerTransaction, Bilty, FirebaseUser, TripExpense, AppNotification, SystemBroadcast } from '../types';
import { addToQueue, getQueue, removeFromQueue } from '../utils/offlineSync';
import { getApiUrl } from '../utils/helpers';

// --- UTILS ---

export const notify = (title: string, body: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const event = new CustomEvent('fleetdost-toast', { detail: { title, body, type } });
  window.dispatchEvent(event);
};

// ... existing AUTH, LINKING functions ...
// (Keeping all existing exports identical)

export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);

export const registerWithEmail = async (email: string, pass: string, name: string, phone: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(cred.user, { displayName: name });
  
  const userProfile: UserProfile = {
    uid: cred.user.uid,
    displayName: name,
    email: email,
    phoneNumber: phone,
    photoURL: null,
    role: 'user',
    isBanned: false,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    planType: 'FREE'
  };
  await setDoc(doc(db, 'users', cred.user.uid), userProfile as any);
  await sendEmailVerification(cred.user);
  return cred.user;
};

// PURE WEB GOOGLE LOGIN
export const loginWithGoogle = async () => {
  try {
      console.log("Starting Web Google Login...");
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check or Create User Profile
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        const userProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          photoURL: user.photoURL,
          role: 'user',
          isBanned: false,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          planType: 'FREE'
        };
        await setDoc(userRef, userProfile as any);
      } else {
          await updateDoc(userRef, { lastLogin: Date.now() });
      }
      return user;
  } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
          throw new Error("Sign-in cancelled.");
      }
      console.error("Google Login Error:", error);
      throw error;
  }
};

export const logoutUser = async () => {
    await signOut(auth);
};

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

export const checkUserExistsAndActive = async (user: FirebaseUser) => {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists() && snap.data().isBanned) {
        await signOut(auth);
        throw new Error("Account Suspended");
    }
};

export const reloadCurrentUser = async () => {
    if (auth.currentUser) {
        await reload(auth.currentUser);
        return auth.currentUser;
    }
    return null;
};

export const resendVerificationEmail = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
};

export const setupRecaptcha = (containerId: string) => {
  // @ts-ignore
  if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
  const verifier = new RecaptchaVerifier(auth, containerId, {
    'size': 'invisible',
    'callback': () => {}
  });
  // @ts-ignore
  window.recaptchaVerifier = verifier;
  return verifier;
};

export const destroyRecaptcha = () => {
  // @ts-ignore
  const verifier = window.recaptchaVerifier;
  if (verifier) verifier.clear();
  // @ts-ignore
  window.recaptchaVerifier = null;
  const container = document.getElementById('recaptcha-container');
  if (container) container.innerHTML = '';
};

export const sendOtpToPhone = async (phone: string, verifier: any) => {
  return await signInWithPhoneNumber(auth, phone, verifier);
};

export const verifyOtpOnly = async (confirmationResult: ConfirmationResult, otp: string) => { 
  const result = await confirmationResult.confirm(otp);
  return result.user as FirebaseUser;
};

export const createProfileForPhoneUser = async (user: FirebaseUser) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const newUser: UserProfile = {
      uid: user.uid,
      displayName: "Mobile User",
      email: null,
      phoneNumber: user.phoneNumber,
      photoURL: null,
      role: 'user',
      isBanned: false,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      planType: 'FREE'
    };
    await setDoc(userRef, newUser as any);
  }
};

export const updateUserPhoneInDb = async (user: FirebaseUser, phone: string) => {
  await updateDoc(doc(db, 'users', user.uid), { phoneNumber: phone });
};

// --- LINKING ---

export const linkUserWithGoogle = async (user: FirebaseUser) => {
    await linkWithPopup(user as unknown as User, googleProvider);
};

export const linkUserWithPhone = async (user: FirebaseUser, phone: string, verifier: any) => {
    const provider = new PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber(phone, verifier);
    return verificationId;
};

export const confirmPhoneLink = async (user: FirebaseUser, verificationId: string, code: string) => {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    await linkWithCredential(user as unknown as User, credential);
};

// --- GOOGLE DRIVE BACKUP & RESTORE ---

// Helper to get Access Token
const getDriveAccessToken = async () => {
    const driveProvider = new GoogleAuthProvider();
    // Scope for File Listing (Readonly) AND Creating Files (Drive.file)
    driveProvider.addScope('https://www.googleapis.com/auth/drive.file');
    driveProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
    
    // Force re-auth to get fresh token
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    return credential?.accessToken;
};

export const uploadBackupToDrive = async (jsonString: string, fileName: string) => {
    try {
        console.log("Requesting Drive Permission...");
        const accessToken = await getDriveAccessToken();
        if (!accessToken) throw new Error("Failed to get Drive Access Token");

        const metadata = {
            name: fileName,
            mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([jsonString], { type: 'application/json' }));

        console.log("Uploading...");
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form
        });

        if (!response.ok) {
            const errJson = await response.json();
            throw new Error(errJson.error?.message || "Upload Failed");
        }
        return true;
    } catch (error: any) {
        console.error("Drive Upload Error:", error);
        if (error.code === 'auth/popup-closed-by-user') throw new Error("Permission Cancelled");
        throw error;
    }
};

export const listBackupsFromDrive = async () => {
    try {
        const accessToken = await getDriveAccessToken();
        if (!accessToken) throw new Error("Access Denied");

        // Query: Only JSON files, not trashed, name contains FleetDost
        const q = "name contains 'FleetDost' and mimeType = 'application/json' and trashed = false";
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error("Failed to list files");
        
        const data = await response.json();
        return data.files || [];
    } catch (error: any) {
        console.error("List Error:", error);
        throw error;
    }
};

export const downloadBackupFromDrive = async (fileId: string) => {
    try {
        const accessToken = await getDriveAccessToken(); // Note: Re-using token logic might trigger popup if expired. Ideally cache it.
        // For simplicity in this flow, we assume token is valid or user accepts popup.
        
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error("Download Failed");
        return await response.json(); // Returns the JSON content of the file
    } catch (error) {
        console.error("Download Error:", error);
        throw error;
    }
};

// ... existing USER PROFILE, SYSTEM, VEHICLES, TRIPS, LEDGER, TRANSACTIONS, BILTY ...
// (Keeping all existing CRUD functions identical to previous file content)

// --- USER PROFILE ---

export const subscribeToUserProfile = (uid: string, callback: (p: UserProfile | null) => void) => {
    return onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) callback(snap.data() as UserProfile);
        else callback(null);
    }, (error) => {
        console.warn("Profile sync error, treating as null to unblock UI:", error.message);
        callback(null);
    });
};

export const fetchUserProfile = async (uid: string) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() as UserProfile : null;
};

export const updateUserProfile = async (user: FirebaseUser, displayName: string, photoURL: string) => {
    await updateProfile(user as unknown as User, { displayName, photoURL });
    await updateDoc(doc(db, 'users', user.uid), { displayName, photoURL });
};

export const updateUserExpirySettings = async (uid: string, days: number) => {
    await updateDoc(doc(db, 'users', uid), { expiryDays: days });
};

export const updateBusinessProfile = async (uid: string, business: any) => {
    await updateDoc(doc(db, 'users', uid), { business });
};

// --- SYSTEM & UPDATES ---

export const checkAppVersion = async (currentVersion: string) => {
    try {
        const snap = await getDoc(doc(db, 'system', 'metadata'));
        if (snap.exists()) {
            const data = snap.data();
            if (data.latestVersion && data.latestVersion !== currentVersion) {
                return { 
                    updateAvailable: true, 
                    latestVersion: data.latestVersion,
                    url: 'https://fleetdost.in' 
                };
            }
        }
    } catch(e) { 
        console.warn("Version check skipped", e); 
    }
    return { updateAvailable: false };
};

// --- VEHICLES ---

export const subscribeToVehicles = (uid: string, callback: (v: Vehicle[]) => void) => {
    const q = query(collection(db, `users/${uid}/vehicles`));
    return onSnapshot(q, (snap) => {
        const vehicles: Vehicle[] = [];
        snap.forEach(d => vehicles.push(d.data() as Vehicle));
        callback(vehicles);
    }, (error) => { console.warn("Vehicle sync paused:", error.message); });
};

export const fetchVehicles = async (uid: string) => {
    const q = query(collection(db, `users/${uid}/vehicles`));
    const snap = await getDocs(q);
    const vehicles: Vehicle[] = [];
    snap.forEach(d => vehicles.push(d.data() as Vehicle));
    return vehicles;
};

export const saveVehicle = async (uid: string, vehicle: Vehicle) => {
    if (!navigator.onLine) {
        await addToQueue({ type: 'SAVE_VEHICLE', uid, data: vehicle });
        return; 
    }
    await setDoc(doc(db, `users/${uid}/vehicles/${vehicle.id}`), vehicle);
};

export const deleteVehicle = async (uid: string, id: string) => {
    await deleteDoc(doc(db, `users/${uid}/vehicles/${id}`));
};

// --- TRIPS ---

export const subscribeToTrips = (uid: string, callback: (t: Trip[]) => void) => {
    const q = query(collection(db, `users/${uid}/trips`), orderBy('lastUpdated', 'desc'));
    return onSnapshot(q, (snap) => {
        const trips: Trip[] = [];
        snap.forEach(d => trips.push(d.data() as Trip));
        callback(trips);
    }, (error) => { console.warn("Trips sync paused:", error.message); });
};

export const fetchTrips = async (uid: string) => {
    const q = query(collection(db, `users/${uid}/trips`));
    const snap = await getDocs(q);
    const trips: Trip[] = [];
    snap.forEach(d => trips.push(d.data() as Trip));
    return trips;
};

export const saveTripAtomic = async (uid: string, trip: Trip, oldTrip?: Trip, newExpense?: TripExpense, skipLedgerUpdate: boolean = false) => {
    if (!navigator.onLine) {
        await addToQueue({ type: 'SAVE_TRIP', uid, data: trip });
        return;
    }
    await setDoc(doc(db, `users/${uid}/trips/${trip.id}`), trip);
};

export const saveTripsBulk = async (uid: string, trips: Trip[]) => {
    const batch = writeBatch(db);
    trips.forEach(t => {
        const ref = doc(db, `users/${uid}/trips/${t.id}`);
        batch.set(ref, t);
    });
    await batch.commit();
};

export const deleteTrip = async (uid: string, id: string) => {
    await deleteDoc(doc(db, `users/${uid}/trips/${id}`));
};

export const resetTripData = async (uid: string) => {
    const trips = await fetchTrips(uid);
    const batch = writeBatch(db);
    trips.forEach(t => batch.delete(doc(db, `users/${uid}/trips/${t.id}`)));
    await batch.commit();
};

// --- LEDGER ---

export const subscribeToLedgers = (uid: string, callback: (l: LedgerAccount[]) => void) => {
    const q = query(collection(db, `users/${uid}/ledgers`));
    return onSnapshot(q, (snap) => {
        const ledgers: LedgerAccount[] = [];
        snap.forEach(d => ledgers.push(d.data() as LedgerAccount));
        callback(ledgers);
    }, (error) => { console.warn("Ledger sync paused:", error.message); });
};

export const fetchLedgers = async (uid: string) => {
    const q = query(collection(db, `users/${uid}/ledgers`));
    const snap = await getDocs(q);
    const ledgers: LedgerAccount[] = [];
    snap.forEach(d => ledgers.push(d.data() as LedgerAccount));
    return ledgers;
};

export const saveLedger = async (uid: string, account: LedgerAccount) => {
    if (!navigator.onLine) {
        await addToQueue({ type: 'SAVE_LEDGER', uid, data: account });
        return;
    }
    await setDoc(doc(db, `users/${uid}/ledgers/${account.id}`), account);
};

export const deleteLedgerAccount = async (uid: string, id: string) => {
    const txns = await fetchTransactions(uid);
    const accTxns = txns.filter(t => t.accountId === id);
    const batch = writeBatch(db);
    batch.delete(doc(db, `users/${uid}/ledgers/${id}`));
    accTxns.forEach(t => batch.delete(doc(db, `users/${uid}/transactions/${t.id}`)));
    await batch.commit();
};

export const resetLedgerData = async (uid: string) => {
    const ledgers = await fetchLedgers(uid);
    const txns = await fetchTransactions(uid);
    const batch = writeBatch(db);
    ledgers.forEach(l => batch.delete(doc(db, `users/${uid}/ledgers/${l.id}`)));
    txns.forEach(t => batch.delete(doc(db, `users/${uid}/transactions/${t.id}`)));
    await batch.commit();
};

// --- TRANSACTIONS ---

export const subscribeToTransactions = (uid: string, callback: (t: LedgerTransaction[]) => void) => {
    const q = query(collection(db, `users/${uid}/transactions`), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
        const txns: LedgerTransaction[] = [];
        snap.forEach(d => txns.push(d.data() as LedgerTransaction));
        callback(txns);
    }, (error) => { console.warn("Transactions sync paused:", error.message); });
};

export const fetchTransactions = async (uid: string) => {
    const q = query(collection(db, `users/${uid}/transactions`));
    const snap = await getDocs(q);
    const txns: LedgerTransaction[] = [];
    snap.forEach(d => txns.push(d.data() as LedgerTransaction));
    return txns;
};

export const saveTransaction = async (uid: string, txn: LedgerTransaction) => {
    await setDoc(doc(db, `users/${uid}/transactions/${txn.id}`), txn);
};

export const saveLedgerEntryBatch = async (uid: string, txn: LedgerTransaction, account: LedgerAccount) => {
    if (!navigator.onLine) {
        await addToQueue({ type: 'SAVE_LEDGER_TXN', uid, data: txn });
        await addToQueue({ type: 'SAVE_LEDGER', uid, data: account });
        return;
    }
    const batch = writeBatch(db);
    batch.set(doc(db, `users/${uid}/transactions/${txn.id}`), txn);
    batch.set(doc(db, `users/${uid}/ledgers/${account.id}`), account);
    await batch.commit();
};

export const deleteLedgerEntryBatch = async (uid: string, txn: LedgerTransaction, account: LedgerAccount) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, `users/${uid}/transactions/${txn.id}`));
    batch.set(doc(db, `users/${uid}/ledgers/${account.id}`), account);
    await batch.commit();
};

export const deleteTransactionsByRef = async (uid: string, refId: string) => {
    const q = query(collection(db, `users/${uid}/transactions`), where('referenceId', '==', refId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
};

// --- BILTY ---

export const subscribeToBilties = (uid: string, callback: (b: Bilty[]) => void) => {
    const q = query(collection(db, `users/${uid}/bilties`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        const bilties: Bilty[] = [];
        snap.forEach(d => bilties.push(d.data() as Bilty));
        callback(bilties);
    }, (error) => { console.warn("Bilty sync paused:", error.message); });
};

export const fetchBilties = async (uid: string) => {
    const q = query(collection(db, `users/${uid}/bilties`));
    const snap = await getDocs(q);
    const bilties: Bilty[] = [];
    snap.forEach(d => bilties.push(d.data() as Bilty));
    return bilties;
};

export const saveBilty = async (uid: string, bilty: Bilty) => {
    if (!navigator.onLine) {
        await addToQueue({ type: 'SAVE_BILTY', uid, data: bilty });
        return;
    }
    await setDoc(doc(db, `users/${uid}/bilties/${bilty.id}`), bilty);
};

export const deleteBilty = async (uid: string, id: string) => {
    await deleteDoc(doc(db, `users/${uid}/bilties/${id}`));
};

export const resetBiltyData = async (uid: string) => {
    const bilties = await fetchBilties(uid);
    const batch = writeBatch(db);
    bilties.forEach(b => batch.delete(doc(db, `users/${uid}/bilties/${b.id}`)));
    await batch.commit();
};

// --- RESTORE BATCH WITH SMART MERGE ---
// Logic: If doc exists, overwrite only if backup has newer data (or simple overwrite for now with merge:true)
export const restoreBatchData = async (uid: string, data: any) => {
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    
    const commitAndRotate = async () => {
        if (operationCount > 0) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            operationCount = 0;
        }
    };
    
    // Using { merge: true } to prevent wiping fields that aren't in backup
    const addToBatch = async (ref: any, payload: any) => {
        // Simple Merge Strategy: Overwrite if ID exists.
        // For strict "Newer Wins" check, we would need to read docs first, which is expensive.
        // Assuming "Restore" implies the user trusts the backup file more.
        currentBatch.set(ref, payload, { merge: true });
        operationCount++;
        if (operationCount >= 450) await commitAndRotate();
    };

    if (data.vehicles) {
        for (const v of data.vehicles) await addToBatch(doc(db, `users/${uid}/vehicles/${v.id}`), v);
    }
    if (data.ledgers) {
        for (const l of data.ledgers) await addToBatch(doc(db, `users/${uid}/ledgers/${l.id}`), l);
    }
    if (data.bilties) {
        for (const b of data.bilties) await addToBatch(doc(db, `users/${uid}/bilties/${b.id}`), b);
    }
    if (data.trips) {
        for (const t of data.trips) await addToBatch(doc(db, `users/${uid}/trips/${t.id}`), t);
    }
    if (data.transactions) {
        for (const txn of data.transactions) await addToBatch(doc(db, `users/${uid}/transactions/${txn.id}`), txn);
    }
    
    await commitAndRotate();
};

// ... existing SYNC, NOTIFICATIONS, STORAGE, SUBSCRIPTIONS, ADMIN, AI ...
export const syncFullData = async (uid: string) => {
    if (navigator.onLine) {
        await Promise.all([
            fetchVehicles(uid),
            fetchTrips(uid),
            fetchLedgers(uid),
            fetchBilties(uid)
        ]);
        await processOfflineQueue();
    }
};

export const processOfflineQueue = async () => {
    if (!navigator.onLine) return;
    try {
        const queue = await getQueue();
        if (queue.length === 0) return;
        
        console.log(`Processing ${queue.length} offline items...`);
        
        for (const item of queue) {
            try {
                if (item.type === 'SAVE_VEHICLE') {
                    await setDoc(doc(db, `users/${item.uid}/vehicles/${item.data.id}`), item.data);
                } else if (item.type === 'SAVE_TRIP') {
                    await setDoc(doc(db, `users/${item.uid}/trips/${item.data.id}`), item.data);
                } else if (item.type === 'SAVE_LEDGER') {
                    await setDoc(doc(db, `users/${item.uid}/ledgers/${item.data.id}`), item.data);
                } else if (item.type === 'SAVE_BILTY') {
                    await setDoc(doc(db, `users/${item.uid}/bilties/${item.data.id}`), item.data);
                } else if (item.type === 'SAVE_LEDGER_TXN') {
                    await setDoc(doc(db, `users/${item.uid}/transactions/${item.data.id}`), item.data);
                }
                
                await removeFromQueue(item.key);
            } catch (innerErr) {
                console.error("Failed to sync item", item, innerErr);
            }
        }
        notify("Sync Complete", "Offline data uploaded.", "success");
    } catch (e) {
        console.error("Offline sync error", e);
    }
};

export const resetAllUserData = async (uid: string) => {
    await Promise.all([
        resetVehicleData(uid),
        resetLedgerData(uid),
        resetTripData(uid),
        resetBiltyData(uid)
    ]);
};

export const resetVehicleData = async (uid: string) => {
    const vehicles = await fetchVehicles(uid);
    const batch = writeBatch(db);
    vehicles.forEach(v => batch.delete(doc(db, `users/${uid}/vehicles/${v.id}`)));
    await batch.commit();
};

export const seedDemoData = async (uid: string) => {
    notify("Demo", "Seeding not fully implemented in service layer yet.", "info");
};

// --- NOTIFICATIONS & TOKEN MANAGEMENT ---

const saveUidToIDB = async (uid: string) => {
    return new Promise<void>((resolve) => {
        const request = indexedDB.open('fleetdost-offline-db', 3);
        request.onupgradeneeded = function(event) {
            const db = (event.target as any).result;
            if (!db.objectStoreNames.contains('user-session')) {
                db.createObjectStore('user-session');
            }
            if (!db.objectStoreNames.contains('sync-queue')) {
                db.createObjectStore('sync-queue', { autoIncrement: true });
            }
        };
        request.onsuccess = function(event) {
            const db = (event.target as any).result;
            if (db.objectStoreNames.contains('user-session')) {
                const transaction = db.transaction(['user-session'], 'readwrite');
                const objectStore = transaction.objectStore('user-session');
                objectStore.put({ uid, timestamp: Date.now() }, 'current-uid');
            }
            resolve();
        };
        request.onerror = () => resolve();
    });
};

export const ensureDeviceToken = async (uid: string) => {
    await saveUidToIDB(uid);

    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted' && messaging) {
        try {
            const token = await getToken(messaging, { vapidKey });
            if (token) {
                await updateDoc(doc(db, 'users', uid), { 
                    fcmToken: token,
                    lastTokenSync: Date.now() 
                });
                console.log("FCM Token Synced:", token);
            }
        } catch (e) {
            console.error("Token sync failed", e);
        }
    }
};

export const requestNotificationPermission = async (uid: string, silent: boolean = false) => {
    if (!('Notification' in window)) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await ensureDeviceToken(uid);
            if (!silent) notify("Alerts On", "You will receive expiry alerts.", "success");
        }
    } catch (e) {
        console.error("Notif permission error", e);
    }
};

export const subscribeToNotifications = (uid: string, callback: (n: AppNotification[]) => void) => {
    const q = query(collection(db, `users/${uid}/notifications`), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
        const notifs: AppNotification[] = [];
        snap.forEach(d => notifs.push(d.data() as AppNotification));
        callback(notifs);
    }, (error) => { console.warn("Notification sync paused:", error.message); });
};

export const markNotificationsAsRead = async (uid: string, ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.update(doc(db, `users/${uid}/notifications/${id}`), { isRead: true });
    });
    await batch.commit();
};

export const saveInAppNotification = async (uid: string, notification: AppNotification) => {
    await setDoc(doc(db, `users/${uid}/notifications/${notification.id}`), notification);
};

export const sendTestPushNotification = async (token: string) => {
    // UPDATED: Using V2 function name
    const call = httpsCallable(functions, 'sendTestNotificationV2');
    await call({ token });
};

export const queueBroadcast = async (title: string, body: string, target: 'ALL'|'FREE'|'PREMIUM', createdBy: string) => {
    const broadcast: SystemBroadcast = {
        id: `br-${Date.now()}`,
        title,
        body,
        target,
        createdBy,
        status: 'PENDING',
        createdAt: Date.now()
    };
    await setDoc(doc(db, 'system_broadcasts', broadcast.id), broadcast);
};

export const subscribeToBroadcastHistory = (callback: (b: SystemBroadcast[]) => void) => {
    const q = query(collection(db, 'system_broadcasts'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, (snap) => {
        const broadcasts: SystemBroadcast[] = [];
        snap.forEach(d => broadcasts.push(d.data() as SystemBroadcast));
        callback(broadcasts);
    }, (error) => { console.warn("Broadcast sync paused:", error.message); });
};

// --- STORAGE & SUPPORT ---

export const uploadProfileImage = async (uid: string, file: Blob | File) => {
    const storageRef = ref(storage, `profile_photos/${uid}_${Date.now()}.jpg`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const uploadSupportScreenshot = async (file: File) => {
    const timestamp = Date.now();
    const fileName = `support_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `support_screenshots/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

export const saveSupportTicket = async (uid: string, ticket: any) => {
    const docRef = doc(db, 'support_tickets', ticket.id);
    await setDoc(docRef, { ...ticket, userId: uid, createdAt: serverTimestamp() });
};

// --- SUBSCRIPTIONS ---

export const cancelSubscription = async (user: FirebaseUser) => {
    const idToken = await user.getIdToken();
    const res = await fetch(getApiUrl('/api/cancel-subscription'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        }
    });
    if (!res.ok) throw new Error("Cancellation failed");
};

export const upgradeSubscription = async (uid: string, planId: string) => {
    // Placeholder
};

export const giftSubscriptionToUser = async (targetUid: string, days: number) => {
    const now = Date.now();
    await updateDoc(doc(db, 'users', targetUid), {
        planType: 'PREMIUM',
        subscription: {
            status: 'ACTIVE',
            planId: 'GIFT',
            startDate: now,
            expiryDate: now + (days * 86400000),
            autoRenewal: false,
            isGifted: true
        }
    });
};

export const revokeSubscription = async (targetUid: string) => {
    await updateDoc(doc(db, 'users', targetUid), {
        planType: 'FREE',
        subscription: {
            status: 'CANCELLED'
        }
    });
};

// --- ADMIN ---

export const getAllUsers = async (startAfterDoc: any) => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    const users: UserProfile[] = [];
    snap.forEach(d => users.push(d.data() as UserProfile));
    return { users, lastDoc: snap.docs[snap.docs.length - 1] };
};

export const toggleUserBan = async (uid: string, isBanned: boolean) => {
    await updateDoc(doc(db, 'users', uid), { isBanned });
};

export const updateUserRole = async (uid: string, role: 'admin'|'user') => {
    await updateDoc(doc(db, 'users', uid), { role });
};

// --- AI & CLOUD FUNCTIONS ---

export const analyzeDocumentImage = async (base64: string, mimeType: string) => {
    // UPDATED: Using V2 function name
    const call = httpsCallable(functions, 'analyzeDocumentV2');
    const result = await call({ imageBase64: base64, mimeType });
    return result.data;
};

export const askGeminiAI = async (prompt: string) => {
    const url = getApiUrl('/api/ask-ai');
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        throw new Error(`AI Request Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
};
