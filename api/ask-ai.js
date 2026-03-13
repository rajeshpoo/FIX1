
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge', 
};

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

export default async function handler(req) {
  const origin = req.headers.get('origin');
  
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Only Allow Trusted Origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const body = await req.json();
    const { prompt } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server Error: API Key missing' }), { status: 500, headers });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    const text = response.text; 
    const jsonStr = text ? text.replace(/```json/g, "").replace(/```/g, "").trim() : "{}";

    return new Response(JSON.stringify(JSON.parse(jsonStr)), { 
      status: 200, 
      headers 
    });

  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ 
        error: 'AI Service Error',
        details: error.message
    }), { status: 500, headers });
  }
}
