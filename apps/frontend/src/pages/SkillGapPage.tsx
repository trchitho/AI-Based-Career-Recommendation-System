import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import CVUploadForm from '../components/skillgap/CVUploadForm';
import SkillGapResult from '../components/skillgap/SkillGapResult';
import SkillHeatmap from '../components/skillgap/SkillHeatmap';
import WhyUseAIScanner from '../components/skillgap/WhyUseAIScanner';
import { skillGapService } from '../services/skillGapService';
import { SkillGapAnalysis, HeatmapData } from '../types/skillGap';
import './SkillGapPage.css';

const SkillGapPage: React.FC = () => {
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId?: string }>();
  
  const [currentStep, setCurrentStep] = useState<'upload' | 'result'>('upload');
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
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
      const [analysisData, heatmap] = await Promise.all([
        skillGapService.getAnalysisDetail(id),
        skillGapService.getHeatmapData(id)
      ]);

      setAnalysis(analysisData);
      setHeatmapData(heatmap);
      setCurrentStep('result');
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
    setHeatmapData(null);
    navigate('/skill-gap');
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="skill-gap-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading analysis...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="skill-gap-page">
          <div className="error-container">
            <span className="error-icon">⚠️</span>
            <h2>Error Loading Analysis</h2>
            <p>{error}</p>
            <button onClick={handleNewAnalysis} className="retry-button">
              Start New Analysis
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="skill-gap-page">
        <div className="page-header">
          <h1>🎯 Skill Gap Analysis</h1>
          <p className="page-subtitle">
            Discover your skill gaps and get personalized learning recommendations
          </p>
        </div>

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

            <SkillGapResult 
              analysis={analysis} 
              onStartInterview={handleStartInterview}
            />

            {heatmapData && (
              <SkillHeatmap data={heatmapData} />
            )}

            {/* Learning Recommendations */}
            <div className="recommendations-section">
              <h2>📚 Recommended Learning Path</h2>
              <div className="learning-path">
                {analysis.skill_gaps?.critical && analysis.skill_gaps.critical.length > 0 && (
                  <div className="learning-phase">
                    <h3>Phase 1: Critical Skills (Priority)</h3>
                    <ul>
                      {analysis.skill_gaps.critical.slice(0, 3).map((skill, index) => (
                        <li key={index}>
                          <strong>{skill.name}</strong> - {skill.category}
                          <span className="time-estimate">Est. 2-4 weeks</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.skill_gaps?.important && analysis.skill_gaps.important.length > 0 && (
                  <div className="learning-phase">
                    <h3>Phase 2: Important Skills</h3>
                    <ul>
                      {analysis.skill_gaps.important.slice(0, 3).map((skill, index) => (
                        <li key={index}>
                          <strong>{skill.name}</strong> - {skill.category}
                          <span className="time-estimate">Est. 1-2 weeks</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.skill_gaps?.nice_to_have && analysis.skill_gaps.nice_to_have.length > 0 && (
                  <div className="learning-phase">
                    <h3>Phase 3: Nice-to-Have Skills</h3>
                    <ul>
                      {analysis.skill_gaps.nice_to_have.slice(0, 3).map((skill, index) => (
                        <li key={index}>
                          <strong>{skill.name}</strong> - {skill.category}
                          <span className="time-estimate">Est. 1 week</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default SkillGapPage;
