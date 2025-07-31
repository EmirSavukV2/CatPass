'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  PlusIcon, 
  SearchIcon, 
  EyeIcon, 
  EyeOffIcon, 
  CopyIcon,
  EditIcon,
  TrashIcon,
  ArrowLeftIcon,
  FileTextIcon
} from 'lucide-react';
import { SecretModal } from '@/components/modals/secret-modal';
import { useSecrets } from '@/hooks/use-secrets';
import { useToast } from '@/components/ui/toast';
import { SecretData } from '@/types';

interface SecretsTableProps {
  selectedProject?: string | null;
  selectedGroup?: string | null;
  selectedCollection?: string;
  collectionName?: string;
  onBackToCollections?: () => void;
}

export function SecretsTable({ 
  selectedProject, 
  selectedGroup, 
  selectedCollection, 
  collectionName, 
  onBackToCollections 
}: SecretsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  
  // Modal states
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedSecretNotes, setSelectedSecretNotes] = useState<{ name: string; notes: string } | null>(null);
  
  // Edit states
  const [editingSecret, setEditingSecret] = useState<{ id: string; data: SecretData & { collectionId?: string } } | null>(null);
  
  const { showToast } = useToast();
  
  const { 
    secrets, 
    decryptedSecrets, 
    isLoading, 
    error, 
    decryptSecret, 
    createSecret, 
    updateSecret, 
    deleteSecret
  } = useSecrets(
    selectedProject || undefined, 
    selectedGroup || undefined, 
    selectedCollection || undefined
  );

  const filteredSecrets = secrets.filter(secret =>
    secret.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePasswordVisibility = async (secretId: string) => {
    if (!showPasswords[secretId] && !decryptedSecrets[secretId]) {
      await decryptSecret(secretId);
    }
    setShowPasswords(prev => ({
      ...prev,
      [secretId]: !prev[secretId]
    }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({
        type: 'success',
        title: 'Copied to clipboard',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast({
        type: 'error',
        title: 'Failed to copy',
        message: 'Could not copy to clipboard'
      });
    }
  };

  const handleAddSecret = () => {
    setEditingSecret(null);
    setIsSecretModalOpen(true);
  };

  const handleEditSecret = async (secretId: string) => {
    const decryptedData = await decryptSecret(secretId);
    const existingSecret = secrets.find(s => s.id === secretId);
    if (decryptedData && existingSecret) {
      setEditingSecret({ 
        id: secretId, 
        data: { 
          ...decryptedData, 
          collectionId: existingSecret.collectionId || undefined 
        } 
      });
      setIsSecretModalOpen(true);
    }
  };

  const handleViewNotes = async (secretId: string) => {
    const decryptedData = await decryptSecret(secretId);
    const existingSecret = secrets.find(s => s.id === secretId);
    if (decryptedData && existingSecret) {
      setSelectedSecretNotes({
        name: existingSecret.name,
        notes: decryptedData.notes || 'No notes available'
      });
      setIsNotesModalOpen(true);
    }
  };

  const handleSaveSecret = async (secretData: SecretData & { collectionId?: string }) => {
    console.log('SecretsTable handleSaveSecret:', { secretData, selectedCollection, selectedProject, selectedGroup });
    
    // Don't allow creating secrets if no project or group is selected
    if (!selectedProject && !selectedGroup && !selectedCollection) {
      showToast({
        type: 'error',
        title: 'Proje veya Grup Seçin',
        message: 'Şifre oluşturmak için önce bir proje veya grup seçmelisiniz.'
      });
      return;
    }
    
    try {
      if (editingSecret) {
        await updateSecret(editingSecret.id, secretData, secretData.collectionId);
        showToast({
          type: 'success',
          title: 'Secret updated',
          message: 'Your secret has been successfully updated'
        });
      } else {
        // Determine the target project and owner type
        let projectId: string;
        let ownerType: 'user' | 'group';
        let ownerId: string;
        
        if (selectedGroup) {
          // Creating a secret for a group
          projectId = selectedProject || 'default';
          ownerType = 'group';
          ownerId = selectedGroup;
        } else if (selectedProject) {
          // Creating a secret for a specific project
          projectId = selectedProject;
          ownerType = 'user';
          ownerId = ''; // Will be set by the service to current user
        } else {
          // This should not happen anymore, but just in case
          throw new Error('No project or group selected');
        }
        
        await createSecret(secretData, projectId, ownerType, ownerId, secretData.collectionId);
        
        showToast({
          type: 'success',
          title: 'Secret created',
          message: 'Your secret has been successfully created'
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to save secret',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    if (confirm('Are you sure you want to delete this secret?')) {
      try {
        await deleteSecret(secretId);
        showToast({
          type: 'success',
          title: 'Secret deleted',
          message: 'Your secret has been successfully deleted'
        });
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Failed to delete secret',
          message: error instanceof Error ? error.message : 'An unknown error occurred'
        });
      }
    }
  };

  const getContextTitle = () => {
    if (selectedCollection && collectionName) {
      return `${collectionName} - Şifreler`;
    }
    if (selectedProject) {
      const projectNames: { [key: string]: string } = {
        '1': 'Personal',
        '2': 'Work',
        '3': 'Development'
      };
      return `${projectNames[selectedProject] || 'Project'} Secrets`;
    }
    if (selectedGroup) {
      const groupNames: { [key: string]: string } = {
        '1': 'Team Alpha',
        '2': 'Family'
      };
      return `${groupNames[selectedGroup] || 'Group'} Secrets`;
    }
    return 'CatPass - Şifre Yöneticisi';
  };

  // Show welcome screen if no project or group is selected
  if (!selectedProject && !selectedGroup && !selectedCollection) {
    return (
      <Card>
        <CardContent className="pt-16 pb-16 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="text-6xl mb-4">🐱</div>
              <h1 className="text-3xl font-bold mb-4">CatPass&apos;e Hoş Geldiniz</h1>
              <p className="text-lg text-gray-600 mb-8">
                Güvenli şifre yönetimi için tasarlanmış modern bir çözüm
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="p-6 border rounded-lg">
                <h3 className="text-xl font-semibold mb-3">🚀 Başlamak için</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Sol menüden bir proje seçin</li>
                  <li>• Veya bir grup oluşturun/seçin</li>
                  <li>• Şifrelerinizi güvenle saklayın</li>
                </ul>
              </div>
              
              <div className="p-6 border rounded-lg">
                <h3 className="text-xl font-semibold mb-3">🔒 Güvenlik Özellikleri</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• End-to-end şifreleme</li>
                  <li>• Yerel anahtar yönetimi</li>
                  <li>• Grup paylaşımı desteği</li>
                </ul>
              </div>
              
              <div className="p-6 border rounded-lg">
                <h3 className="text-xl font-semibold mb-3">📁 Organize Etme</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Projeler ile kategorilendirin</li>
                  <li>• Koleksiyonlar oluşturun</li>
                  <li>• Dosyalar yükleyin</li>
                </ul>
              </div>
              
              <div className="p-6 border rounded-lg">
                <h3 className="text-xl font-semibold mb-3">👥 İşbirliği</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Gruplar oluşturun</li>
                  <li>• Güvenle paylaşın</li>
                  <li>• Takım çalışması yapın</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading secrets: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBackToCollections && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBackToCollections}
                className="p-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </Button>
            )}
            <CardTitle className="text-2xl font-bold">
              {getContextTitle()}
            </CardTitle>
          </div>
          {(selectedProject || selectedGroup || selectedCollection) && (
            <Button onClick={handleAddSecret}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Secret
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2 mt-4">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search secrets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="ml-4">
            {filteredSecrets.length} secret{filteredSecrets.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading secrets...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSecrets.map((secret) => {
                const decryptedData = decryptedSecrets[secret.id];
                const isPasswordVisible = showPasswords[secret.id];
                
                return (
                  <TableRow key={secret.id}>
                    <TableCell className="font-medium">
                      {secret.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="truncate max-w-[150px]">
                          {decryptedData?.username || '-'}
                        </span>
                        {decryptedData?.username && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(decryptedData.username)}
                          >
                            <CopyIcon className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">
                          {isPasswordVisible && decryptedData 
                            ? decryptedData.password 
                            : '••••••••••'
                          }
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => togglePasswordVisibility(secret.id)}
                        >
                          {isPasswordVisible ? (
                            <EyeOffIcon className="w-3 h-3" />
                          ) : (
                            <EyeIcon className="w-3 h-3" />
                          )}
                        </Button>
                        {decryptedData && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(decryptedData.password)}
                          >
                            <CopyIcon className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {decryptedData?.url ? (
                          <>
                            <a
                              href={decryptedData.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-[150px]"
                            >
                              {decryptedData.url}
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(decryptedData.url || '')}
                            >
                              <CopyIcon className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {decryptedData?.notes ? (
                          <>
                            <span className="truncate max-w-[100px] text-sm text-gray-600">
                              {decryptedData.notes.length > 30 
                                ? `${decryptedData.notes.substring(0, 30)}...` 
                                : decryptedData.notes
                              }
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleViewNotes(secret.id)}
                              title="View full notes"
                            >
                              <FileTextIcon className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {secret.lastModified.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleEditSecret(secret.id)}
                        >
                          <EditIcon className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteSecret(secret.id)}
                        >
                          <TrashIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!isLoading && filteredSecrets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No secrets found matching your search.' : 'No secrets yet. Create your first secret!'}
          </div>
        )}
      </CardContent>

      <SecretModal
        open={isSecretModalOpen}
        onOpenChange={setIsSecretModalOpen}
        onSave={handleSaveSecret}
        initialData={editingSecret?.data}
        isEditing={!!editingSecret}
        projectId={selectedProject || undefined}
        groupId={selectedGroup || undefined}
        selectedCollection={selectedCollection || undefined}
      />

      {/* Notes Modal */}
      {selectedSecretNotes && (
        <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <FileTextIcon className="w-5 h-5" />
                <span>Notes - {selectedSecretNotes.name}</span>
              </DialogTitle>
              <DialogDescription>
                View and copy the notes for this secret.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="whitespace-pre-wrap text-sm text-gray-700 max-h-96 overflow-y-auto">
                  {selectedSecretNotes.notes}
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(selectedSecretNotes.notes)}
              >
                <CopyIcon className="w-4 h-4 mr-2" />
                Copy Notes
              </Button>
              <Button onClick={() => setIsNotesModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
