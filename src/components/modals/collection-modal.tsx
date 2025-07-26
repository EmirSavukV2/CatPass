'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';
import { createCollection } from '@/lib/collections-service';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCollectionCreated: () => void;
  projectId?: string;
  groupId?: string;
}

export function CollectionModal({ 
  isOpen, 
  onClose, 
  onCollectionCreated, 
  projectId, 
  groupId 
}: CollectionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid || !formData.name.trim()) {
      console.error('Missing user data:', { user, uid: user?.uid, name: formData.name });
      return;
    }

    setIsLoading(true);
    try {
      const ownerType = groupId ? 'group' : 'user';
      const ownerId = groupId || user.uid;

      await createCollection({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        projectId,
        groupId,
        ownerType,
        ownerId
      });

      showToast({
        type: 'success',
        title: 'Koleksiyon Oluşturuldu',
        message: 'Yeni koleksiyon başarıyla oluşturuldu.',
      });

      setFormData({ name: '', description: '' });
      onCollectionCreated();
      onClose();
    } catch (error) {
      console.error('Error creating collection:', error);
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Koleksiyon oluşturulurken bir hata oluştu.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yeni Koleksiyon Oluştur</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Koleksiyon Adı</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Koleksiyon adını girin"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Koleksiyon açıklaması"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Oluşturuluyor...' : 'Koleksiyon Oluştur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
