'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useVault } from '@/contexts/VaultContext';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MainContent } from '@/components/dashboard/main-content';
import { LoadingCard } from '@/components/ui/loading';

interface DashboardContextType {
  selectedProject: string | null;
  selectedGroup: string | null;
  setSelectedProject: (id: string | null) => void;
  setSelectedGroup: (id: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardLayout');
  }
  return context;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isUnlocked } = useVault();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isUnlocked) {
        router.push('/unlock');
      }
    }
  }, [isAuthenticated, isUnlocked, isLoading, router]);

  if (isLoading) {
    return <LoadingCard title="Loading..." message="Initializing your secure vault..." />;
  }

  if (!isAuthenticated || !isUnlocked) {
    return null;
  }

  const contextValue: DashboardContextType = {
    selectedProject,
    selectedGroup,
    setSelectedProject,
    setSelectedGroup,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar
          selectedProject={selectedProject}
          selectedGroup={selectedGroup}
          onProjectSelect={setSelectedProject}
          onGroupSelect={setSelectedGroup}
        />
        <MainContent>
          {children}
        </MainContent>
      </div>
    </DashboardContext.Provider>
  );
}
