
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { FirebaseUser } from '../types';
import { UserProfile } from '../types';
import { subscribeToAuthChanges, fetchUserProfile, subscribeToUserProfile } from '../services/firebaseService';

interface UserContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isPremium: boolean;
  refreshProfile: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // 1. SAFETY TIMEOUT: Force load after 5 seconds if Firebase is absolutely stuck
    const safetyTimer = setTimeout(() => {
        setLoading((current) => {
            if (current) {
                console.warn("Safety Timer: Forcing app load due to slow/stuck auth.");
                return false;
            }
            return current;
        });
    }, 5000);

    const unsubAuth = subscribeToAuthChanges((currentUser) => {
      // Clean up previous listeners immediately
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      setUser(currentUser);

      if (currentUser) {
        // User found - Instant Load
        profileUnsubRef.current = subscribeToUserProfile(currentUser.uid, (updatedProfile) => {
            setUserProfile(updatedProfile);
            setLoading(false); // Valid user path: Stop loading immediately
            clearTimeout(safetyTimer);
        });
      } else {
        // No user found (initially)
        setUserProfile(null);
        
        // COLD START FIX: 
        // Do NOT set loading to false immediately. 
        // Wait 2 seconds to see if Firebase restores a session from disk.
        // If a user IS found within this time, the 'if(currentUser)' block above will fire 
        // and set loading=false immediately, bypassing this wait.
        setTimeout(() => {
             setLoading(false); // Only show login screen after grace period
             clearTimeout(safetyTimer);
        }, 2000); 
      }
    });

    return () => {
      unsubAuth();
      clearTimeout(safetyTimer);
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

  const isPremium = !!userProfile && 
    userProfile.planType === 'PREMIUM' && 
    (userProfile.subscription?.expiryDate ? Date.now() < userProfile.subscription.expiryDate : true);

  return (
    <UserContext.Provider value={{ user, userProfile, loading, isPremium, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
