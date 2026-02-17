import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { queryClient } from './lib/queryClient';
import MainLayout from './components/layout/MainLayout';
import ConfirmationProvider from './components/ConfirmationProvider';

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
import ReleaseContractWizard from './pages/ReleaseContractWizard';
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

import Admin from './pages/Admin';
import Royalties from './pages/Royalties';
import Playlists from './pages/Playlists';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';

// Office Placeholder Pages
import OfficeDocuments from './pages/office/Documents';
import OfficeEvents from './pages/office/Events';
import OfficeTasks from './pages/office/Tasks';
import OfficeNotes from './pages/office/Notes';
import OfficeReports from './pages/office/Reports';
import OfficeStatusQuo from './pages/office/StatusQuo';

// Network
import NetworkDashboard from './pages/network/NetworkDashboard';
import AllContacts from './pages/network/AllContacts';
import Organizations from './pages/network/Organizations';
import Individuals from './pages/network/Individuals';
import Platforms from './pages/network/Platforms';
import Relationships from './pages/network/Relationships';
import OrganizationDetail from './pages/network/OrganizationDetail';
import IndividualDetail from './pages/network/IndividualDetail';
import PlatformDetail from './pages/network/PlatformDetail';

// AI
import AI from './pages/AI';
import AIAnalytics from './pages/AIAnalytics';

import './App.css';

import ErrorBoundary from './components/ErrorBoundary';
import { FirstRunGuard } from './components/FirstRunGuard';
import SetupWizard from './pages/SetupWizard';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConfirmationProvider>
            <ThemeProvider>
              <HashRouter>
                <FirstRunGuard>
                  <Routes>
                    <Route path="/setup" element={<SetupWizard />} />
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
                      path="/release/:id/contract-wizard"
                      element={
                        <ProtectedRoute>
                          <MainLayout>
                            <ReleaseContractWizard />
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
                      path="/office/status-quo"
                      element={
                        <ProtectedRoute>
                          <MainLayout>
                            <OfficeStatusQuo />
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
                      path="/office/documents"
                      element={
                        <ProtectedRoute>
                          <MainLayout>
                            <OfficeDocuments />
                          </MainLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/office/notes"
                      element={
                        <ProtectedRoute>
                          <MainLayout>
                            <OfficeNotes />
                          </MainLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/office/reports"
                      element={
                        <ProtectedRoute>
                          <MainLayout>
                            <OfficeReports />
                          </MainLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/office/tasks"
                      element={
                        <ProtectedRoute>
                          <MainLayout>
                            <OfficeTasks />
                          </MainLayout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/office/events"
                      element={
                        <ProtectedRoute>
                          <MainLayout>
                            <OfficeEvents />
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
                    {/* AI Route */}
                    <Route path="/ai" element={<ProtectedRoute><MainLayout><AI /></MainLayout></ProtectedRoute>} />
                    <Route path="/ai/analytics" element={<ProtectedRoute><MainLayout><AIAnalytics /></MainLayout></ProtectedRoute>} />

                    {/* Network Routes */}
                    <Route path="/network" element={<ProtectedRoute><MainLayout><NetworkDashboard /></MainLayout></ProtectedRoute>} />
                    <Route path="/network/contacts" element={<ProtectedRoute><MainLayout><AllContacts /></MainLayout></ProtectedRoute>} />
                    <Route path="/network/organizations" element={<ProtectedRoute><MainLayout><Organizations /></MainLayout></ProtectedRoute>} />
                    <Route path="/network/organizations/:id" element={<ProtectedRoute><MainLayout><OrganizationDetail /></MainLayout></ProtectedRoute>} />
                    <Route path="/network/individuals" element={<ProtectedRoute><MainLayout><Individuals /></MainLayout></ProtectedRoute>} />
                    <Route path="/network/individuals/:id" element={<ProtectedRoute><MainLayout><IndividualDetail /></MainLayout></ProtectedRoute>} />
                    <Route path="/network/platforms" element={<ProtectedRoute><MainLayout><Platforms /></MainLayout></ProtectedRoute>} />
                    <Route path="/network/platforms/:id" element={<ProtectedRoute><MainLayout><PlatformDetail /></MainLayout></ProtectedRoute>} />
                    <Route path="/network/relationships" element={<ProtectedRoute><MainLayout><Relationships /></MainLayout></ProtectedRoute>} />

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </FirstRunGuard>
              </HashRouter>
            </ThemeProvider>
          </ConfirmationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
