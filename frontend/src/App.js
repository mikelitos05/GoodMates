import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Shared
import Navbar from './components/shared/Navbar';
import Footer from './components/shared/Footer';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Auth / Public
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Tenant
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantProfile from './pages/tenant/TenantProfile';
import PropertySearch from './pages/tenant/PropertySearch';
import PropertyDetail from './pages/tenant/PropertyDetail';
import MatchesPage from './pages/tenant/MatchesPage';

// Landlord
import LandlordDashboard from './pages/landlord/LandlordDashboard';
import PropertyManager from './pages/landlord/PropertyManager';

// Roommate
import RoommateGroup from './pages/roommate/RoommateGroup';
import TaskManager from './pages/roommate/TaskManager';
import MatesBoard from './pages/roommate/MatesBoard';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Tenant Routes */}
              <Route path="/tenant/dashboard" element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <TenantDashboard />
                </ProtectedRoute>
              } />
              <Route path="/tenant/profile" element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <TenantProfile />
                </ProtectedRoute>
              } />
              <Route path="/tenant/properties" element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <PropertySearch />
                </ProtectedRoute>
              } />
              <Route path="/tenant/properties/:id" element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <PropertyDetail />
                </ProtectedRoute>
              } />
              <Route path="/tenant/matches" element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <MatchesPage />
                </ProtectedRoute>
              } />

              {/* Landlord Routes */}
              <Route path="/landlord/dashboard" element={
                <ProtectedRoute allowedRoles={['landlord']}>
                  <LandlordDashboard />
                </ProtectedRoute>
              } />
              <Route path="/landlord/properties" element={
                <ProtectedRoute allowedRoles={['landlord']}>
                  <PropertyManager />
                </ProtectedRoute>
              } />

              {/* Roommate Routes (accessible by tenants) */}
              <Route path="/roommate/group" element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <RoommateGroup />
                </ProtectedRoute>
              } />
              <Route path="/roommate/tasks" element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <TaskManager />
                </ProtectedRoute>
              } />
              <Route path="/roommate/board" element={
                <ProtectedRoute allowedRoles={['tenant']}>
                  <MatesBoard />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
