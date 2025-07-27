import { NextRequest, NextResponse } from 'next/server';
import { initializeAdminApp } from '@/lib/firebase-admin';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// Initialize Firebase (only if not already initialized)
if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

// Add CORS headers for extension
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const admin = initializeAdminApp();
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const groupId = searchParams.get('groupId');

    console.log('Fetching secrets for user:', userId, { projectId, groupId });

    // Real database query
    let secrets: Array<{
      id: string;
      name: string;
      username: string;
      url: string;
      projectId?: string;
      groupId?: string;
      isEncrypted: boolean;
      owner: { type: string; id: string };
      lastModified: string;
    }> = [];
    
    try {
      let q;
      
      if (projectId) {
        console.log('Fetching secrets for project:', projectId);
        
        // Get secrets for specific project
        q = query(
          collection(db, 'secrets'),
          where('projectId', '==', projectId),
          orderBy('lastModified', 'desc')
        );
      } else if (groupId) {
        // Get secrets for specific group
        q = query(
          collection(db, 'secrets'),
          where('owner.type', '==', 'group'),
          where('owner.id', '==', groupId),
          orderBy('lastModified', 'desc')
        );
      } else {
        console.log('No project or group specified');
        // No project or group specified - return empty array
        return addCorsHeaders(NextResponse.json({ secrets: [] }));
      }
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if user has access to this secret
        // let hasAccess = false;
        
        // if (!data.isEncrypted) {
        //   // Plain text secrets - check ownership
        //   if (data.owner?.type === 'user' && data.owner?.id === userId) {
        //     hasAccess = true;
        //   } else if (data.owner?.type === 'group') {
        //     // For group secrets, we would need to check group membership
        //     // For now, assume user has access if it's a group secret
        //     hasAccess = true;
        //   }
        // } else {
        //   // Encrypted secrets - check if user has a data key
        //   if (data.encryptedDataKeys?.[userId]) {
        //     hasAccess = true;
        //   } else if (data.owner?.type === 'group' && data.encryptedDataKeys?.[`group:${data.owner.id}`]) {
        //     // User might have access through group membership
        //     hasAccess = true;
        //   }
        // }
        
          secrets.push({
            id: doc.id,
            name: data.name,
            username: 'hidden', // Don't expose username in list view
            url: data.url || '',
            projectId: data.projectId,
            groupId: data.owner?.type === 'group' ? data.owner.id : undefined,
            isEncrypted: data.isEncrypted,
            owner: data.owner,
            lastModified: data.lastModified?.toDate?.()?.toISOString() || new Date().toISOString()
          });
      });
      
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Fallback to mock data on database error
      secrets = getMockSecrets(projectId, groupId);
    }

    return addCorsHeaders(NextResponse.json({ secrets }));

  } catch (error) {
    console.error('Secrets fetch error:', error);
    return addCorsHeaders(NextResponse.json({ error: 'Failed to fetch secrets' }, { status: 500 }));
  }
}

// Fallback mock data function
function getMockSecrets(projectId?: string | null, groupId?: string | null) {
  const mockSecrets = [
    { 
      id: 'secret-1', 
      name: 'Gmail (Encrypted)', 
      username: 'hidden', 
      url: 'https://gmail.com', 
      projectId: 'project-1',
      isEncrypted: true,
      owner: { type: 'user', id: 'demo-user' },
      lastModified: new Date().toISOString()
    },
    { 
      id: 'secret-2', 
      name: 'Netflix (Plain)', 
      username: 'hidden', 
      url: 'https://netflix.com', 
      projectId: 'project-1',
      isEncrypted: false,
      owner: { type: 'user', id: 'demo-user' },
      lastModified: new Date().toISOString()
    },
    { 
      id: 'secret-3', 
      name: 'Company Portal (Encrypted)', 
      username: 'hidden', 
      url: 'https://company.com', 
      projectId: 'project-2',
      isEncrypted: true,
      owner: { type: 'user', id: 'demo-user' },
      lastModified: new Date().toISOString()
    },
    { 
      id: 'secret-4', 
      name: 'Slack (Plain)', 
      username: 'hidden', 
      url: 'https://company.slack.com', 
      projectId: 'project-2',
      isEncrypted: false,
      owner: { type: 'user', id: 'demo-user' },
      lastModified: new Date().toISOString()
    }
  ];

  if (projectId) {
    return mockSecrets.filter(s => s.projectId === projectId);
  } else if (groupId) {
    return mockSecrets.filter(s => s.owner.type === 'group');
  }
  
  return [];
}
