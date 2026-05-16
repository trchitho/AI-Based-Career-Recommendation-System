import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary chống trang trắng khi component crash trong runtime.
 * Hiển thị error UI thân thiện thay vì màn hình trắng.
 */
class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[PageErrorBoundary] Caught error:', error);
    console.error('[PageErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/learning-path';
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Đã xảy ra lỗi không mong muốn';
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: '#f8fafc',
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              background: '#ffffff',
              borderRadius: 20,
              padding: '2.5rem 2rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              border: '1px solid #fee2e2',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                margin: '0 auto 1.25rem',
                borderRadius: 18,
                background: 'linear-gradient(135deg, #fca5a5, #f87171)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.25)',
              }}
            >
              <AlertTriangle size={36} color="#fff" />
            </div>

            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              {this.props.fallbackTitle || 'Đã xảy ra lỗi khi hiển thị trang'}
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 20 }}>
              Hệ thống gặp sự cố khi render giao diện. Đừng lo, dữ liệu của bạn vẫn an toàn.
              Hãy thử tải lại trang hoặc quay về trang chính.
            </p>

            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 20,
                textAlign: 'left',
                fontSize: '0.78rem',
                color: '#991b1b',
                fontFamily: 'monospace',
                maxHeight: 120,
                overflow: 'auto',
              }}
            >
              <strong>Chi tiết kỹ thuật:</strong>
              <br />
              {errorMessage}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                <RefreshCw size={15} /> Tải lại trang
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#475569',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                <Home size={15} /> Về trang Lộ trình
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
