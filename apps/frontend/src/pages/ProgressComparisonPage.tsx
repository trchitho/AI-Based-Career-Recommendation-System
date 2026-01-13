import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useSubscription } from '../hooks/useSubscription';
import { assessmentService } from '../services/assessmentService';
import api from '../lib/api';
import '../styles/progress-comparison.css';

interface AssessmentHistory {
  id: number;
  created_at: string;
  big5_scores?: any;
  riasec_scores?: any;
}

interface CareerRecommendation {
  career_id: number;
  career_slug: string;
  career_title: string;
  career_description: string;
  score: number;
  rank: number;
}

interface GroupedSession {
  sessionId: string;
  timestamp: Date;
  assessments: AssessmentHistory[];
  hasBigFive: boolean;
  hasRIASEC: boolean;
  bigFiveScores?: any;
  riasecScores?: any;
  topRiasecType?: string;
  topBigFiveTrait?: string;
  careerRecommendations?: CareerRecommendation[];
}

// Big Five trait names in English
const BIG_FIVE_LABELS: Record<string, string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Neuroticism'
};

// RIASEC type names in English
const RIASEC_LABELS: Record<string, string> = {
  realistic: 'Realistic',
  investigative: 'Investigative',
  artistic: 'Artistic',
  social: 'Social',
  enterprising: 'Enterprising',
  conventional: 'Conventional'
};

// Generate dynamic summary messages based on score changes
const generateSummaryMessages = (
  bigFiveChanges: Record<string, number> | null,
  riasecChanges: Record<string, number> | null
): { improved: string[]; decreased: string[]; stable: string[] } => {
  const improved: string[] = [];
  const decreased: string[] = [];
  const stable: string[] = [];

  // Big Five analysis
  if (bigFiveChanges) {
    Object.entries(bigFiveChanges).forEach(([trait, change]) => {
      const label = BIG_FIVE_LABELS[trait] || trait;

      if (change > 15) {
        improved.push(`Significant improvement in ${label} (+${change.toFixed(0)}%) - You've become much more ${trait === 'openness' ? 'open to new experiences' : trait === 'conscientiousness' ? 'organized and disciplined' : trait === 'extraversion' ? 'outgoing and energetic' : trait === 'agreeableness' ? 'cooperative and trusting' : 'emotionally sensitive'}.`);
      } else if (change > 8) {
        improved.push(`Notable increase in ${label} (+${change.toFixed(0)}%) - Good progress in this personality dimension.`);
      } else if (change > 3) {
        improved.push(`Slight improvement in ${label} (+${change.toFixed(0)}%).`);
      } else if (change < -15) {
        decreased.push(`Significant decrease in ${label} (${change.toFixed(0)}%) - This may indicate a shift in your personality expression.`);
      } else if (change < -8) {
        decreased.push(`Notable decrease in ${label} (${change.toFixed(0)}%).`);
      } else if (change < -3) {
        decreased.push(`Slight decrease in ${label} (${change.toFixed(0)}%).`);
      } else {
        stable.push(`${label} remains stable (${change > 0 ? '+' : ''}${change.toFixed(0)}%).`);
      }
    });
  }

  // RIASEC analysis
  if (riasecChanges) {
    Object.entries(riasecChanges).forEach(([type, change]) => {
      const label = RIASEC_LABELS[type] || type;

      if (change > 20) {
        improved.push(`Strong growth in ${label} interest (+${change.toFixed(0)}%) - Your career interests are evolving significantly toward ${type === 'realistic' ? 'hands-on, practical work' : type === 'investigative' ? 'research and analysis' : type === 'artistic' ? 'creative expression' : type === 'social' ? 'helping others' : type === 'enterprising' ? 'leadership and business' : 'organized, detail-oriented work'}.`);
      } else if (change > 10) {
        improved.push(`Increased interest in ${label} careers (+${change.toFixed(0)}%).`);
      } else if (change > 3) {
        improved.push(`Slight increase in ${label} (+${change.toFixed(0)}%).`);
      } else if (change < -20) {
        decreased.push(`Significant shift away from ${label} interests (${change.toFixed(0)}%) - Your career preferences may be changing.`);
      } else if (change < -10) {
        decreased.push(`Decreased interest in ${label} careers (${change.toFixed(0)}%).`);
      } else if (change < -3) {
        decreased.push(`Slight decrease in ${label} (${change.toFixed(0)}%).`);
      } else {
        stable.push(`${label} interest remains consistent.`);
      }
    });
  }

  return { improved, decreased, stable };
};

// Career tooltip component
const CareerTooltip: React.FC<{ career: CareerRecommendation; children: React.ReactNode }> = ({ career, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {children}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
          <div className="text-sm">
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">{career.career_title}</h4>
            <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-3">{career.career_description || 'No description available'}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Match Score</span>
              <span className="font-bold text-green-600">{career.score.toFixed(1)}%</span>
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">Click to view details →</div>
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700"></div>
        </div>
      )}
    </div>
  );
};

const ProgressComparisonPage: React.FC = () => {
  const { hasFeature, currentPlan } = useFeatureAccess();
  useSubscription(); // Keep for potential future use
  const [assessments, setAssessments] = useState<AssessmentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{ first: GroupedSession; second: GroupedSession } | null>(null);
  const [animateScores, setAnimateScores] = useState(false);
  const hasLoadedRef = useRef(false);

  // Get top trait/type from scores
  const getTopTrait = (scores: Record<string, number> | undefined): string => {
    if (!scores) return '';
    const entries = Object.entries(scores);
    if (entries.length === 0) return '';
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '';
  };

  const getTopScore = (scores: Record<string, number> | undefined): number => {
    if (!scores) return 0;
    const values = Object.values(scores);
    return Math.max(...values, 0);
  };

  // Group assessments into sessions (within 5 minutes)
  const groupedSessions = React.useMemo(() => {
    if (!assessments.length) return [];

    const sorted = [...assessments].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const sessions: GroupedSession[] = [];
    let currentSession: AssessmentHistory[] = [];
    let sessionStartTime: Date | null = null;

    sorted.forEach((assessment) => {
      const assessmentTime = new Date(assessment.created_at);

      if (!sessionStartTime || (sessionStartTime.getTime() - assessmentTime.getTime()) > 5 * 60 * 1000) {
        if (currentSession.length > 0) {
          const bigFive = currentSession.find(a => a.big5_scores);
          const riasec = currentSession.find(a => a.riasec_scores);
          sessions.push({
            sessionId: `session-${sessions.length}`,
            timestamp: sessionStartTime!,
            assessments: currentSession,
            hasBigFive: !!bigFive,
            hasRIASEC: !!riasec,
            bigFiveScores: bigFive?.big5_scores,
            riasecScores: riasec?.riasec_scores,
            topRiasecType: getTopTrait(riasec?.riasec_scores),
            topBigFiveTrait: getTopTrait(bigFive?.big5_scores),
          });
        }
        currentSession = [assessment];
        sessionStartTime = assessmentTime;
      } else {
        currentSession.push(assessment);
      }
    });

    if (currentSession.length > 0 && sessionStartTime) {
      const bigFive = currentSession.find(a => a.big5_scores);
      const riasec = currentSession.find(a => a.riasec_scores);
      sessions.push({
        sessionId: `session-${sessions.length}`,
        timestamp: sessionStartTime,
        assessments: currentSession,
        hasBigFive: !!bigFive,
        hasRIASEC: !!riasec,
        bigFiveScores: bigFive?.big5_scores,
        riasecScores: riasec?.riasec_scores,
        topRiasecType: getTopTrait(riasec?.riasec_scores),
        topBigFiveTrait: getTopTrait(bigFive?.big5_scores),
      });
    }

    return sessions;
  }, [assessments]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadAssessmentHistory();
  }, [hasFeature, currentPlan]);

  const loadAssessmentHistory = async () => {
    try {
      setLoading(true);
      const history = await assessmentService.getHistory();

      const transformedAssessments: AssessmentHistory[] = history.map((item: any) => ({
        id: item.id || item.assessment_id,
        created_at: item.completed_at || item.created_at,
        big5_scores: item.big_five_scores || item.big5_scores,
        riasec_scores: item.riasec_scores,
      }));

      setAssessments(transformedAssessments);
    } catch (error) {
      console.error('Failed to load assessment history:', error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load career recommendations for a session
  const loadCareerRecommendations = async (assessmentId: number): Promise<CareerRecommendation[]> => {
    try {
      const response = await api.get(`/api/recommendations/saved`, {
        params: { assessment_id: assessmentId, top_k: 5 }
      });
      const items = response.data?.items || [];
      return items.map((item: any) => ({
        career_id: item.career_id,
        career_slug: item.slug || '',
        career_title: item.title_en || item.title_vi || 'Unknown Career',
        career_description: item.description || '',
        score: item.score || 0,
        rank: item.rank || 0
      }));
    } catch (error) {
      console.error('Failed to load career recommendations:', error);
      return [];
    }
  };

  const handleCompareResults = async () => {
    const firstSession = groupedSessions.find(s => s.sessionId === selectedSessions[0]);
    const secondSession = groupedSessions.find(s => s.sessionId === selectedSessions[1]);

    if (firstSession && secondSession) {
      const sortedSessions = [firstSession, secondSession].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      // Load career recommendations for both sessions
      const firstAssessmentId = sortedSessions[0]!.assessments[0]?.id;
      const secondAssessmentId = sortedSessions[1]!.assessments[0]?.id;

      const [firstCareers, secondCareers] = await Promise.all([
        firstAssessmentId ? loadCareerRecommendations(firstAssessmentId) : Promise.resolve([]),
        secondAssessmentId ? loadCareerRecommendations(secondAssessmentId) : Promise.resolve([])
      ]);

      setComparisonData({
        first: { ...sortedSessions[0]!, careerRecommendations: firstCareers },
        second: { ...sortedSessions[1]!, careerRecommendations: secondCareers }
      });
      setShowComparison(true);

      setTimeout(() => setAnimateScores(true), 500);
    }
  };

  const renderScoreComparison = (label: string, oldScore: number, newScore: number) => {
    const normalizedOld = oldScore > 1 ? oldScore : oldScore * 100;
    const normalizedNew = newScore > 1 ? newScore : newScore * 100;

    const diff = {
      value: normalizedNew - normalizedOld,
      isPositive: normalizedNew > normalizedOld,
      isNegative: normalizedNew < normalizedOld
    };

    return (
      <div className="comparison-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">{label}</h4>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Before</span>
              <span className="font-semibold text-gray-900 dark:text-white">{normalizedOld.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: animateScores ? `${Math.min(normalizedOld, 100)}%` : '0%', transition: 'width 1.5s ease-out' }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">After</span>
              <span className="font-semibold text-gray-900 dark:text-white">{normalizedNew.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${diff.isPositive ? 'bg-green-500' : diff.isNegative ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: animateScores ? `${Math.min(normalizedNew, 100)}%` : '0%', transition: 'width 1.5s ease-out 0.3s' }}
              ></div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <span className="text-sm text-gray-600 dark:text-gray-400">Change</span>
          <span className={`font-semibold flex items-center gap-1 ${diff.isPositive ? 'text-green-600' : diff.isNegative ? 'text-red-600' : 'text-gray-600'}`}>
            {diff.isPositive && '↗'}{diff.isNegative && '↘'}{!diff.isPositive && !diff.isNegative && '→'}
            {diff.isPositive ? '+' : ''}{diff.value.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  // Calculate changes for summary
  const calculateChanges = () => {
    if (!comparisonData) return { bigFive: null, riasec: null };

    let bigFiveChanges: Record<string, number> | null = null;
    let riasecChanges: Record<string, number> | null = null;

    if (comparisonData.first.bigFiveScores && comparisonData.second.bigFiveScores) {
      bigFiveChanges = {};
      Object.keys(comparisonData.first.bigFiveScores).forEach(key => {
        const oldVal = comparisonData.first.bigFiveScores[key] > 1 ? comparisonData.first.bigFiveScores[key] : comparisonData.first.bigFiveScores[key] * 100;
        const newVal = comparisonData.second.bigFiveScores[key] > 1 ? comparisonData.second.bigFiveScores[key] : comparisonData.second.bigFiveScores[key] * 100;
        bigFiveChanges![key] = newVal - oldVal;
      });
    }

    if (comparisonData.first.riasecScores && comparisonData.second.riasecScores) {
      riasecChanges = {};
      Object.keys(comparisonData.first.riasecScores).forEach(key => {
        const oldVal = comparisonData.first.riasecScores[key] > 1 ? comparisonData.first.riasecScores[key] : comparisonData.first.riasecScores[key] * 100;
        const newVal = comparisonData.second.riasecScores[key] > 1 ? comparisonData.second.riasecScores[key] : comparisonData.second.riasecScores[key] * 100;
        riasecChanges![key] = newVal - oldVal;
      });
    }

    return { bigFive: bigFiveChanges, riasec: riasecChanges };
  };

  // Comparison Results View
  if (showComparison && comparisonData) {
    const changes = calculateChanges();
    const summaryMessages = generateSummaryMessages(changes.bigFive, changes.riasec);
    const daysDiff = Math.floor(Math.abs(comparisonData.second.timestamp.getTime() - comparisonData.first.timestamp.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <button
                onClick={() => { setShowComparison(false); setSelectedSessions([]); setComparisonData(null); setAnimateScores(false); }}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors mb-6 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to List
              </button>

              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Comparison Results</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Comparing changes between {comparisonData.first.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} and {comparisonData.second.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <div className="flex justify-center gap-8 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{daysDiff < 1 ? '< 1' : daysDiff} days</div>
                    <div className="text-sm text-gray-500">Time Gap</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(comparisonData.first.bigFiveScores && comparisonData.second.bigFiveScores ? 5 : 0) + (comparisonData.first.riasecScores && comparisonData.second.riasecScores ? 6 : 0)}
                    </div>
                    <div className="text-sm text-gray-500">Metrics Compared</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Big Five Comparison */}
              {comparisonData.first.bigFiveScores && comparisonData.second.bigFiveScores && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    Big Five Comparison
                    <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">5 metrics</span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderScoreComparison('Openness', comparisonData.first.bigFiveScores.openness, comparisonData.second.bigFiveScores.openness)}
                    {renderScoreComparison('Conscientiousness', comparisonData.first.bigFiveScores.conscientiousness, comparisonData.second.bigFiveScores.conscientiousness)}
                    {renderScoreComparison('Extraversion', comparisonData.first.bigFiveScores.extraversion, comparisonData.second.bigFiveScores.extraversion)}
                    {renderScoreComparison('Agreeableness', comparisonData.first.bigFiveScores.agreeableness, comparisonData.second.bigFiveScores.agreeableness)}
                    {renderScoreComparison('Neuroticism', comparisonData.first.bigFiveScores.neuroticism, comparisonData.second.bigFiveScores.neuroticism)}
                  </div>
                </div>
              )}

              {/* RIASEC Comparison */}
              {comparisonData.first.riasecScores && comparisonData.second.riasecScores && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    RIASEC Comparison
                    <span className="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">6 metrics</span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {renderScoreComparison('Realistic', comparisonData.first.riasecScores.realistic, comparisonData.second.riasecScores.realistic)}
                    {renderScoreComparison('Investigative', comparisonData.first.riasecScores.investigative, comparisonData.second.riasecScores.investigative)}
                    {renderScoreComparison('Artistic', comparisonData.first.riasecScores.artistic, comparisonData.second.riasecScores.artistic)}
                    {renderScoreComparison('Social', comparisonData.first.riasecScores.social, comparisonData.second.riasecScores.social)}
                    {renderScoreComparison('Enterprising', comparisonData.first.riasecScores.enterprising, comparisonData.second.riasecScores.enterprising)}
                    {renderScoreComparison('Conventional', comparisonData.first.riasecScores.conventional, comparisonData.second.riasecScores.conventional)}
                  </div>
                </div>
              )}

              {/* Career Recommendations Comparison */}
              {(comparisonData.first.careerRecommendations?.length || comparisonData.second.careerRecommendations?.length) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center justify-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    Top 5 Career Recommendations
                    <span className="text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full">Career Matches</span>
                  </h2>

                  <div className="grid md:grid-cols-2 gap-10">
                    {/* Before */}
                    <div className="flex flex-col">
                      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-5 flex items-center justify-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                        Before ({comparisonData.first.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                      </h3>
                      <div className="flex flex-col gap-4 flex-1">
                        {comparisonData.first.careerRecommendations?.length ? (
                          comparisonData.first.careerRecommendations.map((career, idx) => (
                            <CareerTooltip key={career.career_id} career={career}>
                              <Link
                                to={`/careers/${career.career_slug || career.career_id}`}
                                className="flex items-center gap-3 px-3 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                              >
                                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="flex-1 text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                  {career.career_title}
                                </span>
                                <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">{career.score.toFixed(1)}%</span>
                              </Link>
                            </CareerTooltip>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">No career recommendations available</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* After */}
                    <div className="flex flex-col">
                      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-5 flex items-center justify-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                        After ({comparisonData.second.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                      </h3>
                      <div className="flex flex-col gap-4 flex-1">
                        {comparisonData.second.careerRecommendations?.length ? (
                          comparisonData.second.careerRecommendations.map((career, idx) => {
                            const wasInPrevious = comparisonData.first.careerRecommendations?.some(c => c.career_id === career.career_id);
                            const previousRank = comparisonData.first.careerRecommendations?.find(c => c.career_id === career.career_id)?.rank;
                            const rankChange = previousRank ? previousRank - career.rank : null;

                            return (
                              <CareerTooltip key={career.career_id} career={career}>
                                <Link
                                  to={`/careers/${career.career_slug || career.career_id}`}
                                  className="flex items-center gap-3 px-3 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group border border-transparent hover:border-green-200 dark:hover:border-green-800"
                                >
                                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="flex-1 text-sm text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                    {career.career_title}
                                  </span>
                                  {!wasInPrevious && (
                                    <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-[10px] font-semibold rounded flex-shrink-0">New</span>
                                  )}
                                  {rankChange !== null && rankChange > 0 && (
                                    <span className="text-green-600 text-[10px] font-bold flex-shrink-0">↑{rankChange}</span>
                                  )}
                                  {rankChange !== null && rankChange < 0 && (
                                    <span className="text-red-600 text-[10px] font-bold flex-shrink-0">↓{Math.abs(rankChange)}</span>
                                  )}
                                  <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">{career.score.toFixed(1)}%</span>
                                </Link>
                              </CareerTooltip>
                            );
                          })
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">No career recommendations available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Summary of Changes</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Based on the comparison results, here's an analysis of your development and changes in personality and career interests over time.
                </p>

                {/* Dynamic insights */}
                <div className="space-y-4 mb-6">
                  {summaryMessages.improved.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                        <span>↗</span> Areas of Improvement ({summaryMessages.improved.length})
                      </h4>
                      <ul className="space-y-2">
                        {summaryMessages.improved.slice(0, 5).map((msg, idx) => (
                          <li key={idx} className="text-sm text-green-600 dark:text-green-300 flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>{msg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryMessages.decreased.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                        <span>↘</span> Areas of Decrease ({summaryMessages.decreased.length})
                      </h4>
                      <ul className="space-y-2">
                        {summaryMessages.decreased.slice(0, 5).map((msg, idx) => (
                          <li key={idx} className="text-sm text-red-600 dark:text-red-300 flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>{msg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryMessages.stable.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <span>→</span> Stable Areas ({summaryMessages.stable.length})
                      </h4>
                      <ul className="space-y-1">
                        {summaryMessages.stable.slice(0, 3).map((msg, idx) => (
                          <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>{msg}</span>
                          </li>
                        ))}
                        {summaryMessages.stable.length > 3 && (
                          <li className="text-sm text-gray-500 italic">...and {summaryMessages.stable.length - 3} more stable metrics</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full">
                    <span>↗</span> Improved
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-full">
                    <span>↘</span> Decreased
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full">
                    <span>→</span> Stable
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => { setShowComparison(false); setSelectedSessions([]); setComparisonData(null); setAnimateScores(false); }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                  >
                    Compare Others
                  </button>
                  <button onClick={() => window.print()} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all">
                    Print Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Main List View
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors mb-6">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Dashboard
            </Link>

            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Progress History Comparison</h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">Track your changes and progress across personality assessments</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-purple-600 animate-spin mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading assessment history...</p>
            </div>
          ) : groupedSessions.length < 2 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {groupedSessions.length === 0 ? 'No assessment data yet' : 'Need more data to compare'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  {groupedSessions.length === 0
                    ? 'You have no assessment results yet. Take your first assessment to start tracking progress.'
                    : `You have ${groupedSessions.length} assessment session. Need at least 2 sessions to use comparison feature.`}
                </p>
                <Link to="/assessment" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Take New Assessment
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              {/* Header with Compare Button */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Assessment History ({groupedSessions.length} sessions)</h2>
                  <p className="text-gray-600 dark:text-gray-400">Select 2 sessions to compare changes over time</p>
                </div>
                {selectedSessions.length === 2 && (
                  <button
                    onClick={handleCompareResults}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Compare Selected ({selectedSessions.length}/2)
                  </button>
                )}
                {selectedSessions.length === 1 && (
                  <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg">
                    Select 1 more session
                  </span>
                )}
              </div>

              {/* Session List - Like Assessment History */}
              <div className="space-y-4">
                {groupedSessions.map((session) => {
                  const isSelected = selectedSessions.includes(session.sessionId);
                  const topRiasec = session.topRiasecType ? RIASEC_LABELS[session.topRiasecType] || session.topRiasecType : null;
                  const topBigFive = session.topBigFiveTrait ? BIG_FIVE_LABELS[session.topBigFiveTrait] || session.topBigFiveTrait : null;
                  const riasecScore = session.riasecScores ? Math.round(getTopScore(session.riasecScores)) : null;
                  const bigFiveScore = session.bigFiveScores ? Math.round(getTopScore(session.bigFiveScores)) : null;

                  return (
                    <div
                      key={session.sessionId}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSessions(prev => prev.filter(id => id !== session.sessionId));
                        } else if (selectedSessions.length < 2) {
                          setSelectedSessions(prev => [...prev, session.sessionId]);
                        }
                      }}
                      className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Checkbox */}
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300 dark:border-gray-600'
                            }`}>
                            {isSelected && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>

                          {/* Session Info */}
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                              {session.timestamp.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {session.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </h3>
                            <div className="flex items-center gap-4 mt-2">
                              {session.hasRIASEC && topRiasec && (
                                <span className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  RIASEC: {topRiasec} ({riasecScore}%)
                                </span>
                              )}
                              {session.hasBigFive && topBigFive && (
                                <span className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                  BigFive: {topBigFive} ({bigFiveScore}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-2">
                          {session.hasBigFive && session.hasRIASEC && (
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                              RIASEC + BigFive
                            </span>
                          )}
                          {session.hasBigFive && !session.hasRIASEC && (
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
                              BigFive
                            </span>
                          )}
                          {session.hasRIASEC && !session.hasBigFive && (
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                              RIASEC
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ProgressComparisonPage;
