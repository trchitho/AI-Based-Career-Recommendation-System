import React, { useState, useEffect } from 'react';
import { skillGapService } from '../../services/skillGapService';
import { recommendationService } from '../../services/recommendationService';
import { assessmentService } from '../../services/assessmentService';
import './CVUploadForm.css';

interface CVUploadFormProps {
  onAnalysisComplete: (analysisId: number) => void;
}

const CVUploadForm: React.FC<CVUploadFormProps> = ({ onAnalysisComplete }) => {
  const [careerId, setCareerId] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [recommendedCareers, setRecommendedCareers] = useState<Array<{ id: string, title: string, match: number }>>([]);
  const [loadingCareers, setLoadingCareers] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load career recommendations from latest assessment
  useEffect(() => {
    const loadCareerRecommendations = async () => {
      try {
        setLoadingCareers(true);
        console.log('Loading career recommendations from latest assessment...');

        // Get latest assessment
        const history = await assessmentService.getHistory();
        if (history && history.length > 0) {
          const latestAssessment = history[0];
          console.log('Latest assessment:', latestAssessment);

          if (latestAssessment?.id) {
            // Get recommendations
            const recData = await recommendationService.getMain(latestAssessment.id, 5);
            console.log('Recommendations:', recData);

            if (recData.items && recData.items.length > 0) {
              const careers = recData.items.map((career: any) => ({
                id: career.slug || career.career_id,
                title: career.title_en || career.title_vi || 'Unknown Career',
                match: Math.round(career.display_match || career.match_score || 0)
              }));

              setRecommendedCareers(careers);

              // Auto-select the top career
              if (careers.length > 0 && !careerId) {
                setCareerId(careers[0]?.id || '');
              }

              console.log('Loaded careers:', careers);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load career recommendations:', err);
      } finally {
        setLoadingCareers(false);
      }
    };

    loadCareerRecommendations();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

      if (validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        setCvFile(file);
        setError(null);

        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setError('Please upload a PDF or image file (JPG, PNG)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

      if (validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        setCvFile(file);
        setError(null);

        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setError('Please upload a PDF or image file (JPG, PNG)');
      }
    }
  };

  const handlePreviewClick = () => {
    if (previewUrl) {
      // Open in new browser tab
      window.open(previewUrl, '_blank');
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Prevent page navigation during analysis
  useEffect(() => {
    if (loading) {
      // Prevent browser back/forward
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);

        // Show warning
        if (!document.querySelector('.navigation-warning')) {
          const warning = document.createElement('div');
          warning.className = 'navigation-warning';
          warning.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ef4444;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          warning.textContent = '⚠️ Không thể rời khỏi trang khi đang phân tích!';
          document.body.appendChild(warning);

          setTimeout(() => {
            if (warning.parentNode) {
              warning.remove();
            }
          }, 3000);
        }
      };

      // Prevent page refresh/close
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Đang phân tích CV. Bạn có chắc muốn rời khỏi trang? Điều này có thể gây lỗi hệ thống.';
        return e.returnValue;
      };

      // Add event listeners
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Push current state to prevent back navigation
      window.history.pushState(null, '', window.location.href);

      // Cleanup
      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!careerId || !cvFile) {
      setError('Please select a career and upload your CV');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Uploading
      setProgressMessage('Đang tải lên CV...');
      setProgress(10);

      // Realistic progress simulation
      const progressSteps = [
        { progress: 15, message: 'Đang xử lý file CV...', delay: 800 },
        { progress: 25, message: 'Đang trích xuất văn bản...', delay: 1200 },
        { progress: 40, message: 'AI đang phân tích nội dung...', delay: 1500 },
        { progress: 60, message: 'Đang so sánh với yêu cầu công việc...', delay: 1800 },
        { progress: 80, message: 'Đang tạo báo cáo chi tiết...', delay: 1000 },
        { progress: 95, message: 'Hoàn tất phân tích...', delay: 500 }
      ];

      // Start progress simulation
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          const step = progressSteps[currentStep];
          setProgress(step.progress);
          setProgressMessage(step.message);
          currentStep++;
        }
      }, 1000);

      console.log('Starting CV analysis...', { careerId, fileName: cvFile.name });
      const result = await skillGapService.analyzeCV(careerId, cvFile);

      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage('Phân tích hoàn tất!');

      console.log('Analysis result:', result);

      // Check for analysis_id in different possible locations
      const analysisId = result.data?.analysis_id || result.data?.id || result.analysis_id || result.id;

      if (result.success && analysisId) {
        console.log('Analysis ID:', analysisId);
        setTimeout(() => {
          onAnalysisComplete(analysisId);
        }, 1000); // Give user time to see completion
      } else {
        console.error('No analysis ID found in result:', result);
        setError('Analysis completed but no ID returned. Please try again.');
        setProgress(0);
        setProgressMessage('');
      }
    } catch (err: any) {
      console.error('CV analysis error:', err);

      // Check for payment required error (402)
      if (err.response?.status === 402) {
        const errorData = err.response?.data?.detail;

        if (errorData && typeof errorData === 'object') {
          // Structured error response
          const message = errorData.message || 'Chức năng này yêu cầu gói trả phí';
          const currentPlan = errorData.current_plan || 'Free';
          const requiredPlans = errorData.required_plans?.join(', ') || 'Basic/Premium/Pro';

          setError(
            `🔒 ${message}\n\n` +
            `Gói hiện tại: ${currentPlan}\n` +
            `Vui lòng nâng cấp lên: ${requiredPlans}\n\n` +
            `Nhấn vào nút "Nâng cấp tài khoản" bên dưới để xem các gói.`
          );
        } else {
          // Simple error message
          setError(
            '🔒 Chức năng Phân tích Skill Gap yêu cầu gói trả phí.\n\n' +
            'Vui lòng nâng cấp tài khoản để sử dụng tính năng này.'
          );
        }
      } else {
        // Other errors - make sure to convert to string
        const errorMessage = err.message || err.toString() || 'Failed to analyze CV';
        setError(errorMessage);
      }

      setProgress(0);
      setProgressMessage('');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <>
      {/* BLOCKING OVERLAY DURING ANALYSIS */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'not-allowed'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Show warning if user tries to click
            if (!document.querySelector('.analysis-warning')) {
              const warning = document.createElement('div');
              warning.className = 'analysis-warning';
              warning.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 600;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
              `;
              warning.textContent = '⚠️ Đang phân tích, vui lòng đợi...';
              document.body.appendChild(warning);

              // Add animation keyframes
              if (!document.querySelector('#analysis-warning-styles')) {
                const style = document.createElement('style');
                style.id = 'analysis-warning-styles';
                style.textContent = `
                  @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                  }
                `;
                document.head.appendChild(style);
              }

              setTimeout(() => {
                if (warning.parentNode) {
                  warning.remove();
                }
              }, 3000);
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '3rem 2rem',
              textAlign: 'center',
              maxWidth: '500px',
              margin: '0 20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated AI Icon */}
            <div
              style={{
                fontSize: '4rem',
                marginBottom: '1.5rem',
                animation: 'pulse 2s infinite'
              }}
            >
              🤖
            </div>

            <h2 style={{
              fontSize: '1.8rem',
              marginBottom: '1rem',
              color: '#1f2937',
              fontWeight: 'bold'
            }}>
              AI đang phân tích CV của bạn
            </h2>

            <p style={{
              fontSize: '1.1rem',
              color: '#6b7280',
              marginBottom: '2rem',
              lineHeight: '1.6'
            }}>
              Vui lòng không tắt trình duyệt hoặc rời khỏi trang này.<br />
              Quá trình phân tích có thể mất 30-60 giây.
            </p>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '1rem',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease-out'
                }}
              />
            </div>

            {/* Progress Info */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <span style={{
                fontSize: '0.9rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {progressMessage}
              </span>
              <span style={{
                fontSize: '0.9rem',
                color: '#3b82f6',
                fontWeight: 'bold'
              }}>
                {progress}%
              </span>
            </div>

            {/* Warning Message */}
            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                fontSize: '0.85rem',
                color: '#92400e',
                margin: 0,
                fontWeight: '500'
              }}>
                ⚠️ Không được tắt trang này khi đang phân tích, có thể gây lỗi hệ thống!
              </p>
            </div>

            {/* Processing Steps */}
            <div style={{ textAlign: 'left', marginTop: '1.5rem' }}>
              <h4 style={{
                fontSize: '1rem',
                color: '#374151',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                Các bước đang thực hiện:
              </h4>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: '1.8' }}>
                <div style={{
                  opacity: progress >= 20 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  ✓ Tải lên CV
                </div>
                <div style={{
                  opacity: progress >= 40 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  {progress >= 40 ? '✓' : '⏳'} Trích xuất văn bản từ CV
                </div>
                <div style={{
                  opacity: progress >= 60 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  {progress >= 60 ? '✓' : '⏳'} AI phân tích kỹ năng
                </div>
                <div style={{
                  opacity: progress >= 80 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  {progress >= 80 ? '✓' : '⏳'} So sánh với yêu cầu công việc
                </div>
                <div style={{
                  opacity: progress >= 100 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  {progress >= 100 ? '✓' : '⏳'} Tạo báo cáo kết quả
                </div>
              </div>
            </div>

            {/* Add pulse animation */}
            <style>
              {`
                @keyframes pulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.1); }
                }
              `}
            </style>
          </div>
        </div>
      )}

      <div className="cv-upload-form">
        <div className="form-header">
          <h2>📊 Skill Gap Analysis</h2>
          <p>Upload your CV to discover skill gaps and get personalized recommendations</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="career-select">
              Target Career
              {loadingCareers && <span className="ml-2 text-sm text-gray-500">(Loading from your assessment...)</span>}
            </label>

            <select
              id="career-select"
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              required
              disabled={loadingCareers}
              className="career-select"
            >
              <option value="">Select a career to analyze...</option>

              {/* Recommended careers from assessment */}
              {recommendedCareers.length > 0 && (
                <optgroup label="🎯 Recommended for You (from your assessment)">
                  {recommendedCareers.map((career) => (
                    <option key={career.id} value={career.id}>
                      {career.title} ({career.match}% match)
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Fallback careers if no assessment */}
              {recommendedCareers.length === 0 && !loadingCareers && (
                <>
                  <option value="software-developers-15-1252-00">Software Developers</option>
                  <option value="web-developers-15-1254-00">Web Developers</option>
                  <option value="computer-programmers-15-1251-00">Computer Programmers</option>
                  <option value="web-and-digital-interface-designers-15-1255-00">Web and Digital Interface Designers</option>
                  <option value="database-administrators-15-1242-00">Database Administrators</option>
                  <option value="computer-systems-analysts-15-1211-00">Computer Systems Analysts</option>
                  <option value="information-security-analysts-15-1212-00">Information Security Analysts</option>
                  <option value="network-and-computer-systems-administrators-15-1244-00">Network and Computer Systems Administrators</option>
                </>
              )}
            </select>

            {recommendedCareers.length > 0 && careerId && (
              <div className="career-info-hint">
                <p className="text-sm text-blue-600 mt-2">
                  ℹ️ System will load all job requirements from database and compare with your CV
                </p>
              </div>
            )}

            {recommendedCareers.length === 0 && !loadingCareers && (
              <p className="text-sm text-yellow-600 mt-1">
                ⚠️ No assessment found. Complete a career assessment first for personalized recommendations.
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Upload CV (PDF or Image)</label>
            <div
              className={`file-drop-zone ${dragActive ? 'active' : ''} ${cvFile ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {cvFile ? (
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{cvFile.name}</span>
                  <button
                    type="button"
                    className="remove-file"
                    onClick={() => setCvFile(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span className="upload-icon">📤</span>
                  <p>Drag and drop your CV here</p>
                  <p className="text-sm text-gray-500">Supports: PDF, JPG, PNG</p>
                  <p className="or-text">or</p>
                  <label htmlFor="file-input" className="browse-button">
                    Browse Files
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ whiteSpace: 'pre-line' }}>⚠️ {error}</span>
                <button
                  onClick={() => setError(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: 1, color: 'inherit', flexShrink: 0, padding: '0 2px' }}
                  aria-label="Đóng thông báo lỗi"
                >
                  ✕
                </button>
              </div>

              {/* Show upgrade button if payment required */}
              {error.includes('🔒') && (
                <button
                  type="button"
                  onClick={() => window.location.href = '/pricing'}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
                >
                  💳 Nâng cấp tài khoản
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="progress-message">{progressMessage}</p>
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={loading || !careerId || !cvFile}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Analyzing... {progress}%
              </>
            ) : (
              <>
                🔍 Analyze My Skills
              </>
            )}
          </button>

          {cvFile && !loading && (
            <button
              type="button"
              className="preview-button"
              onClick={handlePreviewClick}
            >
              👁️ Preview CV
            </button>
          )}
        </form>

        <div className="info-box">
          <h4>What happens next?</h4>
          <ul>
            <li>🤖 AI extracts skills from your CV</li>
            <li>📊 Compares with job requirements</li>
            <li>🎯 Identifies skill gaps</li>
            <li>💡 Provides learning recommendations</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default CVUploadForm;
