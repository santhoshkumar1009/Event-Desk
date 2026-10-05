import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/Toast';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AIChatWidget from './components/AIChatWidget';

import Login from './pages/Login';
import Register from './pages/Register';

// Student Pages
import DiscoverEvents from './pages/student/DiscoverEvents';
import MyRegistrations from './pages/student/MyRegistrations';
import Leaderboard from './pages/student/Leaderboard';
import TeamFormation from './pages/student/TeamFormation';
import SubmissionPortal from './pages/student/SubmissionPortal';
import LostFoundPage from './pages/student/LostFoundPage';
import EventFeedbackPage from './pages/student/EventFeedbackPage';
import HelpSupportPage from './pages/student/HelpSupportPage';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import EventsManager from './pages/organizer/EventsManager';
import ScheduleCalendar from './pages/organizer/ScheduleCalendar';
import RegistrationsManager from './pages/organizer/RegistrationsManager';
import QRScannerPage from './pages/organizer/QRScannerPage';
import AnnouncementsManager from './pages/organizer/AnnouncementsManager';
import VolunteersManager from './pages/organizer/VolunteersManager';
import TaskKanban from './pages/organizer/TaskKanban';
import BudgetTracker from './pages/organizer/BudgetTracker';
import LostItemsManager from './pages/organizer/LostItemsManager';
import SubmissionsReviewer from './pages/organizer/SubmissionsReviewer';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import BudgetReviewPage from './pages/admin/BudgetReviewPage';
import UserManagement from './pages/admin/UserManagement';
import SettingsPage from './pages/admin/SettingsPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ORGANIZER') return <Navigate to="/organizer" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/discover" replace />;
  }

  return children;
}

function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onOpenAIChat={() => setIsAIChatOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Floating AI Assistant Launcher Button */}
      {!isAIChatOpen && (
        <button
          onClick={() => setIsAIChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-xl shadow-purple-500/30 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 border border-white/20"
          title="Ask EventDesk AI Assistant"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Ask EventDesk AI</span>
        </button>
      )}

      <AIChatWidget isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <Router>
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Default Redirect */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/discover" replace />
                    </ProtectedRoute>
                  }
                />

                {/* Student Routes */}
                <Route
                  path="/discover"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT', 'ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <DiscoverEvents />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-registrations"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT', 'ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <MyRegistrations />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT', 'ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <Leaderboard />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/team-formation"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT', 'ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <TeamFormation />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/submissions"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT', 'ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <SubmissionPortal />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lost-items"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT', 'ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <LostFoundPage />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/feedback"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT', 'ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <EventFeedbackPage />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT', 'ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <HelpSupportPage />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Organizer Routes */}
                <Route
                  path="/organizer"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <OrganizerDashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/events"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <EventsManager />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/schedule"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <ScheduleCalendar />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/registrations"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <RegistrationsManager />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/scanner"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <QRScannerPage />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/submissions"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <SubmissionsReviewer />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/lost-items"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <LostItemsManager />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/announcements"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <AnnouncementsManager />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/volunteers"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <VolunteersManager />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/tasks"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <TaskKanban />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/organizer/budget"
                  element={
                    <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                      <MainLayout>
                        <BudgetTracker />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <MainLayout>
                        <AdminDashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/budget-reviews"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <MainLayout>
                        <BudgetReviewPage />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <MainLayout>
                        <UserManagement />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <MainLayout>
                        <SettingsPage />
                      </MainLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Catch All */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
