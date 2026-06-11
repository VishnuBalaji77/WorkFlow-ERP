// import axios from 'axios';

// const API_BASE = import.meta.env.VITE_BACKEND_URL
//   ? `${import.meta.env.VITE_BACKEND_URL}/api`
//   : '/api';

// const api = axios.create({
//   baseURL: API_BASE,
//   withCredentials: true,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// export const formatApiError = (error) => {
//   const detail = error.response?.data?.detail;
//   if (detail == null) return 'Something went wrong. Please try again.';
//   if (typeof detail === 'string') return detail;
//   if (Array.isArray(detail))
//     return detail
//       .map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e)))
//       .filter(Boolean)
//       .join(' ');
//   if (detail && typeof detail.msg === 'string') return detail.msg;
//   return String(detail);
// };

// export default api;



import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Requests from './pages/Requests';
import Attendance from './pages/Attendance';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Teams from './pages/Teams';
import AuditForms from './pages/AuditForms';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import Documents from './pages/Documents';
import Search from './pages/Search';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'hr', 'project_manager']}>
                <Layout><Employees /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <Layout><Requests /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Layout><Attendance /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Layout><Projects /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Layout><Tasks /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'hr', 'project_manager']}>
                <Layout><Teams /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms"
            element={
              <ProtectedRoute>
                <Layout><AuditForms /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'auditor']}>
                <Layout><AuditLogs /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Layout><Notifications /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Layout><Documents /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Layout><Search /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'hr', 'project_manager']}>
                <Layout><AnalyticsDashboard /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;



