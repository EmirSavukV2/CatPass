'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user: User = {
              uid: firebaseUser.uid, // Firebase Auth UID'sini kullan
              authUid: userData.authUid || firebaseUser.uid,
              email: userData.email || firebaseUser.email || '',
              displayName: userData.displayName || firebaseUser.displayName || '',
              publicKey: userData.publicKey || '',
              encryptedPrivateKey: userData.encryptedPrivateKey || '',
              kdfSalt: userData.kdfSalt || ''
            };
            setState({
              isAuthenticated: true,
              isLoading: false,
              user: user,
            });
          } else {
            // User document doesn't exist in Firestore
            setState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
          });
        }
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
