import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountKey)),
      });
    } else {
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sb-erp-app',
      });
    }
  } catch (e) {
    console.warn('Firebase Admin SDK initialization skipped or failed:', e);
  }
}

export const adminAuth = getApps().length ? getAuth() : null;

export async function verifyFirebaseToken(token: string) {
  if (!adminAuth) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch (err) {
    console.error('Error verifying Firebase token:', err);
    return null;
  }
}
