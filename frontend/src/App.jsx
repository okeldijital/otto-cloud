import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { queryClient } from './lib/queryClient';
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Labels from './pages/Labels';
import LabelDetail from './pages/LabelDetail';
import Publishers from './pages/Publishers';
import PublisherDetail from './pages/PublisherDetail';
import PROs from './pages/PROs'; // Add this
import Artists from './pages/Artists';
import ArtistDetail from './pages/ArtistDetail';
import Releases from './pages/Releases';
import ReleaseDetail from './pages/ReleaseDetail';
import Works from './pages/Works';
import WorkDetail from './pages/WorkDetail';
import Tracks from './pages/Tracks';
import TrackDetail from './pages/TrackDetail';
// Administration of Works
import ContractsList from './pages/admin-of-works/ContractsList';
import ContractDetailAdmin from './pages/admin-of-works/ContractDetail';
import WorksAdminList from './pages/admin-of-works/WorksAdminList';
import WorksAdminDetail from './pages/admin-of-works/WorksAdminDetail';
import StatusQuoDashboard from './pages/admin-of-works/StatusQuoDashboard';

import Royalties from './pages/Royalties';
import Documents from './pages/Documents';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import Events from './pages/Events';
import Playlists from './pages/Playlists';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import CRM from './pages/CRM';

import './App.css';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HashRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Catalog />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/labels"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Labels />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/labels/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <LabelDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/publishers"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Publishers />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/publishers/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <PublisherDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/pros"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <PROs />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/artists"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Artists />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/artists/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ArtistDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/releases"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Releases />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/releases/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ReleaseDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/works"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Works />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/works/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <WorkDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Administration of Works Routes */}
              <Route
                path="/admin-of-works/contracts"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ContractsList />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-of-works/contracts/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ContractDetailAdmin />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-of-works/works"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <WorksAdminList />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-of-works/works/:work_id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <WorksAdminDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-of-works/status-quo"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <StatusQuoDashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/tracks"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Tracks />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog/tracks/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <TrackDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/royalties"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Royalties />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Documents />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notes"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Notes />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Tasks />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Events />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/playlists"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Playlists />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Settings />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Analytics />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <MainLayout>
                      <Admin />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/crm"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CRM />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
