import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          setCurrentUser(user);
          setLoading(false);
        },
        (error) => {
          console.error('Auth error:', error);
          setAuthError(error.message);
          setLoading(false);
        }
      );
    } catch (e) {
      console.error('Firebase init error:', e);
      setAuthError(e.message);
      setLoading(false);
    }
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712', color: '#9ca3af', fontFamily: 'sans-serif' }}>
        Loading...
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712', color: '#f87171', fontFamily: 'sans-serif', flexDirection: 'column', gap: '8px' }}>
        <div>Firebase auth error</div>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>{authError}</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser }}>
      {children}
    </AuthContext.Provider>
  );
};
