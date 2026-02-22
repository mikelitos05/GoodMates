import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';


import Navbar from './components/shared/Navbar';
import Footer from './components/shared/Footer';
import ProtectedRoute from './components/shared/ProtectedRoute';
import IntroVideo from './components/shared/IntroVideo';


import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';


import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantProfile from './pages/tenant/TenantProfile';
import PropertySearch from './pages/tenant/PropertySearch';
import PropertyDetail from './pages/tenant/PropertyDetail';
import MatchesPage from './pages/tenant/MatchesPage';


import LandlordDashboard from './pages/landlord/LandlordDashboard';
import PropertyManager from './pages/landlord/PropertyManager';


import RoommateGroup from './pages/roommate/RoommateGroup';
import TaskManager from './pages/roommate/TaskManager';
import MatesBoard from './pages/roommate/MatesBoard';


import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroFinish = () => {
    setShowIntro(false);
  };

  return (
    <AuthProvider>
      {showIntro && <IntroVideo onFinish={handleIntroFinish} />}
      <Router>
        <div className="app" style={{ display: showIntro ? 'none' : 'block' }}>
          <Navbar />
          <main className="main-content">
            <Routes>
              
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              
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

              
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              
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
