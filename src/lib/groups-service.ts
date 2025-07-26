/**
 * Simple groups service for basic group management
 */

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
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { GroupMembership } from '@/types';
import { 
  generateGroupKeyPair, 
  exportPublicKey, 
  encryptGroupPrivateKeyForUser,
  importPublicKey 
} from './crypto';

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  memberIds: string[];
  memberEmails: string[];
  groupPublicKey: string;    // Group public key in PEM format
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  memberIds: string[];
  memberEmails: string[];
  groupPublicKey: string;
}

/**
 * Search for a user by email in the users collection
 */
export async function findUserByEmail(email: string): Promise<{ uid: string; email: string; displayName?: string } | null> {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase())
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    return {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName
    };
  } catch {
    throw new Error('Kullanıcı aranırken hata oluştu');
  }
}

/**
 * Add a user to a group and create encrypted group private key for them
 */
export async function addUserToGroup(
  groupId: string,
  userEmail: string,
  role: 'admin' | 'member',
  currentUserId: string,
  currentUserPrivateKey: CryptoKey // Need this to decrypt group private key
): Promise<void> {
  try {
    // First, find the user by email
    const foundUser = await findUserByEmail(userEmail);
    if (!foundUser) {
      throw new Error('Bu e-posta adresine sahip kullanıcı bulunamadı');
    }
    
    // Get the user's public key
    const userDoc = await getDoc(doc(db, 'users', foundUser.uid));
    if (!userDoc.exists()) {
      throw new Error('Kullanıcı bilgileri bulunamadı');
    }
    const userData = userDoc.data();
    const userPublicKey = await importPublicKey(userData.publicKey);
    
    // Get the group to check permissions and existing members
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) {
      throw new Error('Grup bulunamadı');
    }
    
    const group = groupSnap.data() as Group;
    
    // Check if current user has permission to add members
    const currentUserMember = group.memberIds?.includes(currentUserId);
    const isOwner = group.ownerId === currentUserId;
    
    if (!currentUserMember && !isOwner) {
      throw new Error('Bu işlem için yetkiniz yok');
    }
    
    // Check if user is already a member
    const isAlreadyMember = group.memberIds?.includes(foundUser.uid) || 
                           group.memberEmails?.includes(foundUser.email);
    
    if (isAlreadyMember) {
      throw new Error('Bu kullanıcı zaten grup üyesi');
    }
    
    // Get current user's group membership to decrypt group private key
    const currentUserGroupMembership = await getDocs(query(
      collection(db, 'groupMemberships'),
      where('userId', '==', currentUserId),
      where('groupId', '==', groupId)
    ));
    
    if (currentUserGroupMembership.empty) {
      throw new Error('Grup private key\'ine erişiminiz yok');
    }
    
    const membershipData = currentUserGroupMembership.docs[0].data();
    const { decryptGroupPrivateKey } = await import('@/lib/crypto');
    
    // Decrypt group private key with current user's private key
    const groupPrivateKey = await decryptGroupPrivateKey(
      membershipData.encryptedGroupPrivateKey,
      currentUserPrivateKey
    );
    
    // Encrypt group private key for the new user
    const encryptedGroupPrivateKeyForNewUser = await encryptGroupPrivateKeyForUser(
      groupPrivateKey,
      userPublicKey
    );
    
    // Add the user to the group
    await updateDoc(groupRef, {
      memberIds: arrayUnion(foundUser.uid),
      memberEmails: arrayUnion(foundUser.email),
      updatedAt: serverTimestamp()
    });
    
    // Create group membership entry for the new user
    await addDoc(collection(db, 'groupMemberships'), {
      userId: foundUser.uid,
      groupId: groupId,
      encryptedGroupPrivateKey: encryptedGroupPrivateKeyForNewUser,
      createdAt: serverTimestamp()
    });
    
  } catch (error) {
    throw error;
  }
}

/**
 * Create a group with proper cryptographic setup
 */
export async function createGroupWithCrypto(
  groupData: Omit<CreateGroupData, 'groupPublicKey'>
): Promise<string> {
  try {
    console.log('Starting group creation with crypto for:', groupData.name);
    
    // Generate group key pair
    console.log('Generating group key pair...');
    const groupKeyPair = await generateGroupKeyPair();
    console.log('Group key pair generated successfully');
    
    console.log('Exporting group public key...');
    const groupPublicKeyPem = await exportPublicKey(groupKeyPair.publicKey);
    console.log('Group public key exported successfully');
    
    // Get owner's public key
    console.log('Fetching owner data for userId:', groupData.ownerId);
    const ownerDoc = await getDoc(doc(db, 'users', groupData.ownerId));
    if (!ownerDoc.exists()) {
      throw new Error('Grup sahibi bulunamadı');
    }
    const ownerData = ownerDoc.data();
    console.log('Owner data fetched:', ownerData);
    
    if (!ownerData.publicKey) {
      throw new Error('Grup sahibinin public key\'i bulunamadı. Lütfen tekrar giriş yapın.');
    }
    console.log('Owner public key found, importing...');
    
    const ownerPublicKey = await importPublicKey(ownerData.publicKey);
    console.log('Owner public key imported successfully');
    
    // Encrypt group private key for the owner
    console.log('Encrypting group private key for owner...');
    const encryptedGroupPrivateKeyForOwner = await encryptGroupPrivateKeyForUser(
      groupKeyPair.privateKey,
      ownerPublicKey
    );
    console.log('Group private key encrypted successfully');
    
    // Create the group
    console.log('Creating group document...');
    const groupId = await createGroup({
      ...groupData,
      groupPublicKey: groupPublicKeyPem
    });
    console.log('Group document created with ID:', groupId);
    
    // Create group membership for owner
    console.log('Creating group membership for owner...');
    await addDoc(collection(db, 'groupMemberships'), {
      userId: groupData.ownerId,
      groupId: groupId,
      encryptedGroupPrivateKey: encryptedGroupPrivateKeyForOwner,
      createdAt: serverTimestamp()
    });
    console.log('Group membership created successfully');
    
    console.log('Group creation completed successfully');
    return groupId;
  } catch (error) {
    console.error('Error creating group with crypto:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw new Error('Grup oluşturulurken hata oluştu');
  }
}

/**
 * Create a new group
 */
export async function createGroup(groupData: CreateGroupData): Promise<string> {
  try {
    // Validate required fields
    if (!groupData.name || !groupData.ownerId) {
      throw new Error('Name and ownerId are required');
    }

    console.log('Creating group with data:', {
      name: groupData.name,
      ownerId: groupData.ownerId,
      groupPublicKey: groupData.groupPublicKey ? 'exists' : 'missing'
    });

    const docRef = await addDoc(collection(db, 'groups'), {
      name: groupData.name,
      description: groupData.description || '',
      ownerId: groupData.ownerId,
      ownerEmail: groupData.ownerEmail || '',
      memberIds: groupData.memberIds || [groupData.ownerId], // Include owner as member
      memberEmails: groupData.memberEmails || [groupData.ownerEmail],
      groupPublicKey: groupData.groupPublicKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('Group document created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating group:', error);
    throw new Error('Grup oluşturulurken hata oluştu');
  }
}

/**
 * Get groups for a user
 */
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    const q = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    }) as Group[];
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw new Error('Gruplar yüklenirken hata oluştu');
  }
}

/**
 * Update a group
 */
export async function updateGroup(groupId: string, updates: Partial<Group>): Promise<void> {
  try {
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating group:', error);
    throw new Error('Grup güncellenirken hata oluştu');
  }
}

/**
 * Get group membership with decrypted group private key
 */
export async function getGroupMembership(
  userId: string, 
  groupId: string
): Promise<{ membership: GroupMembership; groupPrivateKey?: CryptoKey } | null> {
  try {
    const q = query(
      collection(db, 'groupMemberships'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const membershipDoc = querySnapshot.docs[0];
    const membershipData = membershipDoc.data();
    
    return {
      membership: {
        id: membershipDoc.id,
        userId: membershipData.userId,
        groupId: membershipData.groupId,
        encryptedGroupPrivateKey: membershipData.encryptedGroupPrivateKey,
        createdAt: membershipData.createdAt?.toDate() || new Date()
      }
    };
  } catch (error) {
    console.error('Error fetching group membership:', error);
    return null;
  }
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<void> {
  try {
    const docRef = doc(db, 'groups', groupId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting group:', error);
    throw new Error('Grup silinirken hata oluştu');
  }
}

