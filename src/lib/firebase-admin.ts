import admin from 'firebase-admin';

export function initializeAdminApp() {
    const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };
    // Eğer uygulama zaten başlatılmışsa, tekrar başlatma
    if (admin.apps.length > 0) {
        return admin.app();
    }


    // Ayrıştırılmış kimlik bilgileriyle Firebase Admin'i başlat
    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}