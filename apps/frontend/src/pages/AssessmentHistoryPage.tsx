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
      return 'bg-green-100 text-green-800';
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Lịch sử đánh giá
            </h1>
            <p className="text-gray-600">
              Xem lại các bài test đã thực hiện và kết quả của bạn
            </p>
          </div>

          {/* Sessions List */}
          {data && data.sessions.length > 0 ? (
            <div className="space-y-4">
              {data.sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Session #{session.session_id}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionBadgeColor(
                            session.assessment_types
                          )}`}
                        >
                          {session.assessment_types}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-1">
                        Thực hiện lúc: {formatDate(session.created_at)}
                      </p>
                      
                      <p className="text-gray-500 text-sm">
                        {session.assessment_count} bài test
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/session-results/${session.session_id}`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Xem kết quả
                      </Link>
                    </div>
                  </div>

                  {/* Quick Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {session.assessment_types.includes('RIASEC') && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-600">RIASEC Interest Profile</span>
                        </div>
                      )}
                      {session.assessment_types.includes('BigFive') && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-gray-600">Big Five Personality</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chưa có bài test nào
              </h3>
              <p className="text-gray-500 mb-6">
                Bạn chưa thực hiện bài đánh giá nào. Hãy bắt đầu với bài test đầu tiên!
              </p>
              <Link
                to="/assessment"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Bắt đầu đánh giá
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AssessmentHistoryPage;