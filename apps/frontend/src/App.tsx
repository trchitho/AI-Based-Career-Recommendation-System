import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { ChatbotWrapper } from './components/chatbot/ChatbotWrapper';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import AssessmentPage from './pages/AssessmentPage';
import ResultsPage from './pages/ResultsPage';
import SessionResultsPage from './pages/SessionResultsPage';
import AssessmentHistoryPage from './pages/AssessmentHistoryPage';
import RoadmapPage from './pages/RoadmapPage';
import ReportPage from './pages/ReportPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import CareersPage from './pages/CareersPage';
import CareerDetailPage from './pages/CareerDetailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import BlogCreatePage from './pages/admin/BlogCreatePage';
import BlogEditPage from './pages/admin/BlogEditPage';
import BlogManagementPage from './pages/admin/BlogManagementPage';
import UserBlogCreatePage from './pages/BlogCreatePage';
import ChatSummaryPage from './pages/ChatSummaryPage';
import ChatPage from './pages/ChatPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import { PaymentPage } from './pages/PaymentPage';
import PaymentReturn from './components/payment/PaymentReturn';
import DebugAuthPage from './pages/DebugAuthPage';
import SubscriptionDemoPage from './pages/SubscriptionDemoPage';

// Component to handle root redirect
const RootRedirect = () => {
  return <Navigate to="/home" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot" element={<ForgotPasswordPage />} />
              <Route path="/reset" element={<ResetPasswordPage />} />
              <Route path="/verify" element={<VerifyEmailPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route path="/pricing" element={<PaymentPage />} />
              <Route path="/payment/return" element={<PaymentReturn />} />

              {/* Protected routes */}
              <Route
                path="/payment"
                element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/debug-auth"
                element={
                  <ProtectedRoute>
                    <DebugAuthPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription-demo"
                element={
                  <ProtectedRoute>
                    <SubscriptionDemoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/careers"
                element={
                  <ProtectedRoute>
                    <CareersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/careers/:idOrSlug"
                element={
                  <ProtectedRoute>
                    <CareerDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assessment"
                element={
                  <ProtectedRoute>
                    <AssessmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blog"
                element={
                  <ProtectedRoute>
                    <BlogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blog/:slug"
                element={
                  <ProtectedRoute>
                    <BlogDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blog/create"
                element={
                  <ProtectedRoute>
                    <UserBlogCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/blog/create"
                element={
                  <AdminRoute>
                    <BlogCreatePage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/blog/manage"
                element={
                  <AdminRoute>
                    <BlogManagementPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/blog/edit/:id"
                element={
                  <AdminRoute>
                    <BlogEditPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/chat/summary"
                element={
                  <ProtectedRoute>
                    <ChatSummaryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/results/:assessmentId"
                element={
                  <ProtectedRoute>
                    <ResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/session-results/:sessionId"
                element={
                  <ProtectedRoute>
                    <SessionResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assessment-history"
                element={
                  <ProtectedRoute>
                    <AssessmentHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/careers/:careerId/roadmap"
                element={
                  <ProtectedRoute>
                    <RoadmapPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin/*"
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            {/* Global Chatbot - chỉ hiện khi đã đăng nhập */}
            <ChatbotWrapper />
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
