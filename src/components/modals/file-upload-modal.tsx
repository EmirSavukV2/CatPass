'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';
import { uploadFile, formatFileSize } from '@/lib/files-service';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUploaded: () => void;
  projectId?: string;
  groupId?: string;
  collectionId?: string;
}

export function FileUploadModal({ 
  isOpen, 
  onClose, 
  onFileUploaded, 
  projectId, 
  groupId,
  collectionId 
}: FileUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {

    console.log('Submitting file upload', { user, selectedFiles, projectId, groupId, collectionId });
    

    e.preventDefault();
    if (!user || !user.uid || selectedFiles.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const ownerType = groupId ? 'group' : 'user';
      const ownerId = groupId || user.uid;

      // Upload files one by one
      for (const file of selectedFiles) {
        await uploadFile(file, {
          projectId,
          groupId,
          collectionId,
          ownerType,
          ownerId
        });
      }

      showToast({
        type: 'success',
        title: 'Dosyalar Yüklendi',
        message: `${selectedFiles.length} dosya başarıyla yüklendi.`,
      });

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onFileUploaded();
      onClose();
    } catch (error) {
      console.error('Error uploading files:', error);
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Dosyalar yüklenirken bir hata oluştu.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Dosya Yükle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="files">Dosyaları Seçin</Label>
            <Input
              id="files"
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="cursor-pointer"
            />
            <p className="text-sm text-gray-500">
              Birden fazla dosya seçebilirsiniz.
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Seçilen Dosyalar</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {file.type || 'Unknown'} • {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || selectedFiles.length === 0}
            >
              {isLoading ? 'Yükleniyor...' : `${selectedFiles.length} Dosya Yükle`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
