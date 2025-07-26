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
import { 
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { db, storage } from './firebase';
import { FileUpload } from '@/types';

export async function uploadFile(
  file: File,
  data: {
    projectId?: string;
    groupId?: string;
    collectionId?: string;
    ownerType: 'user' | 'group';
    ownerId: string;
  }
): Promise<string> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${timestamp}_${randomId}.${fileExtension}`;
    
    // Create storage path
    let storagePath: string;
    if (data.groupId) {
      storagePath = `groups/${data.groupId}/files/${uniqueFileName}`;
    } else if (data.projectId) {
      storagePath = `projects/${data.projectId}/files/${uniqueFileName}`;
    } else {
      storagePath = `users/${data.ownerId}/files/${uniqueFileName}`;
    }

    // Upload file to Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);

    // Create file document in Firestore
    const fileDocRef = doc(collection(db, 'files'));
    
    const fileData: Omit<FileUpload, 'id'> = {
      name: uniqueFileName,
      originalName: file.name,
      type: file.type,
      size: file.size,
      projectId: data.projectId,
      groupId: data.groupId,
      collectionId: data.collectionId,
      owner: {
        type: data.ownerType,
        id: data.ownerId
      },
      storagePath: storagePath,
      uploadedAt: new Date()
    };

    // Filter out undefined values for Firebase
    const firebaseData: Record<string, unknown> = {
      name: fileData.name,
      originalName: fileData.originalName,
      type: fileData.type,
      size: fileData.size,
      owner: fileData.owner,
      storagePath: fileData.storagePath,
      uploadedAt: Timestamp.fromDate(fileData.uploadedAt)
    };

    // Only add optional fields if they have values and are not undefined
    if (fileData.projectId !== undefined && fileData.projectId !== '') {
      firebaseData.projectId = fileData.projectId;
    }
    if (fileData.groupId !== undefined && fileData.groupId !== '') {
      firebaseData.groupId = fileData.groupId;
    }
    if (fileData.collectionId !== undefined && fileData.collectionId !== '') {
      firebaseData.collectionId = fileData.collectionId;
    }

    await setDoc(fileDocRef, firebaseData);

    return fileDocRef.id;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

export async function getFiles(
  projectId?: string,
  groupId?: string,
  collectionId?: string,
  userId?: string
): Promise<FileUpload[]> {
  try {
    const filesRef = collection(db, 'files');
    let q;

    if (collectionId) {
      // Get files for a specific collection
      q = query(
        filesRef,
        where('collectionId', '==', collectionId),
        orderBy('uploadedAt', 'desc')
      );
    } else if (groupId) {
      // Get files for a specific group
      q = query(
        filesRef,
        where('groupId', '==', groupId),
        orderBy('uploadedAt', 'desc')
      );
    } else if (projectId && userId) {
      // Get files for a specific project and user
      q = query(
        filesRef,
        where('projectId', '==', projectId),
        where('owner.id', '==', userId),
        where('owner.type', '==', 'user'),
        orderBy('uploadedAt', 'desc')
      );
    } else if (userId) {
      // Get all user files
      q = query(
        filesRef,
        where('owner.id', '==', userId),
        where('owner.type', '==', 'user'),
        orderBy('uploadedAt', 'desc')
      );
    } else {
      throw new Error('Either collectionId, groupId, or userId must be provided');
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        originalName: data.originalName,
        type: data.type,
        size: data.size,
        projectId: data.projectId,
        groupId: data.groupId,
        collectionId: data.collectionId,
        owner: data.owner,
        storagePath: data.storagePath,
        uploadedAt: data.uploadedAt.toDate()
      } as FileUpload;
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    throw new Error('Failed to fetch files');
  }
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
  try {
    // First get the file document to get the storage path
    const fileSnapshot = await getDocs(query(collection(db, 'files'), where('__name__', '==', fileId)));
    
    if (fileSnapshot.empty) {
      throw new Error('File not found');
    }

    const fileData = fileSnapshot.docs[0].data();
    const storageRef = ref(storage, fileData.storagePath);
    
    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    
    // Update the document with the download URL for caching
    await setDoc(doc(db, 'files', fileId), {
      downloadUrl: downloadUrl
    }, { merge: true });

    return downloadUrl;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw new Error('Failed to get file download URL');
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    // Get file document
    const fileSnapshot = await getDocs(query(collection(db, 'files'), where('__name__', '==', fileId)));
    
    if (fileSnapshot.empty) {
      throw new Error('File not found');
    }

    const fileData = fileSnapshot.docs[0].data();
    
    // Delete from Firebase Storage
    const storageRef = ref(storage, fileData.storagePath);
    await deleteObject(storageRef);
    
    // Delete from Firestore
    await deleteDoc(doc(db, 'files', fileId));
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Convenience functions for specific use cases
export async function getFilesByProject(projectId: string, userId: string): Promise<FileUpload[]> {
  return getFiles(projectId, undefined, undefined, userId);
}

export async function getFilesByGroup(groupId: string): Promise<FileUpload[]> {
  return getFiles(undefined, groupId);
}

export async function getFilesByOwner(userId: string, ownerType: 'user' | 'group'): Promise<FileUpload[]> {
  return getFiles(undefined, undefined, undefined, userId);
}

export async function getFilesByCollection(collectionId: string): Promise<FileUpload[]> {
  return getFiles(undefined, undefined, collectionId);
}
