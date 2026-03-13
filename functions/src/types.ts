// This file mirrors the necessary types from the frontend for server-side logic.

export interface VehicleDocument {
    name: string;
    expiryDate: string;
  }
  
export interface Vehicle {
    id: string;
    number: string;
    ownerName: string;
    documents: {
      [key: string]: VehicleDocument;
    };
    lastUpdated: number;
}
  
export interface UserProfile {
    uid: string;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    fcmToken?: string;
    expiryDays?: number;
    planType?: 'FREE' | 'PREMIUM';
    lastLogin: number;
}