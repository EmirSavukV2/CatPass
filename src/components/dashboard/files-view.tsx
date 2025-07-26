'use client';

import { useState, useEffect, useCallback } from 'react';
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
  SearchIcon, 
  TrashIcon,
  DownloadIcon,
  UploadIcon
} from 'lucide-react';
import { FileUploadModal } from '@/components/modals/file-upload-modal';
import { useToast } from '@/components/ui/toast';
import { FileUpload } from '@/types';
import { 
  getFilesByProject, 
  getFilesByGroup, 
  formatFileSize, 
  getFileDownloadUrl,
  deleteFile 
} from '@/lib/files-service';
import { useAuth } from '@/contexts/AuthContext';

interface FilesViewProps {
  selectedProject?: string | null;
  selectedGroup?: string | null;
}

export function FilesView({ selectedProject, selectedGroup }: FilesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadFiles = useCallback(async () => {
    if (!user?.uid) return;
    
    // Don't load files if no project or group is selected
    if (!selectedProject && !selectedGroup) {
      setFiles([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let loadedFiles: FileUpload[];
      
      if (selectedProject && user?.uid) {
        loadedFiles = await getFilesByProject(selectedProject, user.uid);
      } else if (selectedGroup) {
        loadedFiles = await getFilesByGroup(selectedGroup);
      } else {
        // This should not happen anymore, but just in case
        loadedFiles = [];
      }
      
      setFiles(loadedFiles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dosyalar yüklenirken hata oluştu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, selectedGroup, user?.uid]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleAddFile = () => {
    setIsModalOpen(true);
  };

  const handleFileUploaded = () => {
    loadFiles(); // Refresh files list
    setIsModalOpen(false);
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const downloadUrl = await getFileDownloadUrl(fileId);
      
      // Create temporary link to download file
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast({
        type: 'success',
        title: 'Dosya İndiriliyor',
        message: 'Dosya indirme işlemi başlatıldı'
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'İndirme hatası',
        message: error instanceof Error ? error.message : 'Dosya indirilemedi'
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Bu dosyayı silmek istediğinize emin misiniz?')) {
      try {
        await deleteFile(fileId);
        await loadFiles(); // Refresh list
        showToast({
          type: 'success',
          title: 'Dosya silindi',
          message: 'Dosya başarıyla silindi'
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

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗂️';
    return '📄';
  };

  const getContextTitle = () => {
    if (selectedProject) {
      return 'Proje Dosyaları';
    }
    if (selectedGroup) {
      return 'Grup Dosyaları';
    }
    return 'Dosyalar';
  };

  // Show welcome screen if no project or group is selected
  if (!selectedProject && !selectedGroup) {
    return (
      <Card>
        <CardContent className="pt-16 pb-16 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <div className="text-6xl mb-4">📁</div>
              <h1 className="text-3xl font-bold mb-4">Dosyalar</h1>
              <p className="text-lg text-gray-600 mb-8">
                Dosyalarınızı güvenle saklayın ve paylaşın
              </p>
            </div>
            
            <div className="p-6 border rounded-lg max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-3">🚀 Başlamak için</h3>
              <ul className="space-y-2 text-gray-600 text-left">
                <li>• Sol menüden bir proje seçin</li>
                <li>• Veya bir grup oluşturun/seçin</li>
                <li>• Sonra dosyalar yükleyebilirsiniz</li>
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
            Dosyalar yüklenirken hata: {error}
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
            {(selectedProject || selectedGroup) && (
              <Button onClick={handleAddFile}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Dosya Yükle
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Dosya ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="ml-4">
              {filteredFiles.length} dosya
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Dosyalar yükleniyor...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dosya</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Boyut</TableHead>
                  <TableHead>Yüklenme Tarihi</TableHead>
                  <TableHead className="w-[100px]">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getFileTypeIcon(file.type)}</span>
                        <div>
                          <div className="font-medium">{file.originalName}</div>
                          <div className="text-sm text-gray-500">{file.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {file.uploadedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleDownloadFile(file.id, file.originalName)}
                        >
                          <DownloadIcon className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteFile(file.id)}
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
          {!isLoading && filteredFiles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Arama kriterinize uygun dosya bulunamadı.' : 'Henüz dosya yok. İlk dosyanızı yükleyin!'}
            </div>
          )}
        </CardContent>
      </Card>

      <FileUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFileUploaded={handleFileUploaded}
        projectId={selectedProject || undefined}
        groupId={selectedGroup || undefined}
      />
    </>
  );
}
