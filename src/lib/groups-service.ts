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
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  memberIds: string[];
  memberEmails: string[];
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
 * Add a user to a group directly (if user exists)
 */
export async function addUserToGroup(
  groupId: string,
  userEmail: string,
  role: 'admin' | 'member',
  currentUserId: string
): Promise<void> {
  try {
    // First, find the user by email
    const foundUser = await findUserByEmail(userEmail);
    if (!foundUser) {
      throw new Error('Bu e-posta adresine sahip kullanıcı bulunamadı');
    }
    
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
    
    // Add the user to the group
    await updateDoc(groupRef, {
      memberIds: arrayUnion(foundUser.uid),
      memberEmails: arrayUnion(foundUser.email),
      updatedAt: serverTimestamp()
    });
    
  } catch (error) {
    throw error;
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

    const docRef = await addDoc(collection(db, 'groups'), {
      name: groupData.name,
      description: groupData.description || '',
      ownerId: groupData.ownerId,
      ownerEmail: groupData.ownerEmail || '',
      memberIds: groupData.memberIds || [],
      memberEmails: groupData.memberEmails || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch {
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

