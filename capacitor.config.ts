
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rajesh.fleetdost',
  appName: 'FleetDost',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow navigation to your domain for API calls AND Firebase Auth domains
    allowNavigation: [
      '*.fleetdost.in', 
      '*.google.com', 
      '*.googleapis.com', 
      '*.firebaseapp.com', 
      'fleetdost-fdf52.firebaseapp.com'
    ]
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // IMPORTANT: Use the WEB Client ID from Firebase Console here, NOT the Android one.
      // Firebase Console -> Authentication -> Sign-in method -> Google -> Web SDK configuration -> Web Client ID
      clientId: '551856035006-25914g7k931181811111111.apps.googleusercontent.com', 
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#020617",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    }
  }
};

export default config;
