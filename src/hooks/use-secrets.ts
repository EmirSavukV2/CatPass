'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { SecretsService } from '@/lib/secrets-service';
import { Secret, SecretData } from '@/types';

export function useSecrets(projectId?: string, groupId?: string, collectionId?: string) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [decryptedSecrets, setDecryptedSecrets] = useState<{ [key: string]: SecretData }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, privateKey, isUnlocked } = useVault();

  const secretsService = useMemo(() => {
    return user && privateKey ? new SecretsService(user, privateKey) : null;
  }, [user, privateKey]);

  const loadSecrets = useCallback(async () => {
    if (!secretsService || !isUnlocked) return;

    // Don't load secrets if no project or group is selected
    if (!projectId && !groupId && !collectionId) {
      setSecrets([]);
      setIsLoading(false);
      return;
    }

    console.log('loadSecrets called with:', { projectId, groupId, collectionId });
    setIsLoading(true);
    setError(null);

    try {
      let loadedSecrets: Secret[];

      if (collectionId) {
        console.log('Loading secrets for collection:', collectionId);
        loadedSecrets = await secretsService.getSecretsForCollection(collectionId, projectId, groupId);
      } else if (projectId) {
        console.log('Loading secrets for project:', projectId);
        loadedSecrets = await secretsService.getSecretsForProject(projectId);
      } else if (groupId) {
        console.log('Loading secrets for group:', groupId);
        loadedSecrets = await secretsService.getSecretsForGroup(groupId);
      } else {
        // This should not happen anymore, but just in case
        loadedSecrets = [];
      }

      console.log('Loaded secrets:', loadedSecrets);
      setSecrets(loadedSecrets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load secrets';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [secretsService, isUnlocked, projectId, groupId, collectionId]);

  const decryptSecret = useCallback(async (secretId: string): Promise<SecretData | null> => {
    if (!secretsService) return null;

    // Return cached decrypted data if available
    if (decryptedSecrets[secretId]) {
      return decryptedSecrets[secretId];
    }

    try {
      const decryptedData = await secretsService.getSecret(secretId);
      if (decryptedData) {
        setDecryptedSecrets(prev => ({
          ...prev,
          [secretId]: decryptedData
        }));
      }
      return decryptedData;
    } catch (err) {
      console.error('Failed to decrypt secret:', err);
      return null;
    }
  }, [secretsService, decryptedSecrets]);

  const createSecret = useCallback(async (
    secretData: SecretData, 
    targetProjectId: string,
    ownerType: 'user' | 'group' = 'user',
    ownerId?: string,
    targetCollectionId?: string,
    isEncrypted: boolean = false  // New parameter to control encryption
  ): Promise<string | null> => {
    if (!secretsService) return null;

    try {
      const secretId = await secretsService.createSecret(
        secretData, 
        targetProjectId, 
        ownerType, 
        ownerId,
        targetCollectionId,
        isEncrypted
      );
      await loadSecrets(); // Refresh the list
      return secretId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create secret';
      setError(errorMessage);
      return null;
    }
  }, [secretsService, loadSecrets]);

  const updateSecret = useCallback(async (
    secretId: string, 
    secretData: SecretData,
    targetCollectionId?: string
  ): Promise<boolean> => {
    if (!secretsService) return false;

    try {
      await secretsService.updateSecret(secretId, secretData, targetCollectionId);
      
      // Update cached decrypted data
      setDecryptedSecrets(prev => ({
        ...prev,
        [secretId]: secretData
      }));
      
      await loadSecrets(); // Refresh the list
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update secret';
      setError(errorMessage);
      return false;
    }
  }, [secretsService, loadSecrets]);

  const deleteSecret = useCallback(async (secretId: string): Promise<boolean> => {
    if (!secretsService) return false;

    try {
      await secretsService.deleteSecret(secretId);
      
      // Remove from cached decrypted data
      setDecryptedSecrets(prev => {
        const updated = { ...prev };
        delete updated[secretId];
        return updated;
      });
      
      await loadSecrets(); // Refresh the list
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete secret';
      setError(errorMessage);
      return false;
    }
  }, [secretsService, loadSecrets]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  return {
    secrets,
    decryptedSecrets,
    isLoading,
    error,
    decryptSecret,
    createSecret,
    updateSecret,
    deleteSecret,
    refreshSecrets: loadSecrets
  };
}
