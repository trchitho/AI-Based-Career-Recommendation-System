import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface AnalysisLockOverlayProps {
  visible: boolean;
  progress: number;
  progressMessage: string;
  /** Người dùng xác nhận muốn thoát thật sự (sẽ huỷ phân tích) */
  onConfirmExit?: () => void;
}

/**
 * Overlay khóa tương tác chuẩn production:
 *  - Chặn scroll trên body
 *  - Chặn mọi phím tắt nguy hiểm (F5, Ctrl+R, Ctrl+W, Alt+F4, Esc, Backspace, ...)
 *  - Chặn chuột phải, chặn drag, chặn select
 *  - Chặn back/forward bằng popstate
 *  - Chặn refresh/close bằng beforeunload (browser sẽ hiện cảnh báo native)
 *  - Khi người dùng cố thoát (Esc / Back / click ngoài), hiện modal xác nhận
 *    "Bạn có thực sự muốn thoát? Kết quả sẽ không được lưu."
 */
const AnalysisLockOverlay: React.FC<AnalysisLockOverlayProps> = ({
  visible,
  progress,
  progressMessage,
  onConfirmExit,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Toast nhỏ thông báo "đang khóa" khi user thực hiện thao tác bị chặn
  const [showBlockedToast, setShowBlockedToast] = useState(false);
  const blockedToastTimer = useRef<number | null>(null);
  // Dùng ref để handler không cần re-bind khi showExitConfirm đổi
  const showExitConfirmRef = useRef(false);
  useEffect(() => {
    showExitConfirmRef.current = showExitConfirm;
  }, [showExitConfirm]);

  const triggerBlockedToast = () => {
    setShowBlockedToast(true);
    if (blockedToastTimer.current) window.clearTimeout(blockedToastTimer.current);
    blockedToastTimer.current = window.setTimeout(() => {
      setShowBlockedToast(false);
    }, 1800);
  };

  // Reset exit confirm khi overlay ẩn/hiện
  useEffect(() => {
    if (!visible) {
      setShowExitConfirm(false);
      setShowBlockedToast(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    // 1) Khóa scroll body (giữ vị trí để không nhảy)
    const scrollY = window.scrollY;
    const prevBodyStyle = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      userSelect: document.body.style.userSelect,
    };
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';

    // 2) Push một state vào history để bắt back
    window.history.pushState({ analysisLocked: true }, '', window.location.href);

    // 3) Chặn keyboard
    const blockKeyboard = (e: KeyboardEvent) => {
      // Cho phép phím trong modal xác nhận (vẫn nhận Enter/Esc bên trong)
      if (showExitConfirmRef.current) return;

      const key = e.key;
      const isCtrl = e.ctrlKey || e.metaKey;

      // Phím nguy hiểm
      const isReload = key === 'F5' || (isCtrl && (key === 'r' || key === 'R'));
      const isCloseTab = isCtrl && (key === 'w' || key === 'W');
      const isAltF4 = e.altKey && key === 'F4';
      const isBack = (e.altKey && (key === 'ArrowLeft' || key === 'ArrowRight')) || key === 'Backspace';
      const isEsc = key === 'Escape';
      const isTab = key === 'Tab';

      if (isReload || isCloseTab || isAltF4 || isBack) {
        e.preventDefault();
        e.stopPropagation();
        setShowExitConfirm(true);
        return;
      }

      if (isEsc) {
        e.preventDefault();
        e.stopPropagation();
        setShowExitConfirm(true);
        return;
      }

      if (isTab) {
        // Cho phép tab nhưng không cho ra ngoài overlay
        e.preventDefault();
        return;
      }

      // Các phím khác: chặn nhưng nháy toast nhẹ
      e.preventDefault();
      e.stopPropagation();
      triggerBlockedToast();
    };

    // 4) Chặn chuột phải, drag, paste, copy
    const blockContext = (e: Event) => {
      e.preventDefault();
      triggerBlockedToast();
    };

    // 5) Chặn wheel/touchmove (scroll bằng chuột/touch)
    const blockScroll = (e: Event) => {
      e.preventDefault();
    };

    // 6) Bắt back/forward
    const onPopState = () => {
      // Đẩy lại state để giữ trang
      window.history.pushState({ analysisLocked: true }, '', window.location.href);
      setShowExitConfirm(true);
    };

    // 7) Bắt refresh / close tab (browser native dialog)
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Một số trình duyệt hiện thông điệp chuẩn của browser
      e.returnValue = 'Bạn có thực sự muốn thoát? Kết quả sẽ không được lưu.';
      return e.returnValue;
    };

    window.addEventListener('keydown', blockKeyboard, { capture: true });
    window.addEventListener('contextmenu', blockContext, { capture: true });
    window.addEventListener('dragstart', blockContext, { capture: true });
    window.addEventListener('wheel', blockScroll, { passive: false, capture: true });
    window.addEventListener('touchmove', blockScroll, { passive: false, capture: true });
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      // Khôi phục body
      document.body.style.position = prevBodyStyle.position;
      document.body.style.top = prevBodyStyle.top;
      document.body.style.width = prevBodyStyle.width;
      document.body.style.overflow = prevBodyStyle.overflow;
      document.body.style.userSelect = prevBodyStyle.userSelect;
      window.scrollTo(0, scrollY);

      window.removeEventListener('keydown', blockKeyboard, { capture: true });
      window.removeEventListener('contextmenu', blockContext, { capture: true });
      window.removeEventListener('dragstart', blockContext, { capture: true });
      window.removeEventListener('wheel', blockScroll, { capture: true });
      window.removeEventListener('touchmove', blockScroll, { capture: true });
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);

      if (blockedToastTimer.current) {
        window.clearTimeout(blockedToastTimer.current);
        blockedToastTimer.current = null;
      }
    };
    // showExitConfirm cần nằm trong deps để re-bind handler
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Lớp khóa toàn màn hình */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-lock-title"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'not-allowed',
          padding: '1rem',
        }}
        onClick={(e) => {
          // Click ra vùng tối: hỏi xác nhận thoát
          if (e.target === e.currentTarget) {
            setShowExitConfirm(true);
          }
        }}
      >
        <div
          style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '20px',
            padding: '2.25rem 2rem',
            width: '100%',
            maxWidth: 520,
            boxShadow: '0 30px 80px rgba(2, 6, 23, 0.45)',
            border: '1px solid rgba(99, 102, 241, 0.18)',
            position: 'relative',
            cursor: 'default',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon AI */}
          <div
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 1.25rem',
              borderRadius: 20,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 30px rgba(99, 102, 241, 0.35)',
              animation: 'al-pulse 2.2s ease-in-out infinite',
            }}
          >
            <ShieldAlert size={32} color="#fff" />
          </div>

          <h2
            id="analysis-lock-title"
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              textAlign: 'center',
              margin: 0,
              marginBottom: '0.5rem',
              color: '#0f172a',
            }}
          >
            AI đang phân tích CV của bạn
          </h2>

          <p
            style={{
              textAlign: 'center',
              color: '#475569',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            Vui lòng giữ nguyên trang trong khi AI xử lý.
            <br />
            Quá trình phân tích có thể mất 30 - 60 giây.
          </p>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: 10,
              background: '#eef2f7',
              borderRadius: 999,
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 3px rgba(15, 23, 42, 0.08)',
              marginBottom: '0.6rem',
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
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ color: '#475569', fontWeight: 500 }}>
              {progressMessage || 'Đang khởi tạo...'}
            </span>
            <span style={{ color: '#6366f1', fontWeight: 700 }}>{progress}%</span>
          </div>

          {/* Cảnh báo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: 'rgba(245, 158, 11, 0.10)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 12,
              padding: '12px 14px',
              color: '#92400e',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Trong khi phân tích, mọi thao tác trên trang sẽ bị tạm khóa. Vui lòng không tải lại,
              đóng tab hoặc rời khỏi trang để tránh mất kết quả.
            </span>
          </div>

          <style>{`
            @keyframes al-pulse {
              0%, 100% { transform: scale(1); box-shadow: 0 12px 30px rgba(99, 102, 241, 0.35); }
              50% { transform: scale(1.06); box-shadow: 0 16px 38px rgba(168, 85, 247, 0.45); }
            }
            @keyframes al-toast-in {
              from { opacity: 0; transform: translate(-50%, -8px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>

        {/* Toast khi thao tác bị chặn */}
        {showBlockedToast && !showExitConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: 999,
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(2, 6, 23, 0.4)',
              zIndex: 100001,
              animation: 'al-toast-in 0.18s ease-out',
            }}
            role="status"
          >
            Thao tác bị tạm khóa khi AI đang phân tích
          </div>
        )}
      </div>

      {/* Modal xác nhận thoát */}
      {showExitConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="exit-confirm-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.55)',
            zIndex: 100002,
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
              background: '#fff',
              borderRadius: 16,
              maxWidth: 460,
              width: '100%',
              padding: '1.75rem 1.5rem 1.5rem',
              boxShadow: '0 30px 80px rgba(2, 6, 23, 0.45)',
              position: 'relative',
            }}
          >
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setShowExitConfirm(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 1rem',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={28} color="#dc2626" />
            </div>

            <h3
              id="exit-confirm-title"
              style={{
                margin: 0,
                marginBottom: 8,
                textAlign: 'center',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#0f172a',
              }}
            >
              Bạn có thực sự muốn thoát?
            </h3>
            <p
              style={{
                textAlign: 'center',
                color: '#475569',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                margin: 0,
                marginBottom: '1.25rem',
              }}
            >
              Quá trình phân tích đang diễn ra. Nếu thoát bây giờ, kết quả sẽ
              <strong style={{ color: '#dc2626' }}> không được lưu</strong> và bạn sẽ phải tải CV
              lên lại từ đầu.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                autoFocus
                onClick={() => setShowExitConfirm(false)}
                style={{
                  flex: '1 1 180px',
                  padding: '11px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 8px 22px rgba(99, 102, 241, 0.35)',
                }}
              >
                Tiếp tục phân tích
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  if (onConfirmExit) onConfirmExit();
                }}
                style={{
                  flex: '1 1 180px',
                  padding: '11px 16px',
                  borderRadius: 10,
                  border: '1.5px solid #ef4444',
                  background: '#fff',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                }}
              >
                Vẫn thoát, không lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnalysisLockOverlay;
