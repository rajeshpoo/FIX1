import crypto from 'crypto';
import admin from 'firebase-admin';

const KEY_ID = (process.env.RAZORPAY_KEY_ID || '').trim();
const KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET || '').trim();

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

// ✅ Plan ke hisaab se expected amounts (paise mein — 1 rupee = 100 paise)
const EXPECTED_AMOUNTS = {
  'MONTHLY_149':   14900,
  'QUARTERLY_299': 29900,
  'YEARLY_999':    99900
};

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (e) {
    console.error("Firebase Admin Initialization Error", e);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId } = req.body;

  // Step 1: Required fields check
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !planId) {
    return res.status(400).json({ status: 'failure', message: 'Missing required payment details' });
  }

  // Step 2: Valid planId check
  if (!EXPECTED_AMOUNTS[planId]) {
    return res.status(400).json({ status: 'failure', message: 'Invalid plan ID' });
  }

  // Step 3: HMAC Signature Verification (Razorpay fraud prevention)
  const generated_signature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    console.warn(`🚨 Potential Fraud: Signature mismatch for user ${userId}`);
    return res.status(400).json({ status: 'failure', message: 'Invalid Signature' });
  }

  // ✅ FIX Step 4: Razorpay API se actual paid amount verify karo
  try {
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!rzpResponse.ok) {
      console.error('Razorpay payment fetch failed');
      return res.status(400).json({ status: 'failure', message: 'Could not verify payment with Razorpay' });
    }

    const paymentData = await rzpResponse.json();

    // ✅ Amount mismatch check — koi kam paise dekar premium nahi le sakta
    if (paymentData.amount < EXPECTED_AMOUNTS[planId]) {
      console.warn(`🚨 Amount Mismatch! Paid: ${paymentData.amount}, Expected: ${EXPECTED_AMOUNTS[planId]}, User: ${userId}`);
      return res.status(400).json({ status: 'failure', message: 'Payment amount does not match plan price' });
    }

    // ✅ Payment status check — sirf captured payments accept karo
    if (paymentData.status !== 'captured') {
      return res.status(400).json({ status: 'failure', message: 'Payment not captured yet' });
    }

  } catch (fetchError) {
    console.error('Razorpay API error:', fetchError);
    return res.status(500).json({ status: 'error', message: 'Payment verification failed' });
  }

  // Step 5: Idempotency check + Firestore update
  try {
    const paymentRef = db.collection('payments').doc(razorpay_payment_id);
    const paymentSnap = await paymentRef.get();

    if (paymentSnap.exists) {
      return res.status(200).json({ status: 'success', message: 'Payment already processed' });
    }

    const batch = db.batch();
    const now = Date.now();
    let durationDays = 30;
    if (planId === 'QUARTERLY_299') durationDays = 90;
    if (planId === 'YEARLY_999') durationDays = 365;

    const expiryDate = now + (durationDays * 24 * 60 * 60 * 1000);
    const userRef = db.collection('users').doc(userId);

    batch.update(userRef, {
      planType: 'PREMIUM',
      subscription: {
        status: 'ACTIVE',
        planId: planId,
        startDate: now,
        expiryDate: expiryDate,
        autoRenewal: false,
        razorpayPaymentId: razorpay_payment_id,
        lastUpdated: now
      }
    });

    batch.set(paymentRef, {
      userId: userId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      planId: planId,
      amount: EXPECTED_AMOUNTS[planId] / 100, // rupees mein store karo
      status: 'SUCCESS',
      method: 'RAZORPAY',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    return res.status(200).json({ status: 'success', message: 'Plan Activated Successfully' });

  } catch (error) {
    console.error("Firestore Update Error:", error);
    return res.status(500).json({ status: 'error', message: 'Database error during activation' });
  }
}
