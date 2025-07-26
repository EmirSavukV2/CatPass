'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserProjects, createProject, Project, CreateProjectData } from '@/lib/projects-service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  const fetchProjects = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);
    try {
      const userProjects = await getUserProjects(user.uid);
      setProjects(userProjects);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Projeler yüklenirken hata oluştu';
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

  const addProject = async (projectData: Omit<CreateProjectData, 'ownerId' | 'ownerEmail' | 'memberIds' | 'memberEmails' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.uid || !user?.email) return;

    try {
      const projectId = await createProject({
        ...projectData,
        ownerId: user.uid,
        ownerEmail: user.email,
        memberIds: [user.uid],
        memberEmails: [user.email],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Add the new project to the local state
      const newProject: Project = {
        id: projectId,
        ...projectData,
        ownerId: user.uid,
        ownerEmail: user.email,
        memberIds: [user.uid],
        memberEmails: [user.email],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setProjects(prev => [newProject, ...prev]);
      return projectId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Proje oluşturulurken hata oluştu';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    addProject,
    refetch: fetchProjects
  };
}
