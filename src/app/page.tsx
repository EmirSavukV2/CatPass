'use client';

import { useState, useEffect } from 'react';
import DashboardLayout, { useDashboard } from '@/components/dashboard/layout';
import { SecretsTable } from '@/components/dashboard/secrets-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollectionsView } from '@/components/dashboard/collections-view';
import { FilesView } from '@/components/dashboard/files-view';

function DashboardContent() {
  const { selectedProject, selectedGroup } = useDashboard();
  const [selectedCollection, setSelectedCollection] = useState<{id: string, name: string} | null>(null);
  const [activeTab, setActiveTab] = useState('secrets');

  // Clear selected collection when project or group changes
  useEffect(() => {
    setSelectedCollection(null);
  }, [selectedProject, selectedGroup]);

  const handleCollectionSelect = (collectionId: string, collectionName: string) => {
    setSelectedCollection({ id: collectionId, name: collectionName });
    setActiveTab('secrets'); // Switch to secrets tab to show collection secrets
  };

  const handleBackToCollections = () => {
    setSelectedCollection(null);
    setActiveTab('collections');
  };

  // Show welcome content if no project or group is selected
  if (!selectedProject && !selectedGroup) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">
              🐱 CatPass&apos;e Hoş Geldiniz
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Güvenli şifre yöneticisi ile şifrelerinizi organize edin ve ekibinizle güvenle paylaşın.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="text-3xl mb-4">🔐</div>
              <h3 className="text-lg font-semibold mb-2">Güvenli Şifre Yönetimi</h3>
              <p className="text-gray-600">
                Şifreleriniz client-side encryption ile güvenli şekilde saklanır.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Ekip Paylaşımı</h3>
              <p className="text-gray-600">
                Gruplar oluşturun ve şifrelerinizi ekibinizle güvenle paylaşın.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="text-3xl mb-4">📁</div>
              <h3 className="text-lg font-semibold mb-2">Organize Edin</h3>
              <p className="text-gray-600">
                Projeler ve koleksiyonlar ile şifrelerinizi düzenli tutun.
              </p>
            </div>
          </div>
          
          <div className="mt-12 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Başlamak için:</h3>
            <ol className="text-left max-w-md mx-auto space-y-2 text-gray-700">
              <li>1. Sol taraftan bir proje seçin veya yeni proje oluşturun</li>
              <li>2. Veya bir grup oluşturun/katılın</li>
              <li>3. Şifrelerinizi, koleksiyonlarınızı ve dosyalarınızı yönetin</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="secrets">
            {selectedCollection ? `${selectedCollection.name} - Şifreler` : 'Şifreler'}
          </TabsTrigger>
          <TabsTrigger value="collections">Koleksiyonlar</TabsTrigger>
          <TabsTrigger value="files">Dosyalar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="secrets" className="mt-6">
          <SecretsTable
            selectedProject={selectedProject}
            selectedGroup={selectedGroup}
            selectedCollection={selectedCollection?.id}
            collectionName={selectedCollection?.name}
            onBackToCollections={selectedCollection ? handleBackToCollections : undefined}
          />
        </TabsContent>
        
        <TabsContent value="collections" className="mt-6">
          <CollectionsView
            selectedProject={selectedProject}
            selectedGroup={selectedGroup}
            onCollectionSelect={handleCollectionSelect}
          />
        </TabsContent>
        
        <TabsContent value="files" className="mt-6">
          <FilesView
            selectedProject={selectedProject}
            selectedGroup={selectedGroup}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Home() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
