'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { VaultState } from '@/types';
import { decryptAndImportPrivateKey, deriveKey } from '@/lib/crypto';
import { useAuth } from './AuthContext';

interface VaultContextType extends VaultState {
  unlockVault: (masterPassword: string) => Promise<void>;
  lockVault: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}

interface VaultProviderProps {
  children: React.ReactNode;
}

export function VaultProvider({ children }: VaultProviderProps) {
  const { user } = useAuth();
  const [vaultState, setVaultState] = useState<VaultState>({
    isUnlocked: false,
    privateKey: null,
    user: null,
  });

  const unlockVault = useCallback(async (masterPassword: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Convert base64 salt back to ArrayBuffer
      const saltBuffer = new Uint8Array(
        atob(user.kdfSalt)
          .split('')
          .map(char => char.charCodeAt(0))
      ).buffer;

      // Derive encryption key from master password
      const encryptionKey = await deriveKey(masterPassword, saltBuffer);

      // Decrypt the private key
      const privateKey = await decryptAndImportPrivateKey(
        user.encryptedPrivateKey,
        encryptionKey
      );

      setVaultState({
        isUnlocked: true,
        privateKey,
        user,
      });
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      throw new Error('Invalid master password or corrupted data');
    }
  }, [user]);

  const lockVault = useCallback(() => {
    setVaultState({
      isUnlocked: false,
      privateKey: null,
      user: null,
    });
  }, []);

  const value: VaultContextType = {
    ...vaultState,
    unlockVault,
    lockVault,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
