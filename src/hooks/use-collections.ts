'use client';

import { useState, useEffect, useCallback } from 'react';
import { Collection } from '@/types';
import { 
  getCollections, 
  createCollection, 
  updateCollection, 
  deleteCollection 
} from '@/lib/collections-service';
import { useAuth } from '@/contexts/AuthContext';

export function useCollections(projectId?: string, groupId?: string) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCollections = useCallback(async () => {
    if (!user?.uid) return;
    
    // Don't load collections if no project or group is selected
    if (!projectId && !groupId) {
      setCollections([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const collectionsData = await getCollections(projectId, groupId, user.uid);
      setCollections(collectionsData);
    } catch (error) {
      console.error('Error fetching collections:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch collections');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, projectId, groupId]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const createNewCollection = async (data: {
    name: string;
    description?: string;
  }) => {
    if (!user?.uid) throw new Error('User not authenticated');

    const ownerType = groupId ? 'group' : 'user';
    const ownerId = groupId || user.uid;

    await createCollection({
      name: data.name,
      description: data.description,
      projectId,
      groupId,
      ownerType,
      ownerId
    });

    await fetchCollections();
  };

  const updateExistingCollection = async (
    collectionId: string,
    updates: { name?: string; description?: string }
  ) => {
    await updateCollection(collectionId, updates);
    await fetchCollections();
  };

  const deleteExistingCollection = async (collectionId: string) => {
    await deleteCollection(collectionId);
    await fetchCollections();
  };

  return {
    collections,
    isLoading,
    error,
    createCollection: createNewCollection,
    updateCollection: updateExistingCollection,
    deleteCollection: deleteExistingCollection,
    refreshCollections: fetchCollections
  };
}
