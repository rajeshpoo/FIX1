
/* eslint-disable no-undef */
// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
const firebaseConfig = {
  apiKey: "AIzaSyCzxr9zbL4n3hm79d1HPcmVIAUE2aFFYXg",
  authDomain: "fleetdost-fdf52.firebaseapp.com",
  projectId: "fleetdost-fdf52",
  storageBucket: "fleetdost-fdf52.firebasestorage.app",
  messagingSenderId: "551856035006",
  appId: "1:551856035006:web:b0f811fea0f6f99aa3baef"
};

try {
  firebase.initializeApp(firebaseConfig);

  // Retrieve an instance of Firebase Messaging
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.data?.title || payload.notification?.title || 'FleetDost Alert';
    const notificationOptions = {
      body: payload.data?.body || payload.notification?.body || 'An update requires your attention.',
      icon: 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png',
      vibrate: [200, 100, 200],
      tag: payload.data?.tag || 'general-notification',
      renotify: true,
      data: {
        url: payload.data?.url || '/#alerts' // Default to Alerts page
      },
      actions: [
        { action: 'view_details', title: 'Check Now' }
      ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('Firebase Messaging SW init failed (likely due to missing config or environment):', err);
}

// Notification Click Listener - FIXED FOR PWA/APK
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Construct the absolute URL to ensure it matches the PWA scope
  // If the data.url is relative (e.g. /#alerts), this makes it https://your-domain.com/#alerts
  const urlToOpen = new URL(event.notification.data.url || '/#alerts', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // 1. Try to find an existing window (tab or standalone app)
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      // Check if the client is our app
      if (client.url.indexOf(self.location.origin) === 0) {
        matchingClient = client;
        break;
      }
    }

    if (matchingClient) {
      // 2. If found, focus it and navigate to the correct page
      return matchingClient.focus().then(() => {
        return matchingClient.navigate(urlToOpen);
      });
    } else {
      // 3. If not found, open a new window
      // This will still try to open in the installed app if the OS supports scope matching
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// --- Caching Logic (Minimal Offline Support) ---
const CACHE_NAME = 'fleetdost-v3-core';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
