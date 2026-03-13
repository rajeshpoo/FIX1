
import crypto from 'crypto';

// SECURITY UPDATE: Restricted Origins
const ALLOWED_ORIGINS = [
  'https://fleetdost.in',
  'https://www.fleetdost.in',
  'https://fleetdost-rp.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost'
];

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

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
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Idempotency-Key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!KEY_ID || !KEY_SECRET) {
      console.error("Razorpay Keys Missing");
      return res.status(500).json({ error: "Server Configuration Error" });
  }

  const { planId, userId } = req.body;

  const PRICING_TABLE = {
    'MONTHLY_149': 14900,
    'QUARTERLY_299': 29900,
    'YEARLY_999': 99900
  };

  const amount = PRICING_TABLE[planId];

  if (!amount || !userId) {
    return res.status(400).json({ error: "Invalid Request. Plan or User ID missing." });
  }

  // IDEMPOTENCY KEY GENERATION
  // 1. Try to get key from client header (Best for retries)
  // 2. Fallback: Generate unique key on server
  const idempotencyKey = req.headers['x-idempotency-key'] || crypto.randomUUID();

  try {
    // Construct Basic Auth Header
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');

    const options = {
      amount: amount,
      currency: "INR",
      receipt: "rcpt_" + Date.now().toString().slice(-10),
      payment_capture: 1,
      notes: {
        userId: userId,
        planId: planId
      }
    };

    // Use fetch directly to pass the specific Idempotency Header
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`,
            'X-Razorpay-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(options)
    });

    if (!razorpayResponse.ok) {
        const errorData = await razorpayResponse.json();
        console.error("Razorpay API Error:", errorData);
        throw new Error(errorData.error?.description || "Gateway Error");
    }

    const order = await razorpayResponse.json();
    
    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: KEY_ID 
    });

  } catch (error) {
    console.error("Order Creation Failed:", error.message);
    res.status(500).json({ error: "Could not create order. Please try again." });
  }
}
