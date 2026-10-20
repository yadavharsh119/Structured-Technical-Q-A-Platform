'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const AUTH_KEY = 'dp_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed reading session:', e);
    } finally {
      setLoading(false);
      fetchUsers();
    }
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    setUser(data.user);
    localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
    await fetchUsers();
    return data.user;
  };

  const register = async (formData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    setUser(data.user);
    localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
    await fetchUsers();
    return data.user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    showToast('Signed out successfully', 'info');
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated');

    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...updates }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Profile update failed');
    }

    setUser(data.user);
    localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
    await fetchUsers();
    return data.user;
  };

  const getUserById = (id) => {
    return allUsers.find(u => u.id === id) || (user?.id === id ? user : null);
  };

  const getUserByUsername = (username) => {
    return allUsers.find(u => u.username?.toLowerCase() === username?.toLowerCase()) || 
      (user?.username?.toLowerCase() === username?.toLowerCase() ? user : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        toast,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        getUserById,
        getUserByUsername,
        showToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
