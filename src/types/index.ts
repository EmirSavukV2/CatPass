export interface User {
  uid: string;
  authUid: string;
  email: string;
  displayName: string;
  publicKey: string;         // Public key in PEM format
  encryptedPrivateKey: string; // Base64 encoded
  kdfSalt: string;           // Base64 encoded
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;           // users/{userId}
  ownerEmail: string;
  memberIds: string[];       // Array of user IDs
  memberEmails: string[];    // Array of user emails
  createdAt: Date;
  updatedAt: Date;
}

export interface Secret {
  id: string;
  name: string;
  projectId: string;         // projects/{projectId}
  collectionId?: string;     // collections/{collectionId} - optional
  owner: {
    type: 'user' | 'group';
    id: string;              // users/{userId} or groups/{groupId}
  };
  encryptedData: string;     // The AES-GCM encrypted secret content
  encryptedDataKeys: {       // Multiple encrypted data keys for different users
    [userId: string]: string; // RSA-OAEP encrypted dataKey for each user
  };
  lastModified: Date;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  projectId?: string;        // Optional - belongs to a project
  groupId?: string;          // Optional - belongs to a group  
  owner: {
    type: 'user' | 'group';
    id: string;              // users/{userId} or groups/{groupId}
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FileUpload {
  id: string;
  name: string;
  originalName: string;
  type: string;              // MIME type
  size: number;              // Size in bytes
  projectId?: string;        // Optional - belongs to a project
  groupId?: string;          // Optional - belongs to a group
  collectionId?: string;     // Optional - belongs to a collection
  owner: {
    type: 'user' | 'group';
    id: string;              // users/{userId} or groups/{groupId}
  };
  storagePath: string;       // Firebase Storage path
  downloadUrl?: string;      // Firebase Storage download URL (loaded on demand)
  uploadedAt: Date;
}

export interface SecretData {
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;           // The creating user's ID
  ownerEmail: string;
  memberIds: string[];       // Array of user IDs
  memberEmails: string[];    // Array of user emails
  groupPublicKey: string;    // Group's public key in PEM format
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMembership {
  id: string;
  userId: string;
  groupId: string;
  // Key that gives this user access to the group's private key
  encryptedGroupPrivateKey: string;
  createdAt: Date;
}

export interface VaultState {
  isUnlocked: boolean;
  privateKey: CryptoKey | null;
  user: User | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}
