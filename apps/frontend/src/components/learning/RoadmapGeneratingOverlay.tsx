import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, AlertTriangle, X } from 'lucide-react';

interface RoadmapGeneratingOverlayProps {
  visible: boolean;
  /** Người dùng xác nhận thoát thật (sẽ huỷ generate) */
  onConfirmExit: () => void;
  /** Title hiển thị trên overlay */
  title?: string;
  /** Message hiển thị mô tả */
  message?: string;
}

/**
 * Overlay nhẹ cho việc TẠO LỘ TRÌNH (khác với phân tích CV):
 *  - KHÔNG khoá scroll/keyboard/mouse (cho phép user tương tác bình thường ở chỗ khác)
 *  - CHỈ hỏi xác nhận khi user thực sự muốn rời trang
 *  - Hiển thị progress + thông báo nhẹ
 */
const RoadmapGeneratingOverlay: React.FC<RoadmapGeneratingOverlayProps> = ({
  visible,
  onConfirmExit,
  title = 'AI đang tạo lộ trình cá nhân hóa cho bạn',
  message = 'Quá trình này có thể mất 30 - 60 giây. Vui lòng đợi trong giây lát.',
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Pseudo progress: animation 0% → 95% trong ~50s
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      startedAtRef.current = null;
      setShowExitConfirm(false);
      return;
    }
    startedAtRef.current = Date.now();
    const interval = window.setInterval(() => {
      if (!startedAtRef.current) return;
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      // 0-30s tăng nhanh tới 70%, 30-60s tăng chậm tới 95%
      let pct: number;
      if (elapsed < 30) pct = (elapsed / 30) * 70;
      else if (elapsed < 60) pct = 70 + ((elapsed - 30) / 30) * 25;
      else pct = 95;
      setProgress(Math.min(95, Math.round(pct)));
    }, 500);
    return () => window.clearInterval(interval);
  }, [visible]);

  // Cảnh báo native khi user F5/đóng tab
  useEffect(() => {
    if (!visible) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [visible]);

  // Cảnh báo khi user click nút Back/Forward trình duyệt
  useEffect(() => {
    if (!visible) return;
    // Push một entry để bắt được popstate
    window.history.pushState({ roadmapGen: true }, '');
    const handler = () => {
      setShowExitConfirm(true);
      // Push lại để stay tại trang
      window.history.pushState({ roadmapGen: true }, '');
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop nhẹ + dialog progress */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-gen-title"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowExitConfirm(true);
          }
        }}
      >
        <div
          style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: 20,
            padding: '2rem 1.75rem',
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 25px 60px rgba(2, 6, 23, 0.4)',
            border: '1px solid rgba(99, 102, 241, 0.18)',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 1rem',
              borderRadius: 18,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(99, 102, 241, 0.35)',
              animation: 'rg-pulse 2s ease-in-out infinite',
            }}
          >
            <Sparkles size={28} color="#fff" />
          </div>

          <h2
            id="roadmap-gen-title"
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              textAlign: 'center',
              margin: 0,
              marginBottom: '0.5rem',
              color: '#0f172a',
            }}
          >
            {title}
          </h2>

          <p
            style={{
              textAlign: 'center',
              color: '#475569',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              marginBottom: '1.25rem',
            }}
          >
            {message}
          </p>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: 8,
              background: '#eef2f7',
              borderRadius: 999,
              overflow: 'hidden',
              marginBottom: '0.5rem',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                borderRadius: 999,
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.8rem',
              color: '#6366f1',
              fontWeight: 700,
            }}
          >
            {progress}%
          </div>
        </div>
      </div>

      {/* Modal xác nhận thoát */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExitConfirm(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '1.75rem 1.5rem',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 25px 60px rgba(2, 6, 23, 0.45)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowExitConfirm(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: 6,
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                borderRadius: 8,
              }}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 0.75rem',
                borderRadius: 14,
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={28} color="#d97706" />
            </div>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                textAlign: 'center',
                margin: 0,
                marginBottom: '0.5rem',
                color: '#0f172a',
              }}
            >
              Bạn có thực sự muốn thoát?
            </h3>
            <p
              style={{
                textAlign: 'center',
                color: '#475569',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                marginBottom: '1.25rem',
              }}
            >
              Lộ trình đang được AI tạo. Nếu thoát bây giờ, kết quả sẽ không được lưu và bạn phải làm lại từ đầu.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tiếp tục đợi
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onConfirmExit();
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Thoát ngay
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rg-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 10px 25px rgba(99, 102, 241, 0.35); }
          50% { transform: scale(1.04); box-shadow: 0 12px 30px rgba(99, 102, 241, 0.5); }
        }
      `}</style>
    </>
  );
};

export default RoadmapGeneratingOverlay;
