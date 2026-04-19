import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  // Clear session and wipe state
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('session_start');
    setUser(null);
    clearTimeout(inactivityTimer.current);
  }, []);

  // Reset the inactivity countdown on any user activity
  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      console.warn('Session expired due to inactivity.');
      logout();
    }, SESSION_TIMEOUT_MS);
  }, [logout]);

  // Attach activity listeners when user is logged in
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer(); // Start the clock immediately

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  // On mount — restore session from token if valid
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data);
        } catch (error) {
          // Token expired or invalid — clear everything silently
          localStorage.removeItem('token');
          localStorage.removeItem('session_start');
        }
      }
      setLoading(false);
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('session_start', Date.now().toString());
    const userRes = await api.get('/auth/me');
    setUser(userRes.data);
    return userRes.data;
  };

  const signup = async (name, email, password, role) => {
    await api.post('/auth/signup', { name, email, password, role });
    return await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
