import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
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
import QuizModeSelectorPage from './pages/QuizModeSelectorPage';
import ResultsPage from './pages/ResultsPage';
import SessionResultsPage from './pages/SessionResultsPage';
import AssessmentHistoryPage from './pages/AssessmentHistoryPage';
import RoadmapPage from './pages/RoadmapPage';
import ReportPage from './pages/ReportPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import CareersPage from './pages/CareersPage';
import CareerDetailPage from './pages/CareerDetailPage';
import CareerGroupsPage from './pages/CareerGroupsPage';
import CareersByGroupPage from './pages/CareersByGroupPage';
import CareerRedirectPage from './pages/CareerRedirectPage';
import CareerRouterPage from './pages/CareerRouterPage';
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
import ProgressComparisonPage from './pages/ProgressComparisonPage';
import SettingsPage from './pages/SettingsPage';
import CareerGoalsPage from './pages/CareerGoalsPage';
import SkillGapPage from './pages/SkillGapPage';
import CVHistoryPage from './pages/CVHistoryPage';
import RecommendationsPage from './pages/RecommendationsPage';
import MentorMatchingPage from './pages/MentorMatchingPage';
import InterviewPage from './pages/InterviewPage';
import InterviewSelectionPage from './pages/InterviewSelectionPage';
import InterviewHistoryPage from './pages/InterviewHistoryPage';
import InterviewListPage from './pages/InterviewListPage';
import InterviewResultsPage from './pages/InterviewResultsPage';
import DeviceTestPage from './pages/DeviceTestPage';
import VoiceInterviewPage from './pages/VoiceInterviewPage';
import NotFoundPage from './pages/NotFoundPage';

// Component to handle root redirect
const RootRedirect = () => {
  return <Navigate to="/home" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppSettingsProvider>
          <Router>
            <AuthProvider>
              <SocketProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/home" element={<MainLayout><HomePage /></MainLayout>} />
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
                  <Route path="/careers" element={<CareerGroupsPage />} />
                  <Route path="/404" element={<NotFoundPage />} />
                  <Route path="/learning-path" element={<NotFoundPage />} />
                  <Route path="/careers/:param" element={<CareerRouterPage />} />
                  <Route path="/careers/:param/roadmap" element={<CareerRouterPage />} />
                  <Route path="/careers/:groupSlug/:careerIdOrSlug" element={<CareerDetailPage />} />
                  <Route
                    path="/careers/:groupSlug/:careerIdOrSlug/roadmap"
                    element={
                      <ProtectedRoute>
                        <RoadmapPage />
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
                    path="/quiz-mode-selector"
                    element={
                      <ProtectedRoute>
                        <QuizModeSelectorPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/recommendations"
                    element={
                      <ProtectedRoute>
                        <RecommendationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/skill-gap"
                    element={
                      <ProtectedRoute>
                        <SkillGapPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/skill-gap/:analysisId"
                    element={
                      <ProtectedRoute>
                        <SkillGapPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cv-history"
                    element={
                      <ProtectedRoute>
                        <CVHistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/mentor-matching"
                    element={
                      <ProtectedRoute>
                        <MentorMatchingPage />
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
                    path="/results/:assessmentId/report"
                    element={
                      <ProtectedRoute>
                        <ReportPage />
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
                    path="/progress-comparison"
                    element={
                      <ProtectedRoute>
                        <ProgressComparisonPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/career-goals"
                    element={
                      <ProtectedRoute>
                        <CareerGoalsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Interview routes */}
                  <Route
                    path="/interview"
                    element={
                      <ProtectedRoute>
                        <InterviewListPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/interview/selection/:jobId"
                    element={
                      <ProtectedRoute>
                        <InterviewSelectionPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/interview/:jobId"
                    element={
                      <ProtectedRoute>
                        <InterviewPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/interview/history"
                    element={
                      <ProtectedRoute>
                        <InterviewHistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/interview/results/:sessionId"
                    element={
                      <ProtectedRoute>
                        <InterviewResultsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/interview/device-test"
                    element={
                      <ProtectedRoute>
                        <DeviceTestPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/interview/voice"
                    element={
                      <ProtectedRoute>
                        <VoiceInterviewPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Mentor Matching */}
                  <Route
                    path="/mentor-matching"
                    element={
                      <ProtectedRoute>
                        <MentorMatchingPage />
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

                  {/* Fallback — 404 catch-all */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>

                {/* Global Chatbot - chỉ hiện khi đã đăng nhập */}
                <ChatbotWrapper />
              </SocketProvider>
            </AuthProvider>
          </Router>
        </AppSettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;