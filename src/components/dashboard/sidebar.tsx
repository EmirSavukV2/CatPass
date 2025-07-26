'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVault } from '@/contexts/VaultContext';
import { useProjects } from '@/hooks/use-projects';
import { useGroups } from '@/hooks/use-groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ProjectModal } from '@/components/modals/project-modal';
import { GroupModal } from '@/components/modals/group-modal';
import { InviteUserModal } from '@/components/modals/invite-user-modal';
import { 
  FolderIcon, 
  UsersIcon, 
  SettingsIcon, 
  LogOutIcon, 
  PlusIcon,
  LockIcon,
  UserPlusIcon
} from 'lucide-react';

interface SidebarProps {
  selectedProject: string | null;
  selectedGroup: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onGroupSelect: (groupId: string | null) => void;
}

export function Sidebar({ 
  selectedProject, 
  selectedGroup, 
  onProjectSelect, 
  onGroupSelect 
}: SidebarProps) {
  const { user, signOut } = useAuth();
  const { lockVault } = useVault();
  const { projects, refetch: refetchProjects } = useProjects();
  const { groups, refetch: refetchGroups } = useGroups();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroupForInvite, setSelectedGroupForInvite] = useState<{ id: string; name: string } | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLockVault = () => {
    lockVault();
  };

  const handleProjectCreated = () => {
    refetchProjects();
  };

  const handleGroupCreated = () => {
    refetchGroups();
  };

  const handleInviteUser = (groupId: string, groupName: string) => {
    setSelectedGroupForInvite({ id: groupId, name: groupName });
    setShowInviteModal(true);
  };

  const handleInviteSent = () => {
    // Optionally refresh groups list
    refetchGroups();
  };

  const handleProjectClick = (projectId: string) => {
    if (selectedProject === projectId) {
      onProjectSelect(null);
    } else {
      onProjectSelect(projectId);
      onGroupSelect(null);
    }
  };

  const handleGroupClick = (groupId: string) => {
    if (selectedGroup === groupId) {
      onGroupSelect(null);
    } else {
      onGroupSelect(groupId);
      onProjectSelect(null);
    }
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Secure Vault
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {user?.displayName}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
              <FolderIcon className="w-4 h-4 mr-2" />
              Projects
            </h2>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0"
              onClick={() => setShowProjectModal(true)}
            >
              <PlusIcon className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedProject === project.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : ''
                }`}
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{project.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    0
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Groups Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
              <UsersIcon className="w-4 h-4 mr-2" />
              Groups
            </h2>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0"
              onClick={() => setShowGroupModal(true)}
            >
              <PlusIcon className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {groups.map((group) => (
              <Card
                key={group.id}
                className={`p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedGroup === group.id
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleGroupClick(group.id)}
                  >
                    <span className="text-sm font-medium">{group.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      0
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInviteUser(group.id, group.name);
                      }}
                      title="Kullanıcı davet et"
                    >
                      <UserPlusIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {}}
        >
          <SettingsIcon className="w-4 h-4 mr-2" />
          Settings
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLockVault}
        >
          <LockIcon className="w-4 h-4 mr-2" />
          Lock Vault
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={handleSignOut}
        >
          <LogOutIcon className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Modals */}
      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onProjectCreated={handleProjectCreated}
      />
      <GroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
      {selectedGroupForInvite && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false);
            setSelectedGroupForInvite(null);
          }}
          onInviteSent={handleInviteSent}
          groupId={selectedGroupForInvite.id}
          groupName={selectedGroupForInvite.name}
        />
      )}
    </div>
  );
}
