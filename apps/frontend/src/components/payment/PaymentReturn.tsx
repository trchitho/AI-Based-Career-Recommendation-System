import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';

const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'cancelled'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Get order ID from URL params or localStorage
        const orderIdFromUrl = searchParams.get('order_id');
        const orderIdFromStorage = localStorage.getItem('pending_payment_order');
        const orderId = orderIdFromUrl || orderIdFromStorage;

        if (!orderId) {
          setStatus('failed');
          setMessage('Không tìm thấy thông tin đơn hàng');
          return;
        }

        // Poll payment status
        const result = await paymentService.pollPaymentStatus(orderId, 10, 3000);
        
        if (result.success && result.payment.status === 'success') {
          setStatus('success');
          setMessage('Thanh toán thành công! Tài khoản của bạn đã được nâng cấp.');
          
          // Trigger subscription refresh
          paymentService.triggerSubscriptionRefresh();
          
          // Clean up
          localStorage.removeItem('pending_payment_order');
          
          // Redirect after 3 seconds
          setTimeout(() => {
            navigate('/roadmap?payment=success');
          }, 3000);
          
        } else if (result.payment.status === 'cancelled') {
          setStatus('cancelled');
          setMessage('Thanh toán đã bị hủy');
        } else {
          setStatus('failed');
          setMessage('Thanh toán thất bại');
        }
        
      } catch (error: any) {
        console.error('Error checking payment status:', error);
        setStatus('failed');
        setMessage('Không thể kiểm tra trạng thái thanh toán');
      }
    };

    checkPaymentStatus();
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        );
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'cancelled':
        return (
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-yellow-600';
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'checking':
        return 'Đang kiểm tra thanh toán...';
      case 'success':
        return 'Thanh toán thành công!';
      case 'failed':
        return 'Thanh toán thất bại';
      case 'cancelled':
        return 'Thanh toán đã hủy';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>
        
        <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {getStatusTitle()}
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {message}
        </p>
        
        <div className="space-y-3">
          {status === 'success' && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Đang chuyển hướng về trang chính...
            </div>
          )}
          
          {(status === 'failed' || status === 'cancelled') && (
            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing')}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Thử lại thanh toán
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Về trang chủ
              </button>
            </div>
          )}
          
          {status === 'checking' && (
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Về trang chủ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentReturn;