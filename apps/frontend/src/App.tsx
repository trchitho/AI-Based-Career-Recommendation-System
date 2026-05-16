import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './components/layout/MainLayout';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import { AnalysisLockProvider } from './contexts/AnalysisLockContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { ChatbotWrapper } from './components/chatbot/ChatbotWrapper';

// Import animations CSS
import './styles/animations.css';

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
import SkillGapPage from './pages/SkillGapPage';
import CourseRecommendationPage from './pages/CourseRecommendationPage';
import CVHistoryPage from './pages/CVHistoryPage';
import RecommendationsPage from './pages/RecommendationsPage';
import RecommendationsLearnMorePage from './pages/RecommendationsLearnMorePage';
import MentorLearnMorePage from './pages/MentorLearnMorePage';
import MentorMatchingPage from './pages/MentorMatchingPage';
import InterviewPage from './pages/InterviewPage';
import InterviewSelectionPage from './pages/InterviewSelectionPage';
import InterviewHistoryPage from './pages/InterviewHistoryPage';
import InterviewConversationPage from './pages/InterviewConversationPage';
import InterviewListPage from './pages/InterviewListPage';
import InterviewResultsPage from './pages/InterviewResultsPage';
import DeviceTestPage from './pages/DeviceTestPage';
import VoiceInterviewPage from './pages/VoiceInterviewPage';
import TrendsPage from './pages/TrendsPage';
import LearningPathPage from './pages/LearningPathPage';
import CreatePersonalizedRoadmapPage from './pages/CreatePersonalizedRoadmapPage';
import ViewPersonalizedRoadmapPage from './pages/ViewPersonalizedRoadmapPage';
import PageErrorBoundary from './components/common/PageErrorBoundary';
import NotFoundPage from './pages/NotFoundPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to handle root redirect
const RootRedirect = () => {
  return <Navigate to="/home" replace />;
};

// Redirect URLs cũ /learning_path/* sang /learning-path/*
const LearningPathUnderscoreRedirect = ({ kind }: { kind: 'create' | 'view' }) => {
  const params = useParams();
  const id = kind === 'create' ? params.analysisId : params.roadmapId;
  return <Navigate to={`/learning-path/${kind}/${id}`} replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AppSettingsProvider>
            <AnalysisLockProvider>
            <Router>
              <AuthProvider>
                <SocketProvider>
                <Routes>
                  {/* Temporary debug route for styling validation */}
                  <Route path="/test-buttons" element={
                    <div style={{ padding: '100px', background: '#f3f4f6', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div className="mm-empty" style={{ background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                        <h3>Chưa tìm thấy mentor phù hợp</h3>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '24px' }}>
                          <button type="button" className="mm-empty-action-btn">
                            Cập nhật CV
                          </button>
                          <button type="button" className="mm-empty-action-btn">
                            Làm bài đánh giá
                          </button>
                        </div>
                      </div>
                    </div>
                  } />
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
                  <Route
                    path="/trends"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <TrendsPage />
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/learning-path" element={<ProtectedRoute><PageErrorBoundary><LearningPathPage /></PageErrorBoundary></ProtectedRoute>} />
                  <Route path="/learning-path/create/:analysisId" element={<ProtectedRoute><PageErrorBoundary><CreatePersonalizedRoadmapPage /></PageErrorBoundary></ProtectedRoute>} />
                  <Route path="/learning-path/view/:roadmapId" element={<ProtectedRoute><PageErrorBoundary><ViewPersonalizedRoadmapPage /></PageErrorBoundary></ProtectedRoute>} />
                  {/* Aliases (URL cũ với underscore) */}
                  <Route path="/learning_path" element={<Navigate to="/learning-path" replace />} />
                  <Route path="/learning_path/create/:analysisId" element={<LearningPathUnderscoreRedirect kind="create" />} />
                  <Route path="/learning_path/view/:roadmapId" element={<LearningPathUnderscoreRedirect kind="view" />} />
                  <Route path="/404" element={<NotFoundPage />} />
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
                    path="/recommendations/learn-more"
                    element={
                      <ProtectedRoute>
                        <RecommendationsLearnMorePage />
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
                    path="/courses"
                    element={
                      <ProtectedRoute>
                        <CourseRecommendationPage />
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
                    path="/interview/conversation/:sessionId"
                    element={
                      <ProtectedRoute>
                        <InterviewConversationPage />
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
                  <Route
                    path="/mentor-matching/learn-more"
                    element={
                      <ProtectedRoute>
                        <MentorLearnMorePage />
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
            </AnalysisLockProvider>
        </AppSettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;