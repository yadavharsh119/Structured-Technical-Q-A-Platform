'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, generateId, mockDelay } from '@/lib/utils';
import { SEED_USERS } from '@/lib/seed';

const AuthContext = createContext(null);

const STORAGE_KEY = 'dp_auth';
const USERS_KEY   = 'dp_users';

function initUsers() {
  const existing = storage.get(USERS_KEY);
  if (!existing) {
    storage.set(USERS_KEY, SEED_USERS);
    return SEED_USERS;
  }
  return existing;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);

  // Restore session on mount
  useEffect(() => {
    initUsers();
    const saved = storage.get(STORAGE_KEY);
    if (saved) {
      // Re-fetch fresh user data from users store
      const users = storage.get(USERS_KEY, []);
      const fresh = users.find(u => u.id === saved.id);
      if (fresh) setUser(fresh);
    }
    setLoading(false);
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const login = useCallback(async (email, password) => {
    await mockDelay(400);
    const users = storage.get(USERS_KEY, []);
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) {
      throw new Error('Invalid email or password');
    }
    const { password: _pw, ...safeUser } = found;
    setUser(found);
    storage.set(STORAGE_KEY, { id: found.id });
    return found;
  }, []);

  const register = useCallback(async (formData) => {
    await mockDelay(500);
    const users = storage.get(USERS_KEY, []);

    if (users.find(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      throw new Error('An account with this email already exists');
    }
    if (users.find(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
      throw new Error('This username is already taken');
    }

    const AVATAR_COLORS = ['#6C63FF', '#00D9FF', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];
    const colorIdx = users.length % AVATAR_COLORS.length;

    const newUser = {
      id: generateId('u'),
      username: formData.username.trim(),
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      bio: formData.bio ? formData.bio.trim() : '',
      avatarColor: AVATAR_COLORS[colorIdx],
      avatarInitials: formData.name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2),
      experienceLevel: formData.experienceLevel || 'Junior',
      yearsExp: Number(formData.yearsExp) || 0,
      skills: formData.skills || [],
      joinedAt: new Date().toISOString(),
      questionsCount: 0,
      perspectivesCount: 0,
      votesReceived: 0,
    };

    const updated = [...users, newUser];
    storage.set(USERS_KEY, updated);
    setUser(newUser);
    storage.set(STORAGE_KEY, { id: newUser.id });
    return newUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    storage.remove(STORAGE_KEY);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    await mockDelay(300);
    const users = storage.get(USERS_KEY, []);
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) throw new Error('User not found');

    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    storage.set(USERS_KEY, users);
    setUser(updated);
    return updated;
  }, [user]);

  const getUserById = useCallback((id) => {
    const users = storage.get(USERS_KEY, []);
    return users.find(u => u.id === id) || null;
  }, []);

  const getUserByUsername = useCallback((username) => {
    const users = storage.get(USERS_KEY, []);
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateProfile,
      getUserById,
      getUserByUsername,
      showToast,
      toast,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
