
export interface VehicleDocument {
  name: string;
  expiryDate: string; 
  status?: 'safe' | 'warning' | 'expired';
}

export interface Vehicle {
  id: string;
  number: string;
  ownerName: string;
  documents: {
    rc: VehicleDocument;
    insurance: VehicleDocument;
    fitness: VehicleDocument;
    permit: VehicleDocument;
    statePermit: VehicleDocument;
    puc: VehicleDocument;
    tax: VehicleDocument;
  };
  lastUpdated: number;
}

export interface Bilty {
  id: string;
  biltyNumber: string;
  date: string;
  invoiceNo?: string;
  invoiceDate?: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile?: string;
  fromStation: string;
  toStation: string;
  consignor: {
    name: string;
    address?: string;
    gst?: string;
    city?: string;
    ledgerId?: string;
  };
  consignee: {
    name: string;
    address?: string;
    gst?: string;
    city?: string;
    ledgerId?: string;
  };
  itemDetails: {
    description: string;
    weight: string;
    packages: string;
    rate?: number;
  };
  freight: {
    amount: number;
    advance: number;
    balance: number;
    paymentType: 'Paid' | 'To Pay' | 'Billing';
    labour?: number;
    kanta?: number;
    stCh?: number; // Added Statistical Charges
    otherCh?: number;
    gstPercent?: number;
  };
  insurance?: {
    company?: string;
    policyNo?: string;
    value?: string;
  };
  // Payment Responsibility Logic
  billTo?: 'BROKER' | 'PARTY';
  hiringPartyName?: string;
  hiringPartyMobile?: string;
  
  brokerName?: string;
  brokerMobile?: string;
  brokerAmount?: number;
  brokerAdvance?: number;
  brokerBalance?: number;
  
  // New: Value of goods as per invoice
  declaredValue?: number;
  
  remarks?: string;
  createdAt: number;
  status?: 'ACTIVE' | 'CANCELLED';
}

export interface LedgerAccount {
  id: string;
  name: string;
  type: 'Party' | 'Driver' | 'Supplier' | 'Broker' | 'Cash';
  mobile?: string;
  address?: string;
  gst?: string;
  openingBalance: number; 
  balance: number;
  lastUpdated: number;
}

export interface LedgerTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  referenceId?: string;
  category: 'BILTY' | 'PAYMENT' | 'ADJUSTMENT';
  createdAt: number;
  isCancelled?: boolean;
}

export interface TripExpense {
  id: string;
  type: 'FUEL' | 'TOLL' | 'REPAIR' | 'DRIVER_CASH' | 'POLICE' | 'OTHER';
  amount: number;
  date: string;
  time?: string;
  paidBy: string;
  notes?: string;
}

export interface Trip {
  id: string;
  tripNumber: number;
  vehicleNumber: string;
  driverName: string;
  partyName: string;
  route: { from: string; to: string };
  freightAmount: number;
  startDate: string;
  endDate?: string;
  status: 'RUNNING' | 'COMPLETED';
  expenses: TripExpense[];
  totalExpense: number;
  netProfit: number;
  lastUpdated: number;
  billStatus?: 'PENDING' | 'DONE';
  invoiceNumber?: string;
  billDate?: string;
  brokerName?: string;
  brokerAmount?: number;
  sourceId?: string; // Links back to Bilty or other source
}

export type ViewState = 'home' | 'search' | 'alerts' | 'import' | 'bilty' | 'ledger' | 'trips';

export interface UserSubscription {
  status: 'FREE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  planId: 'MONTHLY_149' | 'QUARTERLY_299' | 'YEARLY_999' | null;
  startDate: number;
  expiryDate: number;
  razorpaySubscriptionId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  autoRenewal: boolean;
  isGifted?: boolean; // New Flag to track admin gifts
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  role: 'admin' | 'user';
  isBanned: boolean;
  createdAt: number;
  lastLogin: number;
  lastHeartbeat?: number; // Added for Hourly Pulse
  fcmToken?: string; // Keeping for backward compatibility
  fcmSessions?: { token: string; deviceId: string; timestamp: number }[]; // New Multi-Device Support
  expiryDays?: number;
  planType?: 'FREE' | 'PREMIUM'; 
  subscription?: UserSubscription;
  stats?: {
    tripsCount: number;
    totalFreight: number;
    totalExpense: number;
  };
  business?: {
    companyName: string;
    address: string;
    contact: string;
    gst?: string;
    templateBase64?: string;
    templateName?: string;
  };
}

export interface BroadcastFailure {
  uid: string;
  name: string;
  phone: string;
  error: string;
}

export interface SystemBroadcast {
  id: string;
  title: string;
  body: string;
  target: 'ALL' | 'FREE' | 'PREMIUM';
  createdAt: number;
  createdBy: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SENT_EMPTY';
  sentCount?: number;
  failCount?: number;
  sentAt?: any;
  failureDetails?: BroadcastFailure[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'ALERT' | 'BROADCAST';
  timestamp: number;
  isRead: boolean;
  link?: string; // Optional link for navigation
}

export interface ActivityLog {
  action: 'LOGIN' | 'LOGOUT' | 'SIGNUP';
  timestamp: string; // ISO String
  device: string;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  providerData: { providerId: string; uid: string; displayName: string | null; email: string | null; phoneNumber: string | null; photoURL: string | null; }[];
  emailVerified: boolean;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

export interface ConfirmationResult {
  confirm(verificationCode: string): Promise<any>;
  verificationId: string;
}
