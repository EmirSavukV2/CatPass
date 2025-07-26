'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useVault } from '@/contexts/VaultContext';
import { addUserToGroup } from '@/lib/groups-service';
import { useToast } from '@/components/ui/toast';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
  groupId: string;
  groupName: string;
}

export function InviteUserModal({ isOpen, onClose, onInviteSent, groupId, groupName }: InviteUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'member' as 'admin' | 'member'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { privateKey } = useVault();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !user?.uid) return;

    if (!privateKey) {
      showToast({
        type: 'error',
        title: 'Hata',
        message: 'Vault kilidi açılmamış. Lütfen vault kilidini açın.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await addUserToGroup(
        groupId, 
        formData.email.trim(), 
        formData.role, 
        user.uid,
        privateKey
      );

      showToast({
        type: 'success',
        title: 'Kullanıcı Eklendi',
        message: `${formData.email} gruba başarıyla eklendi.`,
      });

      setFormData({ email: '', role: 'member' });
      onInviteSent();
      onClose();
    } catch (error) {
      console.error('Error adding user to group:', error);
      showToast({
        type: 'error',
        title: 'Hata',
        message: error instanceof Error ? error.message : 'Kullanıcı eklenirken hata oluştu.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{groupName} - Kullanıcı Ekle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta Adresi *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="kullanici@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="member">Üye</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
              disabled={isLoading || !formData.email.trim()}
            >
              {isLoading ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
