import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Use Vite env variable syntax (VITE_ prefix), fallback to empty string for demo mode
const API_BASE = '/api';

function formatApiErrorDetail(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}

// Demo users for offline/demo mode (no backend required)
const DEMO_USERS = [
  { id: 1, email: 'admin@demo.com', password: 'admin123', name: 'Admin User', role: 'super_admin', department: 'Management' },
  { id: 2, email: 'hr@demo.com', password: 'hr123', name: 'HR Manager', role: 'hr', department: 'Human Resources' },
  { id: 3, email: 'pm@demo.com', password: 'pm123', name: 'Project Manager', role: 'project_manager', department: 'Engineering' },
  { id: 4, email: 'employee@demo.com', password: 'emp123', name: 'John Employee', role: 'employee', department: 'Engineering' },
  { id: 5, email: 'auditor@demo.com', password: 'aud123', name: 'Audit Officer', role: 'auditor', department: 'Compliance' },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Demo mode: restore from sessionStorage
    if (!API_BASE) {
      const stored = sessionStorage.getItem('erp_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${API_BASE}/auth/me`, { withCredentials: true });
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    // Demo mode
    if (!API_BASE) {
      const found = DEMO_USERS.find(
        (u) => u.email === email && u.password === password
      );
      if (found) {
        const { password: _, ...safeUser } = found;
        setUser(safeUser);
        sessionStorage.setItem('erp_user', JSON.stringify(safeUser));
        return { success: true };
      }
      return { success: false, error: 'Invalid email or password. Try admin@demo.com / admin123' };
    }

    try {
      const { data } = await axios.post(
        `${API_BASE}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      setUser(data);
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: formatApiErrorDetail(e.response?.data?.detail) || e.message,
      };
    }
  };

  const register = async (email, password, name, role = 'employee', department = null) => {
    // Demo mode
    if (!API_BASE) {
      const exists = DEMO_USERS.find((u) => u.email === email);
      if (exists) return { success: false, error: 'Email already registered' };
      const newUser = { id: Date.now(), email, name, role, department };
      setUser(newUser);
      sessionStorage.setItem('erp_user', JSON.stringify(newUser));
      return { success: true };
    }

    try {
      const { data } = await axios.post(
        `${API_BASE}/auth/register`,
        { email, password, name, role, department },
        { withCredentials: true }
      );
      setUser(data);
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: formatApiErrorDetail(e.response?.data?.detail) || e.message,
      };
    }
  };

  const logout = async () => {
    if (!API_BASE) {
      sessionStorage.removeItem('erp_user');
      setUser(null);
      return;
    }
    try {
      await axios.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};