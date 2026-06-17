import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('chat_user');
    const savedToken = localStorage.getItem('chat_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('chat_user');
        localStorage.removeItem('chat_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (nickname, password) => {
    const res = await authApi.login(nickname, password);
    setUser(res.data.user);
    localStorage.setItem('chat_token', res.data.token);
    localStorage.setItem('chat_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const register = async (nickname, password) => {
    const res = await authApi.register(nickname, password);
    setUser(res.data.user);
    localStorage.setItem('chat_token', res.data.token);
    localStorage.setItem('chat_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chat_token');
    localStorage.removeItem('chat_user');
  };

  const updateUser = (newUser) => {
    setUser(newUser);
    localStorage.setItem('chat_user', JSON.stringify(newUser));
  };

  const getToken = () => localStorage.getItem('chat_token');

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
