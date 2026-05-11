import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { skillGapService } from '../../services/skillGapService';
import { recommendationService } from '../../services/recommendationService';
import { assessmentService } from '../../services/assessmentService';
import './CVUploadForm.css';

interface SelectOption { value: string; label: string; }
interface SelectGroup  { label: string; options: SelectOption[]; }

interface CareerSelectProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  groups?: SelectGroup[];
  options?: SelectOption[];
}

const CareerSelect: React.FC<CareerSelectProps> = ({
  value, onChange, disabled, placeholder = 'Chọn nghề nghiệp để phân tích...', groups = [], options = []
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  let displayLabel = placeholder;
  for (const g of groups) {
    const found = g.options.find(o => o.value === value);
    if (found) { displayLabel = found.label; break; }
  }
  for (const o of options) {
    if (o.value === value) { displayLabel = o.label; break; }
  }

  return (
    <div className="career-select-wrapper" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        className={`career-select-trigger${open ? ' open' : ''}`}
        onClick={() => !disabled && setOpen(p => !p)}
      >
        <span className="career-select-trigger-text">{displayLabel}</span>
        <ChevronDown size={16} className="career-select-trigger-icon" />
      </button>

      {open && (
        <div className="career-select-dropdown">
          <div className="career-select-option placeholder" onClick={() => { onChange(''); setOpen(false); }}>
            {placeholder}
          </div>

          {groups.map(g => (
            <div key={g.label}>
              <div className="career-select-group-label">{g.label}</div>
              {g.options.map(o => (
                <div
                  key={o.value}
                  className={`career-select-option${o.value === value ? ' selected' : ''}`}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                >
                  {o.label}
                </div>
              ))}
            </div>
          ))}

          {options.map(o => (
            <div
              key={o.value}
              className={`career-select-option${o.value === value ? ' selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
                title: career.title_vi || career.title_en || 'Nghề nghiệp chưa xác định',
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
        setError('Vui lòng tải lên file PDF hoặc hình ảnh (JPG, PNG)');
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
        setError('Vui lòng tải lên file PDF hoặc hình ảnh (JPG, PNG)');
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
            background: ef4444;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          warning.textContent = 'Không thể rời khỏi trang khi đang phân tích!';
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
      setError('Vui lòng chọn nghề nghiệp và tải lên CV của bạn');
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
        setError('Phân tích hoàn tất nhưng không nhận được ID. Vui lòng thử lại.');
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
            `${message}\n\n` +
            `Gói hiện tại: ${currentPlan}\n` +
            `Vui lòng nâng cấp lên: ${requiredPlans}\n\n` +
            `Nhấn vào nút "Nâng cấp tài khoản" bên dưới để xem các gói.`
          );
        } else {
          // Simple error message
          setError(
            'Chức năng Phân tích Skill Gap yêu cầu gói trả phí.\n\n' +
            'Vui lòng nâng cấp tài khoản để sử dụng tính năng này.'
          );
        }
      } else {
        // Other errors - make sure to convert to string
        const errorMessage = err.message || err.toString() || 'Không thể phân tích CV';
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
                background: ef4444;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 600;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;
              `;
              warning.textContent = 'Đang phân tích, vui lòng đợi...';
              document.body.appendChild(warning);

              // Add animation keyframes
              if (!document.querySelector('analysis-warning-styles')) {
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
              background: 'var(--neu-bg-card)',
              borderRadius: '24px',
              padding: '3rem 2rem',
              textAlign: 'center',
              maxWidth: '500px',
              margin: '0 20px',
              boxShadow: 'var(--neu-raised-lg)',
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
              
            </div>

            <h2 style={{
              fontSize: '1.6rem',
              marginBottom: '0.75rem',
              color: 'var(--neu-text)',
              fontWeight: '800'
            }}>
              AI đang phân tích CV của bạn
            </h2>

            <p style={{
              fontSize: '1rem',
              color: 'var(--neu-text-muted)',
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              Vui lòng không tắt trình duyệt hoặc rời khỏi trang này.<br />
              Quá trình phân tích có thể mất 30-60 giây.
            </p>

            {/* Progress Bar */}
            <div style={{ width:'100%', height:'8px', background:'var(--neu-bg)', borderRadius:'4px', marginBottom:'0.75rem', overflow:'hidden', boxShadow:'inset 2px 2px 4px var(--neu-shadow-dark)' }}>
              <div style={{ height:'100%', background:'var(--neu-accent)', borderRadius:'4px', width:`${progress}%`, transition:'width 0.3s ease-out' }} />
            </div>

            {/* Progress Info */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
              <span style={{ fontSize:'0.875rem', color:'var(--neu-text-muted)', fontWeight:'#500' }}>{progressMessage}</span>
              <span style={{ fontSize:'0.875rem', color:'var(--neu-accent)', fontWeight:'#700' }}>{progress}%</span>
            </div>

            {/* Warning Message */}
            <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', borderRadius:'10px', padding:'10px 14px', marginBottom:'1.5rem' }}>
              <p style={{ fontSize:'0.85rem', color:'#92400e', margin:0, fontWeight:'#500' }}>
                 Không được tắt trang này khi đang phân tích, có thể gây lỗi hệ thống!
              </p>
            </div>

            {/* Processing Steps */}
            <div style={{ textAlign:'left', marginTop:'1.25rem' }}>
              <h4 style={{ fontSize:'0.9rem', color:'var(--neu-text)', marginBottom:'0.5rem', fontWeight:'#600' }}>
                Các bước đang thực hiện:
              </h4>
              <div style={{ fontSize:'0.85rem', color:'var(--neu-text-muted)', lineHeight:'1.8' }}>
                <div style={{
                  opacity: progress >= 20 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                   Tải lên CV
                </div>
                <div style={{
                  opacity: progress >= 40 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  {progress >= 40 ? '' : '⏳'} Trích xuất văn bản từ CV
                </div>
                <div style={{
                  opacity: progress >= 60 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  {progress >= 60 ? '' : '⏳'} AI phân tích kỹ năng
                </div>
                <div style={{
                  opacity: progress >= 80 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  {progress >= 80 ? '' : '⏳'} So sánh với yêu cầu công việc
                </div>
                <div style={{
                  opacity: progress >= 100 ? 1 : 0.5,
                  transition: 'opacity 0.3s'
                }}>
                  {progress >= 100 ? '' : '⏳'} Tạo báo cáo kết quả
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
          <h2>Phân tích Khoảng cách Kỹ năng</h2>
          <p>Tải lên CV của bạn để khám phá khoảng cách kỹ năng và nhận gợi ý cá nhân hóa</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="career-select">
              Nghề nghiệp mục tiêu
              {loadingCareers && <span className="ml-2 text-sm text-gray-500">(Đang tải từ đánh giá của bạn...)</span>}
            </label>

            <CareerSelect
              value={careerId}
              onChange={setCareerId}
              disabled={loadingCareers}
              groups={recommendedCareers.length > 0 ? [{
                label: 'Đề xuất cho bạn (từ đánh giá của bạn)',
                options: recommendedCareers.map(c => ({
                  value: c.id,
                  label: `${c.title} (${c.match}% phù hợp)`
                }))
              }] : []}
              options={recommendedCareers.length === 0 && !loadingCareers ? [
                { value: 'software-developers-15-1252-00', label: 'Lập trình viên phần mềm' },
                { value: 'web-developers-15-1254-00', label: 'Lập trình viên web' },
                { value: 'computer-programmers-15-1251-00', label: 'Lập trình viên máy tính' },
                { value: 'web-and-digital-interface-designers-15-1255-00', label: 'Thiết kế giao diện web và kỹ thuật số' },
                { value: 'database-administrators-15-1242-00', label: 'Quản trị cơ sở dữ liệu' },
                { value: 'computer-systems-analysts-15-1211-00', label: 'Phân tích hệ thống máy tính' },
                { value: 'information-security-analysts-15-1212-00', label: 'Phân tích an ninh thông tin' },
                { value: 'network-and-computer-systems-administrators-15-1244-00', label: 'Quản trị hệ thống mạng và máy tính' },
              ] : []}
            />

            {recommendedCareers.length > 0 && careerId && (
              <div className="career-info-hint">
                <p className="text-sm text-blue-600 mt-2">
                  Hệ thống sẽ tải toàn bộ yêu cầu công việc từ cơ sở dữ liệu và so sánh với CV của bạn
                </p>
              </div>
            )}

            {recommendedCareers.length === 0 && !loadingCareers && (
              <p className="text-sm text-yellow-600 mt-1">
                Không tìm thấy đánh giá. Hãy hoàn thành đánh giá nghề nghiệp trước để nhận gợi ý cá nhân hóa.
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Tải lên CV (PDF hoặc Hình ảnh)</label>
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
                    onClick={() => { setCvFile(null); setError(null); }}
                    title="Xóa và thêm CV khác"
                    style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '600' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span className="upload-icon">📁</span>
                  <p>Kéo và thả CV của bạn vào đây</p>
                  <p className="text-sm text-gray-500">Hỗ trợ: PDF, JPG, PNG</p>
                  <p className="or-text">hoặc</p>
                  <label htmlFor="file-input" className="browse-button">
                    Chọn tệp
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
            <div className="error-message" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Error text + close */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ whiteSpace: 'pre-line', fontSize: '13px' }}>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: 1, color: 'inherit', flexShrink: 0, padding: '0 2px', fontWeight: 'bold' }}
                  aria-label="Đóng thông báo lỗi"
                >✕</button>
              </div>

              {/* Replace CV button */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <label
                  htmlFor="file-input-retry"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', backgroundColor: '#1A237E', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '600',
                  }}
                >
                  ↑ Thêm CV khác vào
                  <input
                    id="file-input-retry"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setCvFile(f); setError(null); }
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {cvFile && (
                  <button
                    type="button"
                    onClick={() => { setCvFile(null); setError(null); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', backgroundColor: 'transparent', color: '#ef4444',
                      border: '1.5px solid #ef4444', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: '600',
                    }}
                  >
                    ✕ Xóa CV
                  </button>
                )}
              </div>
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
                Đang phân tích... {progress}%
              </>
            ) : (
              <>
                Phân tích kỹ năng của tôi
              </>
            )}
          </button>

          {cvFile && !loading && (
            <button
              type="button"
              className="preview-button"
              onClick={handlePreviewClick}
            >
               Xem trước CV
            </button>
          )}
        </form>

        <div className="info-box">
          <h4>Điều gì xảy ra tiếp theo?</h4>
          <ul>
            <li>AI trích xuất kỹ năng từ CV của bạn</li>
            <li>So sánh với yêu cầu công việc</li>
            <li>Xác định khoảng cách kỹ năng</li>
            <li>Cung cấp gợi ý học tập</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default CVUploadForm;
