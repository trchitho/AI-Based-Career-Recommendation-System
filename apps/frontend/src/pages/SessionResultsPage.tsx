import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { assessmentService } from '../services/assessmentService';
import RIASECSpiderChart from '../components/results/RIASECSpiderChart';
import BigFiveBarChart from '../components/results/BigFiveBarChart';
import MainLayout from '../components/layout/MainLayout';

interface SessionResults {
  session_id: number;
  user_id: number;
  riasec: any;
  bigfive: any;
  created_at: string;
}

const SessionResultsPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [results, setResults] = useState<SessionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetchSessionResults(sessionId);
  }, [sessionId]);

  const fetchSessionResults = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await assessmentService.getSessionResults(id);
      setResults(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load session results. Please try again.');
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

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải kết quả...</p>
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

  if (!results) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500">Không tìm thấy kết quả</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Kết quả đánh giá - Session {results.session_id}
            </h1>
            <p className="text-gray-600">
              Thực hiện lúc: {formatDate(results.created_at)}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* RIASEC Results */}
            {results.riasec && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  RIASEC Interest Profile
                </h2>
                
                {/* Top Interest */}
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-green-600 mb-1">
                    Sở thích nghề nghiệp hàng đầu
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.entries(results.riasec.riasec_scores)
                      .sort((a, b) => b[1] - a[1])[0]?.[0]?.toUpperCase() || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Điểm: {Object.entries(results.riasec.riasec_scores)
                      .sort((a, b) => b[1] - a[1])[0]?.[1] || 0}/100
                  </p>
                </div>

                {/* Detailed Scores */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-medium text-gray-900">Chi tiết điểm số:</h3>
                  {Object.entries(results.riasec.riasec_scores).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-gray-700 capitalize">{key}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${value}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="h-80">
                  <RIASECSpiderChart scores={results.riasec.riasec_scores} />
                </div>
              </div>
            )}

            {/* Big Five Results */}
            {results.bigfive && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Big Five Personality Traits
                </h2>
                
                {/* Dominant Trait */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-blue-600 mb-1">
                    Đặc điểm tính cách nổi bật
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.entries(results.bigfive.big_five_scores)
                      .sort((a, b) => b[1] - a[1])[0]?.[0]?.toUpperCase() || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Điểm: {Object.entries(results.bigfive.big_five_scores)
                      .sort((a, b) => b[1] - a[1])[0]?.[1] || 0}/100
                  </p>
                </div>

                {/* Detailed Scores */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-medium text-gray-900">Chi tiết điểm số:</h3>
                  {Object.entries(results.bigfive.big_five_scores).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-gray-700 capitalize">{key}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${value}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className="h-80">
                  <BigFiveBarChart scores={results.bigfive.big_five_scores} />
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tóm tắt kết quả</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.riasec && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">RIASEC Profile</h3>
                  <p className="text-gray-600 text-sm">
                    Bạn có xu hướng nghề nghiệp mạnh nhất ở lĩnh vực{' '}
                    <strong>
                      {Object.entries(results.riasec.riasec_scores)
                        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                    </strong>{' '}
                    với điểm số {Object.entries(results.riasec.riasec_scores)
                      .sort((a, b) => b[1] - a[1])[0]?.[1] || 0}/100.
                  </p>
                </div>
              )}
              
              {results.bigfive && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Big Five Profile</h3>
                  <p className="text-gray-600 text-sm">
                    Đặc điểm tính cách nổi bật nhất của bạn là{' '}
                    <strong>
                      {Object.entries(results.bigfive.big_five_scores)
                        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                    </strong>{' '}
                    với điểm số {Object.entries(results.bigfive.big_five_scores)
                      .sort((a, b) => b[1] - a[1])[0]?.[1] || 0}/100.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default SessionResultsPage;