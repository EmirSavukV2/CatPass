import { 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  collection,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  generateDataKey, 
  encryptData, 
  decryptData, 
  encryptDataKey, 
  decryptDataKey,
  importPublicKey
} from './crypto';
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
   * Create a new secret with support for multiple users (groups)
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
      
      const encryptedDataKeys: { [userId: string]: string } = {};
      
      if (ownerType === 'group' && ownerId) {
        // For group secrets, encrypt data key with group public key
        const groupDoc = await getDoc(doc(db, 'groups', ownerId));
        if (!groupDoc.exists()) {
          throw new Error('Grup bulunamadı');
        }
        
        const groupData = groupDoc.data();
        console.log('Group data retrieved:', { 
          id: ownerId, 
          groupPublicKey: groupData?.groupPublicKey ? 'exists' : 'missing',
          groupData: groupData 
        });
        
        if (!groupData?.groupPublicKey) {
          throw new Error('Grup public key bulunamadı. Grup düzgün oluşturulmamış olabilir.');
        }
        
        const groupPublicKey = await importPublicKey(groupData.groupPublicKey);
        
        // Encrypt data key with group public key - all group members will be able to decrypt
        // using their encrypted group private key
        encryptedDataKeys['group:' + ownerId] = await encryptDataKey(dataKey, groupPublicKey);
      } else {
        // For user secrets, encrypt data key only for the user
        if (!this.publicKey) {
          await this.initialize();
        }
        encryptedDataKeys[this.user.authUid] = await encryptDataKey(dataKey, this.publicKey!);
      }
      
      // Create the secret document
      const secretDoc = {
        name: secretData.name,
        projectId,
        owner: {
          type: ownerType,
          id: ownerId || this.user.authUid
        },
        encryptedData,
        encryptedDataKeys,
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
   * Retrieve and decrypt a secret (supports both user and group secrets)
   */
  async getSecret(secretId: string): Promise<SecretData | null> {
    try {
      const secretDoc = await getDoc(doc(db, 'secrets', secretId));
      
      if (!secretDoc.exists()) {
        return null;
      }

      const secretData = secretDoc.data();
      
      // First try user's own key
      const userEncryptedDataKey = secretData.encryptedDataKeys?.[this.user.authUid];
      let dataKey: ArrayBuffer;
      
      if (userEncryptedDataKey) {
        // User secret - decrypt with user's private key
        dataKey = await decryptDataKey(userEncryptedDataKey, this.privateKey);
      } else {
        // Check if this is a group secret and user has access through group membership
        const owner = secretData.owner;
        if (owner?.type === 'group') {
          const groupEncryptedDataKey = secretData.encryptedDataKeys?.[`group:${owner.id}`];
          if (!groupEncryptedDataKey) {
            throw new Error('Bu şifreye erişim yetkiniz yok');
          }
          
          // Get user's group membership to access group private key
          const { getGroupMembership } = await import('@/lib/groups-service');
          const membership = await getGroupMembership(this.user.authUid, owner.id);
          
          if (!membership) {
            throw new Error('Bu gruba üye değilsiniz');
          }
          
          // Decrypt group private key with user's private key
          const { decryptGroupPrivateKey } = await import('@/lib/crypto');
          const groupPrivateKey = await decryptGroupPrivateKey(
            membership.membership.encryptedGroupPrivateKey,
            this.privateKey
          );
          
          // Decrypt the data key with group private key
          dataKey = await decryptDataKey(groupEncryptedDataKey, groupPrivateKey);
        } else {
          throw new Error('Bu şifreye erişim yetkiniz yok');
        }
      }
      
      // Decrypt the secret data
      const decryptedJson = await decryptData(secretData.encryptedData, dataKey);
      
      return JSON.parse(decryptedJson);
    } catch (error) {
      console.error('Error retrieving secret:', error);
      throw new Error('Failed to retrieve secret');
    }
  }

  /**
   * Update an existing secret (supports both user and group secrets)
   */
  async updateSecret(secretId: string, secretData: SecretData): Promise<void> {
    try {
      // First get the existing secret to preserve encrypted data keys
      const secretDoc = await getDoc(doc(db, 'secrets', secretId));
      if (!secretDoc.exists()) {
        throw new Error('Secret not found');
      }

      const existingData = secretDoc.data();
      
      // Generate a new data key for security
      const dataKey = generateDataKey();
      
      // Encrypt the updated secret data
      const jsonData = JSON.stringify(secretData);
      const encryptedData = await encryptData(jsonData, dataKey);
      
      // Re-encrypt data key preserving the same access pattern
      const encryptedDataKeys: { [userId: string]: string } = {};
      
      for (const keyId of Object.keys(existingData.encryptedDataKeys || {})) {
        if (keyId.startsWith('group:')) {
          // This is a group secret - re-encrypt with group public key
          const groupId = keyId.substring(6); // Remove 'group:' prefix
          const groupDoc = await getDoc(doc(db, 'groups', groupId));
          if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            const groupPublicKey = await importPublicKey(groupData.groupPublicKey);
            encryptedDataKeys[keyId] = await encryptDataKey(dataKey, groupPublicKey);
          }
        } else {
          // This is a user secret - re-encrypt with user's public key
          const userDoc = await getDoc(doc(db, 'users', keyId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userPublicKey = await importPublicKey(userData.publicKey);
            encryptedDataKeys[keyId] = await encryptDataKey(dataKey, userPublicKey);
          }
        }
      }
      
      // Update the document
      await updateDoc(doc(db, 'secrets', secretId), {
        name: secretData.name,
        encryptedData,
        encryptedDataKeys,
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
   * Get all secrets for a specific project (supports both user and group secrets)
   */
  async getSecretsForProject(projectId: string): Promise<Secret[]> {
    try {
      const q = query(
        collection(db, 'secrets'),
        where('projectId', '==', projectId),
        orderBy('lastModified', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const secrets: Secret[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only include secrets the current user can access
        if (data.encryptedDataKeys && data.encryptedDataKeys[this.user.authUid]) {
          secrets.push({
            id: doc.id,
            name: data.name,
            projectId: data.projectId,
            owner: data.owner,
            encryptedData: data.encryptedData,
            encryptedDataKeys: data.encryptedDataKeys,
            lastModified: data.lastModified.toDate()
          });
        }
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
        
        // Check if user can access this group secret
        const groupEncryptedDataKey = data.encryptedDataKeys && data.encryptedDataKeys[`group:${groupId}`];
        if (groupEncryptedDataKey) {
          secrets.push({
            id: doc.id,
            name: data.name,
            projectId: data.projectId,
            owner: data.owner,
            encryptedData: data.encryptedData,
            encryptedDataKeys: data.encryptedDataKeys,
            lastModified: data.lastModified.toDate()
          });
        }
      });

      return secrets;
    } catch (error) {
      console.error('Error fetching secrets for group:', error);
      throw new Error('Failed to fetch secrets');
    }
  }

  /**
   * Get all user's secrets (both owned and shared)
   */
  async getAllUserSecrets(): Promise<Secret[]> {
    try {
      // Get all secrets where user has access (either owner or has encrypted data key)
      const allSecretsQuery = query(
        collection(db, 'secrets'),
        orderBy('lastModified', 'desc')
      );
      
      const querySnapshot = await getDocs(allSecretsQuery);
      const secrets: Secret[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Include secret if user can access it
        if (data.encryptedDataKeys && data.encryptedDataKeys[this.user.authUid]) {
          secrets.push({
            id: doc.id,
            name: data.name,
            projectId: data.projectId,
            owner: data.owner,
            encryptedData: data.encryptedData,
            encryptedDataKeys: data.encryptedDataKeys,
            lastModified: data.lastModified.toDate()
          });
        }
      });

      return secrets;
    } catch (error) {
      console.error('Error fetching user secrets:', error);
      throw new Error('Failed to fetch secrets');
    }
  }
}
