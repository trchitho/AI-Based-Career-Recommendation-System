import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import CVUploadForm from '../components/skillgap/CVUploadForm';
import SkillGapResult from '../components/skillgap/SkillGapResult';
import SkillHeatmapGrid from '../components/skillgap/SkillHeatmapGrid';
import LearningPlan from '../components/skillgap/LearningPlan';
import WhyUseAIScanner from '../components/skillgap/WhyUseAIScanner';
import { skillGapService } from '../services/skillGapService';
import { SkillGapAnalysis, LearningPlan as LearningPlanType } from '../types/skillGap';
import { useTheme } from '../contexts/ThemeContext';
import './SkillGapPage.css';

const SkillGapPage: React.FC = () => {
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId?: string }>();
  const { theme } = useTheme();

  const [currentStep, setCurrentStep] = useState<'upload' | 'result'>('upload');
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [learningPlan, setLearningPlan] = useState<{ plan: LearningPlanType; career_id: string } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load analysis if ID is provided in URL
  useEffect(() => {
    if (analysisId) {
      loadAnalysis(parseInt(analysisId));
    }
  }, [analysisId]);

  const loadAnalysis = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const analysisData = await skillGapService.getAnalysisDetail(id);
      setAnalysis(analysisData);
      setCurrentStep('result');

      // Load learning plan in background
      setPlanLoading(true);
      skillGapService.getLearningPlan(id)
        .then(res => setLearningPlan({ plan: res.plan, career_id: res.career_id }))
        .catch(() => {/* non-critical */})
        .finally(() => setPlanLoading(false));
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisComplete = (newAnalysisId: number) => {
    navigate(`/skill-gap/${newAnalysisId}`);
    loadAnalysis(newAnalysisId);
  };

  const handleStartInterview = () => {
    if (analysis) {
      // Navigate to interview page with analysis data
      navigate(`/interview?analysisId=${analysis.id}`);
    }
  };

  const handleNewAnalysis = () => {
    setCurrentStep('upload');
    setAnalysis(null);
    setLearningPlan(null);
    navigate('/skill-gap');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="skill-gap-page" style={theme === 'dark' ? { backgroundColor: '#111827', backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)' } : {}}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading analysis...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="skill-gap-page" style={theme === 'dark' ? { backgroundColor: '#111827', backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)' } : {}}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div className="error-container">
              <span className="error-icon">⚠️</span>
              <h2>Error Loading Analysis</h2>
              <p>{error}</p>
              <button onClick={handleNewAnalysis} className="retry-button">
                Start New Analysis
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="skill-gap-page" style={theme === 'dark' ? { backgroundColor: '#111827', backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)' } : {}}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="page-header">
          <h1>🎯 Skill Gap Analysis</h1>
          <p className="page-subtitle">
            Discover your skill gaps and get personalized learning recommendations
          </p>
        </div>
        </div>

        <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {currentStep === 'upload' && (
          <>
            <CVUploadForm onAnalysisComplete={handleAnalysisComplete} />
            <WhyUseAIScanner />
          </>
        )}

        {currentStep === 'result' && analysis && (
          <>
            <div className="result-header">
              <button onClick={handleNewAnalysis} className="back-button">
                ← New Analysis
              </button>
              <div className="analysis-info">
                <span className="analysis-date">
                  Analyzed: {new Date(analysis.created_at).toLocaleDateString()}
                </span>
                <span className="analysis-career">
                  Target: {analysis.career_id}
                </span>
              </div>
            </div>

            {/* PB12+PB13: CV analysis result */}
            <SkillGapResult
              analysis={analysis}
              onStartInterview={handleStartInterview}
            />

            {/* PB14: Skill Heatmap Grid */}
            <div style={{ marginTop: '1.5rem' }}>
              <SkillHeatmapGrid analysis={analysis} />
            </div>

            {/* PB15: AI Learning Plan */}
            <div style={{ marginTop: '1.5rem' }}>
              {planLoading ? (
                <div style={{ background: 'white', borderRadius: 16, padding: '2rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤖</div>
                  <p style={{ color: '#64748b' }}>AI đang tạo lộ trình học tập...</p>
                </div>
              ) : learningPlan ? (
                <LearningPlan plan={learningPlan.plan} careerName={learningPlan.career_id} />
              ) : null}
            </div>
          </>
        )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SkillGapPage;
