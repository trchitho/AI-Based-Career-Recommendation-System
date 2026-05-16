import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { skillGapService } from '../../services/skillGapService';
import { recommendationService } from '../../services/recommendationService';
import { assessmentService } from '../../services/assessmentService';
import { useAnalysisLock } from '../../contexts/AnalysisLockContext';
import AnalysisLockOverlay from './AnalysisLockOverlay';
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

// ─── Helper: Validate file trước khi gửi backend ─────────────────────────────
const MAX_CV_SIZE_MB = 5;
const MAX_CV_SIZE_BYTES = MAX_CV_SIZE_MB * 1024 * 1024;

function validateCVFile(file: File): string | null {
  // Kiểm tra định dạng
  const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const isValidType =
    validTypes.includes(file.type) ||
    validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

  if (!isValidType) {
    return (
      'Định dạng tệp không hỗ trợ\n\n' +
      `Tệp '${file.name}' không thuộc các định dạng được hỗ trợ.\n\n` +
      'Gợi ý:\n' +
      '• Định dạng hỗ trợ: PDF, JPG, JPEG, PNG\n' +
      '• Đảm bảo tệp có đuôi mở rộng đúng (ví dụ: cv.pdf)\n' +
      '• Nếu tệp là ảnh, dùng định dạng JPG hoặc PNG'
    );
  }

  // Kiểm tra kích thước
  if (file.size === 0) {
    return (
      'Tệp rỗng\n\n' +
      'Tệp tải lên không có nội dung (0 bytes).\n\n' +
      'Gợi ý:\n' +
      '• Kiểm tra lại tệp CV trên máy tính của bạn\n' +
      '• Tải lại tệp CV gốc và thử lại'
    );
  }

  if (file.size > MAX_CV_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return (
      'Tệp quá lớn\n\n' +
      `Tệp có kích thước ${sizeMB} MB, vượt quá giới hạn cho phép.\n\n` +
      'Gợi ý:\n' +
      `• Kích thước tối đa: ${MAX_CV_SIZE_MB} MB\n` +
      '• Nén CV bằng công cụ online (Smallpdf, ILovePDF) trước khi tải lại\n' +
      '• Nếu là ảnh, giảm độ phân giải hoặc đổi sang JPG'
    );
  }

  return null;
}

const CVUploadForm: React.FC<CVUploadFormProps> = ({ onAnalysisComplete }) => {
  const { setLocked } = useAnalysisLock();
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
                title: career.title_vn || career.title_en || 'Nghề nghiệp chưa xác định',
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
      const errorMsg = validateCVFile(file);
      if (errorMsg) {
        setError(errorMsg);
        return;
      }
      setCvFile(file);
      setError(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const errorMsg = validateCVFile(file);
      if (errorMsg) {
        setError(errorMsg);
        return;
      }
      setCvFile(file);
      setError(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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

  // Đồng bộ trạng thái khóa phân tích với context toàn cục
  // Khi `loading` true: bật khóa (ẩn header + sidebar, chặn thao tác).
  // Đảm bảo gỡ khóa khi unmount.
  useEffect(() => {
    setLocked(loading);
  }, [loading, setLocked]);

  useEffect(() => {
    return () => {
      setLocked(false);
    };
  }, [setLocked]);

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

      const status = err.response?.status;
      const errorData = err.response?.data?.detail;

      // Check for payment required error (402)
      if (status === 402) {
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
      } else if (errorData && typeof errorData === 'object' && errorData.title) {
        // Structured Vietnamese error from backend - hiển thị title + message + suggestions
        const title = errorData.title;
        const message = errorData.message || '';
        const suggestions: string[] = Array.isArray(errorData.suggestions) ? errorData.suggestions : [];
        const suggestionText = suggestions.length > 0
          ? '\n\nGợi ý:\n' + suggestions.map(s => `• ${s}`).join('\n')
          : '';
        setError(`${title}\n\n${message}${suggestionText}`);
      } else if (errorData && typeof errorData === 'string') {
        // Plain string detail
        setError(errorData);
      } else {
        // Other errors - fallback
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Không thể phân tích CV. Vui lòng thử lại sau.';
        setError(typeof errorMessage === 'string' ? errorMessage : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
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
      {/* OVERLAY KHÓA TƯƠNG TÁC KHI ĐANG PHÂN TÍCH */}
      <AnalysisLockOverlay
        visible={loading}
        progress={progress}
        progressMessage={progressMessage}
        onConfirmExit={() => {
          // Người dùng xác nhận muốn thoát: dừng phân tích và reload trang
          setLoading(false);
          setProgress(0);
          setProgressMessage('');
          window.location.reload();
        }}
      />

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

          {error && (() => {
            // Parse structured error: "Title\n\nMessage\n\nGợi ý:\n• ..."
            const parts = error.split('\n\nGợi ý:\n');
            const mainPart = parts[0];
            const suggestionsPart = parts[1] || '';
            const titleMessageParts = mainPart.split('\n\n');
            const errorTitle = titleMessageParts.length > 1 ? titleMessageParts[0] : '';
            const errorMessage = titleMessageParts.length > 1
              ? titleMessageParts.slice(1).join('\n\n')
              : mainPart;
            const suggestions = suggestionsPart
              .split('\n')
              .map(s => s.replace(/^[•\-*]\s*/, '').trim())
              .filter(Boolean);

            return (
              <div className="error-message" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderLeft: '4px solid #ef4444',
                borderRadius: '12px',
                padding: '16px 18px',
                color: '#7f1d1d',
              }}>
                {/* Header với icon, title và close button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {errorTitle && (
                      <h4 style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#991b1b',
                        lineHeight: 1.3,
                      }}>{errorTitle}</h4>
                    )}
                    {errorMessage && (
                      <p style={{
                        margin: errorTitle ? '4px 0 0' : 0,
                        fontSize: '13px',
                        color: '#7f1d1d',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line',
                      }}>{errorMessage}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: 1,
                      color: '#991b1b',
                      flexShrink: 0,
                      padding: '4px',
                      fontWeight: 'bold',
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fecaca'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    aria-label="Đóng thông báo lỗi"
                  >✕</button>
                </div>

                {/* Suggestions list */}
                {suggestions.length > 0 && (
                  <div style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: '10px 14px',
                    border: '1px solid #fecaca',
                  }}>
                    <p style={{
                      margin: '0 0 6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#991b1b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>Gợi ý khắc phục</p>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '18px',
                      fontSize: '12.5px',
                      color: '#7f1d1d',
                      lineHeight: 1.6,
                    }}>
                      {suggestions.map((s, i) => (
                        <li key={i} style={{ marginBottom: 2 }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <label
                    htmlFor="file-input-retry"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    ↑ Tải lên CV khác
                    <input
                      id="file-input-retry"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const errMsg = validateCVFile(f);
                          if (errMsg) {
                            setError(errMsg);
                          } else {
                            setCvFile(f);
                            setError(null);
                          }
                        }
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
                      ✕ Xóa tệp này
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

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
