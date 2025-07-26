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
  owner: {
    type: 'user' | 'group';
    id: string;              // users/{userId} or groups/{groupId}
  };
  encryptedData: string;     // The AES-GCM encrypted secret content
  encryptedDataKey: string;  // The RSA-OAEP encrypted dataKey
  lastModified: Date;
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
  groupPublicKey: string;
  createdAt: Date;
}

export interface GroupMembership {
  id: string;
  userId: string;
  groupId: string;
  // Key that gives this user access to the group's private key
  encryptedGroupPrivateKey: string;
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
