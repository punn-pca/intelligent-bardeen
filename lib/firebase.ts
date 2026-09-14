import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';

function getStoredFirebaseConfig() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sb_firebase_config');
      if (stored) return JSON.parse(stored);
      const storedKey = localStorage.getItem('sb_firebase_api_key');
      if (storedKey) {
        return {
          apiKey: storedKey,
          authDomain: localStorage.getItem('sb_firebase_auth_domain') || 'sb-erp-app.firebaseapp.com',
          projectId: localStorage.getItem('sb_firebase_project_id') || 'sb-erp-app',
        };
      }
    } catch {}
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoKeyForSBErpSystem2026',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'sb-erp-app.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sb-erp-app',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'sb-erp-app.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
  };
}

let app: FirebaseApp;
let auth: Auth;

try {
  const config = getStoredFirebaseConfig();
  app = !getApps().length ? initializeApp(config) : getApp();
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase init warning:', e);
  app = !getApps().length
    ? initializeApp({
        apiKey: 'AIzaSyDemoKeyForSBErpSystem2026',
        authDomain: 'sb-erp-app.firebaseapp.com',
        projectId: 'sb-erp-app',
      })
    : getApp();
  auth = getAuth(app);
}

const googleProvider = new GoogleAuthProvider();

export function saveFirebaseConfig(config: { apiKey: string; authDomain?: string; projectId?: string }) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sb_firebase_config', JSON.stringify(config));
    window.location.reload();
  }
}

export {
  app,
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type FirebaseUser,
};
