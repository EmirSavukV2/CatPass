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
  PlusIcon, 
  SearchIcon, 
  EditIcon,
  TrashIcon,
  FolderIcon
} from 'lucide-react';
import { CollectionModal } from '@/components/modals/collection-modal';
import { useCollections } from '@/hooks/use-collections';
import { useToast } from '@/components/ui/toast';

interface CollectionsViewProps {
  selectedProject?: string | null;
  selectedGroup?: string | null;
  onCollectionSelect?: (collectionId: string, collectionName: string) => void;
}

export function CollectionsView({ selectedProject, selectedGroup, onCollectionSelect }: CollectionsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  
  const { 
    collections, 
    isLoading, 
    error, 
    refreshCollections,
    deleteCollection
  } = useCollections(selectedProject || undefined, selectedGroup || undefined);

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCollection = () => {
    setIsModalOpen(true);
  };

  const handleCollectionCreated = () => {
    refreshCollections();
    setIsModalOpen(false);
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (confirm('Bu koleksiyonu silmek istediğinize emin misiniz?')) {
      try {
        await deleteCollection(collectionId);
        showToast({
          type: 'success',
          title: 'Koleksiyon silindi',
          message: 'Koleksiyon başarıyla silindi'
        });
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Silme hatası',
          message: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
        });
      }
    }
  };

  const getContextTitle = () => {
    if (selectedProject) {
      return 'Proje Koleksiyonları';
    }
    if (selectedGroup) {
      return 'Grup Koleksiyonları';
    }
    return 'Koleksiyonlar';
  };

  // Show welcome screen if no project or group is selected
  if (!selectedProject && !selectedGroup) {
    return (
      <Card>
        <CardContent className="pt-16 pb-16 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="text-6xl mb-4">📁</div>
              <h1 className="text-3xl font-bold mb-4">Koleksiyonlar</h1>
              <p className="text-lg text-gray-600 mb-8">
                Şifrelerinizi düzenlemek için koleksiyonlar oluşturun
              </p>
            </div>
            
            <div className="p-6 border rounded-lg max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-3">🚀 Başlamak için</h3>
              <ul className="space-y-2 text-gray-600 text-left">
                <li>• Sol menüden bir proje seçin</li>
                <li>• Veya bir grup oluşturun/seçin</li>
                <li>• Sonra koleksiyonlar oluşturabilirsiniz</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Koleksiyonlar yüklenirken hata: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {getContextTitle()}
            </CardTitle>
            <Button onClick={handleAddCollection}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Koleksiyon Oluştur
            </Button>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Koleksiyon ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="ml-4">
              {filteredCollections.length} koleksiyon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Koleksiyonlar yükleniyor...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İsim</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Oluşturulma Tarihi</TableHead>
                  <TableHead className="w-[100px]">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <FolderIcon className="w-4 h-4 text-blue-500" />
                        <button
                          className="text-left hover:text-blue-600 hover:underline"
                          onClick={() => onCollectionSelect?.(collection.id, collection.name)}
                        >
                          {collection.name}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600 truncate max-w-[200px]">
                        {collection.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {collection.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => {/* TODO: Edit collection */}}
                        >
                          <EditIcon className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteCollection(collection.id)}
                        >
                          <TrashIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && filteredCollections.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Arama kriterinize uygun koleksiyon bulunamadı.' : 'Henüz koleksiyon yok. İlk koleksiyonunuzu oluşturun!'}
            </div>
          )}
        </CardContent>
      </Card>

      <CollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCollectionCreated={handleCollectionCreated}
        projectId={selectedProject || undefined}
        groupId={selectedGroup || undefined}
      />
    </>
  );
}
