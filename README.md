# FleetDost 🚛

**India ka #1 Fleet Management App**

Vehicles, Trips, Bilty aur Ledger — sab ek jagah manage karo.

**Website:** [fleetdost.in](https://fleetdost.in)  
**Powered by:** Shree Shyam Enterprises  
**Architected by:** Rajesh Poonia

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- Firebase project
- Razorpay account (payments ke liye)
- Google Gemini API key (AI feature ke liye)

### Steps

```bash
# 1. Dependencies install karo
npm install

# 2. Environment variables setup karo
cp .env.example .env.local
# .env.local mein apni real values daalo

# 3. App run karo
npm run dev
```

### Environment Variables

`.env.example` file dekho — saare required variables wahan hain.

**Vercel Deployment ke liye:**  
Vercel Dashboard → Settings → Environment Variables mein saare variables add karo.

---

## 🔐 Security

- Firebase App Check enabled (reCAPTCHA v3)
- Razorpay HMAC-SHA256 signature verification
- Server-side payment amount verification
- Firestore Security Rules with role-based access

---

## 📁 Project Structure

```
api/          → Vercel Serverless Functions (payments, AI)
components/   → React UI Components
context/      → React Context (UserContext)
functions/    → Firebase Cloud Functions (scheduled tasks)
hooks/        → Custom React Hooks
services/     → Firebase service layer
utils/        → Utility functions
public/       → Static assets
```

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS
- **Backend:** Vercel Serverless + Firebase Cloud Functions
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Payments:** Razorpay
- **AI:** Google Gemini
- **Mobile:** Capacitor (Android/iOS)
