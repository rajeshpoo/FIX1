
import { Vehicle } from '../types';

// --- INDIAN TIMEZONE HELPERS ---

export const getIndianDate = (): string => {
  // Returns YYYY-MM-DD in Asia/Kolkata
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const getIndianTime = (): string => {
  // Returns HH:MM (24-hour format) in Asia/Kolkata
  return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
};

export const getDaysRemaining = (expiryDate: string): number => {
  if (!expiryDate || typeof expiryDate !== 'string' || expiryDate.trim() === '') return 9999;
  
  let dateStr = expiryDate.trim();
  // Normalize separators: replace / and . with -
  dateStr = dateStr.replace(/[\/\.]/g, '-');
  const parts = dateStr.split('-');
  
  let expiry: Date;
  
  // Robust Date Parsing for YYYY-MM-DD and DD-MM-YYYY
  if (parts.length === 3) {
      const p0 = parseInt(parts[0]);
      const p1 = parseInt(parts[1]);
      const p2 = parseInt(parts[2]);
      
      let d = 0, m = 0, y = 0;
      
      if (parts[0].length === 4) {
          // Format: YYYY-MM-DD
          y = p0; m = p1; d = p2;
      } else {
          // Format: DD-MM-YYYY (Indian Standard)
          d = p0; m = p1; y = p2;
      }
      
      // Use local time constructor: new Date(year, monthIndex, day)
      // monthIndex is 0-based (Jan = 0)
      expiry = new Date(y, m - 1, d);
  } else {
      // Fallback for ISO strings or other formats
      expiry = new Date(dateStr);
  }

  // Check for Invalid Date
  if (isNaN(expiry.getTime())) return 9999;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to midnight
  expiry.setHours(0, 0, 0, 0); // Normalize expiry to midnight
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getStatusColor = (expiryDate: string, warningWindow: number = 15): 'red' | 'yellow' | 'green' | 'none' => {
  if (!expiryDate || expiryDate.trim() === '') return 'none';
  const days = getDaysRemaining(expiryDate);
  if (days < 0) return 'red';
  if (days <= warningWindow) return 'yellow';
  return 'green';
};

export const getStatusTailwindColor = (status: 'red' | 'yellow' | 'green' | 'none') => {
  switch (status) {
    case 'red': return 'bg-red-500 text-white shadow-lg shadow-red-500/20';
    case 'yellow': return 'bg-amber-400 text-black shadow-lg shadow-amber-400/20';
    case 'green': return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';
    default: return 'bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getTrafficLightStats = (vehicles: Vehicle[], warningWindow: number = 15) => {
  let expired = 0;
  let warning = 0;
  let safe = 0;

  vehicles.forEach(v => {
    if (!v.documents) return;
    const docs = Object.values(v.documents);
    let hasExpired = false;
    let hasWarning = false;

    docs.forEach((d: any) => {
      if (d && d.expiryDate) {
        const status = getStatusColor(d.expiryDate, warningWindow);
        if (status === 'red') hasExpired = true;
        if (status === 'yellow') hasWarning = true;
      }
    });

    if (hasExpired) {
      expired++;
    } else if (hasWarning) {
      warning++;
    } else {
      safe++;
    }
  });

  return { expired, warning, safe };
};

export const generateWhatsAppLink = (vehicle: Vehicle, warningWindow: number = 15) => {
  if (!vehicle.documents) return '';
  const expiredDocs = Object.values(vehicle.documents).filter((d: any) => {
      if (!d || !d.expiryDate) return false;
      const status = getStatusColor(d.expiryDate, warningWindow);
      return status === 'red' || status === 'yellow';
  });
  
  if (expiredDocs.length === 0) return '';

  const docList = expiredDocs.map((d: any) => {
      const status = getStatusColor(d.expiryDate, warningWindow);
      const label = status === 'red' ? 'EXPIRED' : 'EXPIRING SOON';
      return `- ${d.name} (${label}: ${d.expiryDate})`;
  }).join('%0a');

  const text = `🚨 *Document Alert for ${vehicle.number}* 🚨%0a%0aHello ${vehicle.ownerName},%0aThe following documents require urgent attention:%0a%0a${docList}%0a%0aPlease renew them immediately to avoid penalties.%0a%0a_Sent via FleetDost_`;
  
  return `https://wa.me/?text=${text}`;
};

/**
 * Handles file download via Standard Browser Logic
 * PWA Compatible
 */
export const sendToNativeApp = async (data: Blob | string, filename: string) => {
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Standard Browser Download for PWA
  const href = typeof data === 'string' ? data : URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  if (document.body.contains(link)) {
      document.body.removeChild(link);
  }
  
  if (typeof data !== 'string') {
      setTimeout(() => URL.revokeObjectURL(href), 100);
  }
};

/**
 * API Router for PWA
 */
export const getApiUrl = (endpoint: string) => {
  const PRODUCTION_DOMAIN = 'https://fleetdost.in'; 
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Localhost Development? -> Must use Absolute URL
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168')) {
      return `${PRODUCTION_DOMAIN}${cleanEndpoint}`;
  }

  // Production Website (fleetdost.in) -> Use Relative Path for Same-Origin
  return cleanEndpoint;
};
