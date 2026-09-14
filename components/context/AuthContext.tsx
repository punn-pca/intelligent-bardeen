'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
} from '@/lib/firebase';
import { useRole } from './RoleContext';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  authUser: AuthUser | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  authUser: null,
  loading: true,
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setCurrentRole } = useRole();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Fetch or create user in DB to sync role
        try {
          const idToken = await fbUser.getIdToken();
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            }),
          });

          if (res.ok) {
            const userData = await res.json();
            const role = userData.role || 'USER';
            setAuthUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || userData.name,
              photoURL: fbUser.photoURL,
              role,
            });
            setCurrentRole(role);
          } else {
            setAuthUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || 'User',
              photoURL: fbUser.photoURL,
              role: 'ADMIN',
            });
            setCurrentRole('ADMIN');
          }
        } catch (e) {
          console.error('Error syncing auth user:', e);
          setAuthUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            role: 'ADMIN',
          });
        }
      } else {
        setAuthUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setCurrentRole]);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      const idToken = await cred.user.getIdToken();
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: cred.user.uid,
          email: cred.user.email,
          name,
        }),
      });
    }
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setAuthUser(null);
    setCurrentRole('ADMIN');
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        authUser,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
