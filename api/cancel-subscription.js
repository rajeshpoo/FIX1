
import Razorpay from 'razorpay';
import admin from 'firebase-admin';

// Trusted Domains
const ALLOWED_ORIGINS = [
  'https://fleetdost.in',
  'https://www.fleetdost.in',
  'https://fleetdost-rp.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost'
];

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error("Firebase Admin Error", e);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // --- STRICT CORS LOGIC ---
  const origin = req.headers.origin;
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const razorpaySubscriptionId = userData?.subscription?.razorpaySubscriptionId;

    if (!razorpaySubscriptionId) {
      await userRef.update({
        'subscription.status': 'CANCELLED',
        'subscription.autoRenewal': false,
      });
      return res.status(200).json({ message: 'Subscription cancelled successfully.' });
    }

    await razorpay.subscriptions.cancel(razorpaySubscriptionId);

    await userRef.update({
      'subscription.status': 'CANCELLED',
      'subscription.autoRenewal': false,
    });
    
    res.status(200).json({ message: 'Subscription cancelled successfully.' });

  } catch (error) {
    console.error("Cancellation Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
