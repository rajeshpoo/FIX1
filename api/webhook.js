
import crypto from 'crypto';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error("Firebase Admin Init Error:", e);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Not Allowed');
  }

  // 1. Verify Webhook Signature
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest !== req.headers['x-razorpay-signature']) {
    console.error("Invalid Webhook Signature");
    return res.status(400).json({ status: 'error', message: 'Invalid Signature' });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  // 2. We only care about payment.captured or order.paid
  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentEntity = payload.payment.entity;
    const orderId = paymentEntity.order_id;
    
    // Webhook order notes contain our data
    const userId = paymentEntity.notes.userId;
    const planId = paymentEntity.notes.planId;

    if (!userId || !planId) {
        return res.status(200).json({ status: 'ok', message: 'No metadata found' });
    }

    try {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (userSnap.exists) {
            const userData = userSnap.data();
            // Check if already premium to avoid redundant updates
            if (userData.planType === 'PREMIUM' && userData.subscription?.razorpayOrderId === orderId) {
                return res.status(200).json({ status: 'ok', message: 'Already processed' });
            }

            const now = Date.now();
            let durationDays = 30;
            if (planId === 'QUARTERLY_299') durationDays = 90;
            if (planId === 'YEARLY_999') durationDays = 365;
            const expiryDate = now + (durationDays * 24 * 60 * 60 * 1000);

            await userRef.update({
                planType: 'PREMIUM',
                subscription: {
                    status: 'ACTIVE',
                    planId: planId,
                    startDate: now,
                    expiryDate: expiryDate,
                    autoRenewal: false,
                    razorpayOrderId: orderId,
                    lastUpdated: now
                }
            });

            console.log(`Webhook Success: User ${userId} upgraded via background task.`);
        }
    } catch (err) {
        console.error("Webhook DB Update Error:", err);
        return res.status(500).send('Internal Error');
    }
  }

  res.status(200).json({ status: 'ok' });
}
