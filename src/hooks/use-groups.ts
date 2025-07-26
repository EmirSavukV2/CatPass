'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserGroups, createGroup, Group, CreateGroupData } from '@/lib/groups-service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  const fetchGroups = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);
    try {
      const userGroups = await getUserGroups(user.uid);
      setGroups(userGroups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gruplar yüklenirken hata oluştu';
      setError(errorMessage);
      showToast({
        type: 'error',
        title: 'Hata',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, showToast]);

  const addGroup = async (groupData: CreateGroupData) => {
    if (!user?.uid || !user?.email) return;

    try {
      const groupId = await createGroup({
        ...groupData,
        ownerId: user.uid,
        ownerEmail: user.email,
        memberIds: [user.uid],
        memberEmails: [user.email]
      });

      // Add the new group to the local state
      const newGroup: Group = {
        id: groupId,
        ...groupData,
        ownerId: user.uid,
        ownerEmail: user.email,
        memberIds: [user.uid],
        memberEmails: [user.email],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setGroups(prev => [newGroup, ...prev]);
      return groupId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Grup oluşturulurken hata oluştu';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchGroups();
    }
  }, [user?.uid]);

  return {
    groups,
    isLoading,
    error,
    fetchGroups,
    addGroup,
    refetch: fetchGroups
  };
}
