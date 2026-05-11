// apps/frontend/src/pages/ResultsPage.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assessmentService } from '../services/assessmentService';
import {
  recommendationService,
  CareerRecommendationDTO,
  RecommendationsResponse,
} from '../services/recommendationService';
import { AssessmentResults } from '../types/results';
import RIASECSpiderChart from '../components/results/RIASECSpiderChart';
import RIASECLineChart from '../components/results/RIASECLineChart';
import BigFiveBarChart from '../components/results/BigFiveBarChart';
import BigFiveLineChart from '../components/results/BigFiveLineChart';
import CareerRecommendationsDisplay from '../components/results/CareerRecommendationsDisplay';
import { feedbackService } from '../services/feedbackService';
import MainLayout from '../components/layout/MainLayout';
import { trackCareerEvent, markDwellStart } from '../services/trackService';
import { useAuth } from '../contexts/AuthContext';
import { getRIASECFullName } from '../utils/riasec';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import './ResultsPage.css';

const ResultsPage = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { user } = useAuth();
  const { hasFeature, currentPlan } = useFeatureAccess();

  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [errorResults, setErrorResults] = useState<string | null>(null);

  const [recData, setRecData] = useState<RecommendationsResponse | null>(null);
  const [recLoading, setRecLoading] = useState<boolean>(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recFetched, setRecFetched] = useState<boolean>(false);

  const [activeTab, setActiveTab] =
    useState<'summary' | 'detailed' | 'recommendations'>('summary');

  const [fbRating, setFbRating] = useState<number | null>(null);
  const [fbComment, setFbComment] = useState('');
  const [fbDone, setFbDone] = useState(false);

  const impressionLoggedRef = useRef<string | null>(null);
  const recItems: CareerRecommendationDTO[] = recData?.items ?? [];
  const recRequestId = recData?.request_id ?? null;

  useEffect(() => {
    if (!assessmentId) return;
    fetchResults(assessmentId);
  }, [assessmentId]);

  useEffect(() => {
    if (activeTab === 'recommendations' && !recFetched && assessmentId) {
      fetchRecommendations();
    }
  }, [activeTab, recFetched, assessmentId]);

  useEffect(() => {
    if (
      activeTab === 'recommendations' &&
      recData?.items &&
      recData.items.length > 0 &&
      recData.request_id &&
      impressionLoggedRef.current !== recData.request_id
    ) {
      impressionLoggedRef.current = recData.request_id;
      markDwellStart();
      const reqId = recData.request_id;
      recData.items.forEach((item, index) => {
        trackCareerEvent(
          {
            event_type: 'impression',
            job_id: item.slug || item.career_id,
            rank_pos: index + 1,
            score_shown: item.display_match ?? item.match_score,
            ...(reqId ? { ref: reqId } : {}),
          },
          user?.id ? { userId: user.id } : undefined
        );
      });
    }
  }, [activeTab, recData, user?.id]);

  useEffect(() => {
    if (activeTab === 'recommendations' && impressionLoggedRef.current) {
      markDwellStart();
    }
  }, [activeTab]);

  const fetchResults = async (id: string) => {
    try {
      setLoadingResults(true);
      setErrorResults(null);
      const resultsData = await assessmentService.getResults(id);
      setResults(resultsData);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setErrorResults(`Assessment ${id} not found.`);
      } else if (err?.response?.status === 403) {
        setErrorResults('You do not have permission to view this assessment.');
      } else {
        setErrorResults('Failed to load assessment results. Please try again.');
      }
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchRecommendations = useCallback(async () => {
    if (recFetched) return;
    try {
      setRecLoading(true);
      setRecError(null);
      if (!assessmentId) throw new Error('Missing assessmentId');
      const res = await recommendationService.getMain(assessmentId, 5);
      setRecData(res);
      setRecFetched(true);
    } catch (err: any) {
      setRecError(err?.response?.data?.detail || err?.message || 'Failed to load recommendations');
    } finally {
      setRecLoading(false);
    }
  }, [assessmentId, recFetched]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getTopRIASEC = () => {
    if (results?.top_interest) return getRIASECFullName(results.top_interest).toUpperCase();
    const order = ['realistic','investigative','artistic','social','enterprising','conventional'];
    const entries = Object.entries(results?.riasec_scores ?? {});
    entries.sort((a, b) => {
      const d = b[1] - a[1];
      return d !== 0 ? d : order.indexOf(a[0].toLowerCase()) - order.indexOf(b[0].toLowerCase());
    });
    return getRIASECFullName(entries[0]?.[0] ?? '').toUpperCase();
  };

  const getTopBigFive = () => {
    const BIG5_VI: Record<string, string> = {
      openness: 'Cởi Mở', conscientiousness: 'Tận Tâm',
      extraversion: 'Hướng Ngoại', agreeableness: 'Dễ Chịu', neuroticism: 'Nhạy Cảm',
    };
    const key = Object.entries(results?.big_five_scores ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!key) return 'N/A';
    return (BIG5_VI[key.toLowerCase()] || key).toUpperCase();
  };

  return (
    <MainLayout>
      <div className="res-page">
        <div className="res-content">

          {/* Loading */}
          {loadingResults && (
            <div className="res-loading">
              <div className="res-spinner" />
              <span>Đang phân tích kết quả của bạn...</span>
            </div>
          )}

          {/* Error */}
          {errorResults && !loadingResults && (
            <div className="res-error">
              <div className="res-error-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>{errorResults}</span>
            </div>
          )}

          {/* Main content */}
          {!loadingResults && !errorResults && results && (
            <>
              {/* 1. Hero */}
              <div className="res-hero">
                <div className="res-hero-top">
                  <div className="res-hero-meta">
                    <span className="res-hero-badge">Báo Cáo Sẵn Sàng</span>
                    <span className="res-hero-date">{formatDate(results.completed_at)}</span>
                  </div>
                  <h1>Phân Tích Cá Nhân Của Bạn</h1>
                  <p>
                    Chúng tôi đã phân tích câu trả lời của bạn để khám phá đặc điểm tính cách
                    và tiềm năng nghề nghiệp độc đáo của bạn.
                  </p>
                </div>

                <div className="res-hero-actions">
                  {hasFeature('detailed_analysis') ? (
                    <Link to={`/results/${assessmentId}/report`} className="res-hero-btn">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Xem Báo Cáo Đầy Đủ
                    </Link>
                  ) : (
                    <Link to="/pricing" className="res-hero-btn">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {currentPlan === 'free' ? 'Nâng Cấp Lên Premium' : 'Nâng Cấp Lên Premium'}
                    </Link>
                  )}

                  {hasFeature('progress_tracking') ? (
                    <Link to="/progress-comparison" className="res-hero-btn pro">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      So Sánh Tiến Trình
                    </Link>
                  ) : currentPlan !== 'pro' && (
                    <span className="res-hero-btn locked pro">
                      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
                      </svg>
                      Tính Năng Pro
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Tabs */}
              <div className="res-tabs">
                {[
                  { id: 'summary',         label: 'Tóm tắt' },
                  { id: 'detailed',        label: 'Phân tích chi tiết' },
                  { id: 'recommendations', label: 'Nghề nghiệp phù hợp' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`res-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 3. Tab content */}
              <div>
                {/* SUMMARY */}
                {activeTab === 'summary' && (
                  <div className="res-summary-grid">
                    {/* Highlights */}
                    <div className="res-section">
                      <div className="res-section-header">
                        <span className="res-section-icon green">
                          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </span>
                        <div>
                          <p className="res-section-title">Điểm Nổi Bật</p>
                        </div>
                      </div>
                      <div className="res-highlights">
                        <div className="res-highlight-card green">
                          <p className="res-highlight-label">Sở Thích Nghề Nghiệp Hàng Đầu</p>
                          <p className="res-highlight-value">{getTopRIASEC()}</p>
                          <svg className="res-highlight-bg-icon" width="100" height="100" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="res-highlight-card blue">
                          <p className="res-highlight-label">Đặc Điểm Nổi Trội</p>
                          <p className="res-highlight-value">{getTopBigFive()}</p>
                          <svg className="res-highlight-bg-icon" width="100" height="100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Essay insights */}
                    {results.essay_analysis && (
                      <div className="res-section">
                        <div className="res-section-header">
                          <span className="res-section-icon purple">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </span>
                          <div>
                            <p className="res-section-title">Phân Tích AI</p>
                          </div>
                        </div>

                        {results.essay_analysis.key_insights?.length > 0 && (
                          <>
                            <p className="res-section-label">Nhận Xét Chính</p>
                            <ul className="res-insights-list">
                              {results.essay_analysis.key_insights.map((ins, idx) => (
                                <li key={idx}>
                                  <span className="res-insight-dot" />
                                  {ins}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}

                        {results.essay_analysis.themes?.length > 0 && (
                          <>
                            <p className="res-section-label">Chủ Đề Nhận Diện</p>
                            <div className="res-theme-tags">
                              {results.essay_analysis.themes.map((theme, i) => (
                                <span key={i} className="res-theme-tag">{theme}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* DETAILED */}
                {activeTab === 'detailed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* RIASEC */}
                    <div className="res-section">
                      <div className="res-section-header">
                        <span className="res-section-icon blue">
                          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </span>
                        <div>
                          <p className="res-section-title">Hồ Sơ Sở Thích RIASEC</p>
                          <p className="res-section-sub">Sở thích nghề nghiệp của bạn theo mô hình Holland</p>
                        </div>
                      </div>

                      <div className="res-chart-box">
                        <p className="res-chart-title">Biểu Đồ Radar</p>
                        <div className="res-chart-inner">
                          <RIASECSpiderChart scores={results.riasec_scores} />
                        </div>
                      </div>

                      <div className="res-chart-box">
                        <p className="res-chart-title">Biểu Đồ Đường</p>
                        <div className="res-chart-inner sm">
                          <RIASECLineChart scores={results.riasec_scores} />
                        </div>
                      </div>

                      <div className="res-chart-box">
                        <p className="res-chart-title">Chi Tiết Điểm</p>
                        <div className="res-score-grid">
                          {Object.entries(results.riasec_scores)
                            .sort((a, b) => b[1] - a[1])
                            .map(([key, value], index) => (
                              <div key={key} className="res-score-item">
                                <div className="res-score-label-row">
                                  <span className="res-score-name">{getRIASECFullName(key)}</span>
                                  <span className="res-score-val">{value.toFixed(0)}/100</span>
                                </div>
                                <div className="res-score-track">
                                  <div
                                    className={`res-score-fill c${index % 6}`}
                                    style={{ width: `${Math.min(value, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Big Five */}
                    <div className="res-section">
                      <div className="res-section-header">
                        <span className="res-section-icon purple">
                          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </span>
                        <div>
                          <p className="res-section-title">Đặc Điểm Tính Cách Big Five</p>
                          <p className="res-section-sub">5 chiều tính cách cốt lõi của bạn</p>
                        </div>
                      </div>

                      <div className="res-chart-box">
                        <p className="res-chart-title">Biểu Đồ Cột</p>
                        <div className="res-chart-inner">
                          <BigFiveBarChart scores={results.big_five_scores} />
                        </div>
                      </div>

                      <div className="res-chart-box">
                        <p className="res-chart-title">Biểu Đồ Đường</p>
                        <div className="res-chart-inner sm">
                          <BigFiveLineChart scores={results.big_five_scores} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* RECOMMENDATIONS */}
                {activeTab === 'recommendations' && (
                  <CareerRecommendationsDisplay
                    items={recItems}
                    requestId={recRequestId}
                    loading={recLoading}
                    error={recError}
                  />
                )}
              </div>

              {/* 4. Feedback */}
              {!fbDone && (
                <div className="res-feedback">
                  <h3>Kết quả có hữu ích không?</h3>
                  <p>Giúp chúng tôi cải thiện AI bằng cách đánh giá kết quả của bạn.</p>

                  <div className="res-rating-row">
                    {[1,2,3,4,5].map((v) => (
                      <button
                        key={v}
                        className={`res-rating-btn${fbRating === v ? ' active' : ''}`}
                        onClick={() => setFbRating(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="res-feedback-textarea"
                    placeholder="Nhận xét thêm? (Không bắt buộc)"
                    rows={3}
                    value={fbComment}
                    onChange={(e) => setFbComment(e.target.value)}
                  />

                  <div>
                    <button
                      className="res-submit-btn"
                      disabled={!fbRating}
                      onClick={async () => {
                        if (!assessmentId || !fbRating) return;
                        try {
                          await feedbackService.submit(assessmentId, fbRating, fbComment);
                          setFbDone(true);
                        } catch (e) { console.error(e); }
                      }}
                    >
                      Gửi phản hồi
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default ResultsPage;
