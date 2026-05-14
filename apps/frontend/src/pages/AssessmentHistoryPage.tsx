import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentService } from '../services/assessmentService';
import MainLayout from '../components/layout/MainLayout';

interface Session {
  session_id: number;
  created_at: string;
  assessment_count: number;
  assessment_types: string;
}

interface UserSessions {
  user_id: number;
  sessions: Session[];
}

const AssessmentHistoryPage = () => {
  const [data, setData] = useState<UserSessions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserSessions();
  }, []);

  const fetchUserSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionsData = await assessmentService.getUserSessions();
      setData(sessionsData);
    } catch (err) {
      console.error(err);
      setError('Failed to load assessment history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionBadgeColor = (types: string) => {
    if (types.includes('RIASEC') && types.includes('BigFive')) {
      return 'bg-indigo-50 text-indigo-950';
    } else if (types.includes('RIASEC')) {
      return 'bg-blue-100 text-blue-800';
    } else if (types.includes('BigFive')) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải lịch sử đánh giá...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="text-red-600 font-medium">{error}</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden font-['Plus_Jakarta_Sans'] bg-gray-50/50 dark:bg-gray-900/50">
        
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="py-8 relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/10 p-8 mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                Lịch sử đánh giá
              </h1>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Xem lại các bài test đã thực hiện và kết quả của bạn
              </p>
            </div>

          {/* Sessions List */}
          {data && data.sessions.length > 0 ? (
            <div className="space-y-4">
              {data.sessions.map((session) => (
                  <div
                  key={session.session_id}
                  className="glass bg-white/60 dark:bg-gray-800/40 rounded-2xl shadow-md border border-gray-200/50 dark:border-white/10 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Session {session.session_id}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${getSessionBadgeColor(
                            session.assessment_types
                          ).replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-').concat(' border-current/20')}`}
                        >
                          {session.assessment_types}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1 font-medium">
                        Thực hiện lúc: {formatDate(session.created_at)}
                      </p>
                      
                      <p className="text-gray-500 dark:text-gray-500 text-sm font-medium">
                        {session.assessment_count} bài test
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/session-results/${session.session_id}`}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-bold shadow-md shadow-indigo-600/20"
                      >
                        Xem kết quả
                      </Link>
                    </div>
                  </div>

                  {/* Quick Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {session.assessment_types.includes('RIASEC') && (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                          <span className="text-gray-600 dark:text-gray-300 font-medium">RIASEC Interest Profile</span>
                        </div>
                      )}
                      {session.assessment_types.includes('BigFive') && (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                          <span className="text-gray-600 dark:text-gray-300 font-medium">Big Five Personality</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass bg-white/60 dark:bg-gray-800/40 rounded-3xl shadow-xl border border-gray-200/50 dark:border-white/10 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <svg
                  className="w-10 h-10 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Chưa có bài test nào
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                Bạn chưa thực hiện bài đánh giá nào. Hãy bắt đầu với bài test đầu tiên!
              </p>
              <Link
                to="/assessment"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5"
              >
                Bắt đầu đánh giá
              </Link>
            </div>
          )}
        </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AssessmentHistoryPage;