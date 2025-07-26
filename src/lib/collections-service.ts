'use client';

import { 
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Collection } from '@/types';

export async function createCollection(data: {
  name: string;
  description?: string;
  projectId?: string;
  groupId?: string;
  ownerType: 'user' | 'group';
  ownerId: string;
}): Promise<string> {
  try {
    const collectionRef = doc(collection(db, 'collections'));
    
    const collectionData: Omit<Collection, 'id'> = {
      name: data.name,
      description: data.description,
      projectId: data.projectId,
      groupId: data.groupId,
      owner: {
        type: data.ownerType,
        id: data.ownerId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating collection with data:', collectionData);
    

    // Filter out undefined values for Firebase
    const firebaseData: Record<string, unknown> = {
      name: collectionData.name,
      owner: collectionData.owner,
      createdAt: Timestamp.fromDate(collectionData.createdAt),
      updatedAt: Timestamp.fromDate(collectionData.updatedAt)
    };

    // Only add optional fields if they have values and are not undefined
    if (collectionData.description !== undefined && collectionData.description !== '') {
      firebaseData.description = collectionData.description;
    }
    if (collectionData.projectId !== undefined && collectionData.projectId !== '') {
      firebaseData.projectId = collectionData.projectId;
    }
    if (collectionData.groupId !== undefined && collectionData.groupId !== '') {
      firebaseData.groupId = collectionData.groupId;
    }

    await setDoc(collectionRef, firebaseData);

    return collectionRef.id;
  } catch (error) {
    console.error('Error creating collection:', error);
    throw new Error('Failed to create collection');
  }
}

export async function getCollections(
  projectId?: string,
  groupId?: string,
  userId?: string
): Promise<Collection[]> {
  try {
    const collectionsRef = collection(db, 'collections');
    let q;

    if (groupId) {
      // Get collections for a specific group
      q = query(
        collectionsRef,
        where('groupId', '==', groupId),
        orderBy('createdAt', 'desc')
      );
    } else if (projectId && userId) {
      // Get collections for a specific project and user - remove complex query
      q = query(
        collectionsRef,
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      );
    } else if (userId) {
      // Get all user collections - simplified query
      q = query(
        collectionsRef,
        where('owner.id', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      throw new Error('Either groupId or userId must be provided');
    }

    const snapshot = await getDocs(q);
    let collections = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        projectId: data.projectId,
        groupId: data.groupId,
        owner: data.owner,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Collection;
    });

    // Filter on client side for project-specific user collections
    if (projectId && userId && !groupId) {
      collections = collections.filter(col => 
        col.owner.type === 'user' && col.owner.id === userId
      );
    }

    return collections;
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw new Error('Failed to fetch collections');
  }
}

export async function updateCollection(
  collectionId: string,
  updates: {
    name?: string;
    description?: string;
  }
): Promise<void> {
  try {
    const collectionRef = doc(db, 'collections', collectionId);
    
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries({
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      }).filter(([, value]) => value !== undefined)
    );
    
    await setDoc(collectionRef, filteredUpdates, { merge: true });
  } catch (error) {
    console.error('Error updating collection:', error);
    throw new Error('Failed to update collection');
  }
}

export async function deleteCollection(collectionId: string): Promise<void> {
  try {
    const collectionRef = doc(db, 'collections', collectionId);
    await deleteDoc(collectionRef);
  } catch (error) {
    console.error('Error deleting collection:', error);
    throw new Error('Failed to delete collection');
  }
}
