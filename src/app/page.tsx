'use client';

import DashboardLayout, { useDashboard } from '@/components/dashboard/layout';
import { SecretsTable } from '@/components/dashboard/secrets-table';

function DashboardContent() {
  const { selectedProject, selectedGroup } = useDashboard();
  
  return (
    <SecretsTable
      selectedProject={selectedProject}
      selectedGroup={selectedGroup}
    />
  );
}

export default function Home() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
