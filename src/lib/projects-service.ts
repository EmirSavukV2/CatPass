/**
 * Simple projects service for basic project management
 */

import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface Project {
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

export interface CreateProjectData {
  name: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  memberIds: string[];
  memberEmails: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new project
 */
export async function createProject(projectData: CreateProjectData): Promise<string> {
  try {
    // Validate required fields
    if (!projectData.name || !projectData.ownerId) {
      throw new Error('Name and ownerId are required');
    }

    const docRef = await addDoc(collection(db, 'projects'), {
      name: projectData.name,
      description: projectData.description || '',
      ownerId: projectData.ownerId,
      ownerEmail: projectData.ownerEmail || '',
      memberIds: projectData.memberIds || [],
      memberEmails: projectData.memberEmails || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating project:', error);
    throw new Error('Proje oluşturulurken hata oluştu');
  }
}

/**
 * Get projects for a user
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  try {
    const q = query(
      collection(db, 'projects'),
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
    }) as Project[];
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Projeler yüklenirken hata oluştu');
  }
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
  try {
    const docRef = doc(db, 'projects', projectId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating project:', error);
    throw new Error('Proje güncellenirken hata oluştu');
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const docRef = doc(db, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting project:', error);
    throw new Error('Proje silinirken hata oluştu');
  }
}
