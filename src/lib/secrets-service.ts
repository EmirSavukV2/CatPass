import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  generateDataKey, 
  encryptData, 
  decryptData, 
  encryptDataKey, 
  decryptDataKey
} from '@/lib/crypto';
import { Secret, SecretData, User } from '@/types';

/**
 * Service for managing encrypted secrets in Firestore
 */
export class SecretsService {
  private user: User;
  private privateKey: CryptoKey;
  private publicKey: CryptoKey | null = null;

  constructor(user: User, privateKey: CryptoKey) {
    this.user = user;
    this.privateKey = privateKey;
  }

  /**
   * Initialize the service by importing the user's public key
   */
  async initialize() {
    const { importPublicKey } = await import('@/lib/crypto');
    this.publicKey = await importPublicKey(this.user.publicKey);
  }

  /**
   * Create a new secret
   */
  async createSecret(
    secretData: SecretData, 
    projectId: string, 
    ownerType: 'user' | 'group' = 'user',
    ownerId?: string
  ): Promise<string> {
    try {
      // Generate a new data key for this secret
      const dataKey = generateDataKey();
      
      // Encrypt the secret data
      const jsonData = JSON.stringify(secretData);
      const encryptedData = await encryptData(jsonData, dataKey);
      
      let publicKeyToUse = this.publicKey;
      
      // If creating for a group, we need to get the group owner's public key
      if (ownerType === 'group' && ownerId) {
        const groupDoc = await getDoc(doc(db, 'groups', ownerId));
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          // Get the group owner's public key from users collection
          const ownerDoc = await getDoc(doc(db, 'users', groupData.ownerId));
          if (ownerDoc.exists()) {
            const ownerData = ownerDoc.data();
            if (ownerData.publicKey) {
              const { importPublicKey } = await import('@/lib/crypto');
              publicKeyToUse = await importPublicKey(ownerData.publicKey);
            }
          }
        }
      }
      
      if (!publicKeyToUse) {
        if (!this.publicKey) {
          await this.initialize();
        }
        publicKeyToUse = this.publicKey;
      }
      
      // Encrypt the data key with the appropriate public key
      const encryptedDataKey = await encryptDataKey(dataKey, publicKeyToUse!);
      
      // Create the secret document
      const secretDoc = {
        name: secretData.name,
        projectId,
        owner: {
          type: ownerType,
          id: ownerId || this.user.authUid
        },
        encryptedData,
        encryptedDataKey,
        lastModified: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'secrets'), secretDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating secret:', error);
      throw new Error('Failed to create secret');
    }
  }

  /**
   * Retrieve and decrypt a secret
   */
  async getSecret(secretId: string): Promise<SecretData | null> {
    try {
      const secretDoc = await getDoc(doc(db, 'secrets', secretId));
      
      if (!secretDoc.exists()) {
        return null;
      }

      const secretData = secretDoc.data();
      
      // Decrypt the data key
      const dataKey = await decryptDataKey(secretData.encryptedDataKey, this.privateKey);
      
      // Decrypt the secret data
      const decryptedJson = await decryptData(secretData.encryptedData, dataKey);
      
      return JSON.parse(decryptedJson);
    } catch (error) {
      console.error('Error retrieving secret:', error);
      throw new Error('Failed to retrieve secret');
    }
  }

  /**
   * Update an existing secret
   */
  async updateSecret(secretId: string, secretData: SecretData): Promise<void> {
    if (!this.publicKey) {
      await this.initialize();
    }

    try {
      // Generate a new data key for security
      const dataKey = generateDataKey();
      
      // Encrypt the updated secret data
      const jsonData = JSON.stringify(secretData);
      const encryptedData = await encryptData(jsonData, dataKey);
      
      // Encrypt the data key
      const encryptedDataKey = await encryptDataKey(dataKey, this.publicKey!);
      
      // Update the document
      await updateDoc(doc(db, 'secrets', secretId), {
        name: secretData.name,
        encryptedData,
        encryptedDataKey,
        lastModified: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating secret:', error);
      throw new Error('Failed to update secret');
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'secrets', secretId));
    } catch (error) {
      console.error('Error deleting secret:', error);
      throw new Error('Failed to delete secret');
    }
  }

  /**
   * Get all secrets for a specific project
   */
  async getSecretsForProject(projectId: string): Promise<Secret[]> {
    try {
      const q = query(
        collection(db, 'secrets'),
        where('projectId', '==', projectId),
        where('owner.id', '==', this.user.authUid),
        orderBy('lastModified', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const secrets: Secret[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        secrets.push({
          id: doc.id,
          name: data.name,
          projectId: data.projectId,
          owner: data.owner,
          encryptedData: data.encryptedData,
          encryptedDataKey: data.encryptedDataKey,
          lastModified: data.lastModified.toDate()
        });
      });

      return secrets;
    } catch (error) {
      console.error('Error fetching secrets for project:', error);
      throw new Error('Failed to fetch secrets');
    }
  }

  /**
   * Get all secrets for a specific group
   */
  async getSecretsForGroup(groupId: string): Promise<Secret[]> {
    try {
      const q = query(
        collection(db, 'secrets'),
        where('owner.type', '==', 'group'),
        where('owner.id', '==', groupId),
        orderBy('lastModified', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const secrets: Secret[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        secrets.push({
          id: doc.id,
          name: data.name,
          projectId: data.projectId,
          owner: data.owner,
          encryptedData: data.encryptedData,
          encryptedDataKey: data.encryptedDataKey,
          lastModified: data.lastModified.toDate()
        });
      });

      return secrets;
    } catch (error) {
      console.error('Error fetching secrets for group:', error);
      throw new Error('Failed to fetch secrets');
    }
  }

  /**
   * Get all user's secrets
   */
  async getAllUserSecrets(): Promise<Secret[]> {
    try {
      const q = query(
        collection(db, 'secrets'),
        where('owner.type', '==', 'user'),
        where('owner.id', '==', this.user.authUid),
        orderBy('lastModified', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const secrets: Secret[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        secrets.push({
          id: doc.id,
          name: data.name,
          projectId: data.projectId,
          owner: data.owner,
          encryptedData: data.encryptedData,
          encryptedDataKey: data.encryptedDataKey,
          lastModified: data.lastModified.toDate()
        });
      });

      return secrets;
    } catch (error) {
      console.error('Error fetching user secrets:', error);
      throw new Error('Failed to fetch secrets');
    }
  }
}
