'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createProject } from '@/lib/projects-service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export function ProjectModal({ isOpen, onClose, onProjectCreated }: ProjectModalProps) {
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
      await createProject({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        ownerId: user.uid,
        ownerEmail: user.email || '',
        memberIds: [user.uid],
        memberEmails: [user.email || ''],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      showToast({
        type: 'success',
        title: 'Proje Oluşturuldu',
        message: 'Yeni proje başarıyla oluşturuldu.',
      });

      setFormData({ name: '', description: '' });
      onProjectCreated();
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Proje oluşturulurken bir hata oluştu.',
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
          <DialogTitle>Yeni Proje Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Proje Adı</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Proje adını girin"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Proje açıklaması"
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
              {isLoading ? 'Oluşturuluyor...' : 'Proje Oluştur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
