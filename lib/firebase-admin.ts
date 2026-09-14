import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sb-erp-app',
      });
    }
  } catch (e) {
    console.warn('Firebase Admin SDK initialization skipped or failed:', e);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;

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
