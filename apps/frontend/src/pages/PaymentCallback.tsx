import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');

  useEffect(() => {
    // Check VNPay response
    const vnpResponseCode = searchParams.get('vnp_ResponseCode');
    if (vnpResponseCode) {
      if (vnpResponseCode === '00') {
        setStatus('success');
      } else {
        setStatus('failed');
      }
      return;
    }

    // Check Momo response
    const momoResultCode = searchParams.get('resultCode');
    if (momoResultCode) {
      if (momoResultCode === '0') {
        setStatus('success');
      } else {
        setStatus('failed');
      }
      return;
    }

    // If no params, assume failed
    setStatus('failed');
  }, [searchParams]);

  const handleContinue = () => {
    if (status === 'success') {
      navigate('/dashboard');
    } else {
      navigate('/pricing');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
        {status === 'processing' && (
          <>
            <Loader2 size={64} className="text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Đang xử lý thanh toán</h2>
            <p className="text-gray-600">Vui lòng đợi trong giây lát...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h2>
            <p className="text-gray-600 mb-6">
              Tài khoản của bạn đã được nâng cấp. Bạn có thể sử dụng tất cả các tính năng premium.
            </p>
            <button
              onClick={handleContinue}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors w-full"
            >
              Tiếp tục
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle size={64} className="text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thất bại</h2>
            <p className="text-gray-600 mb-6">
              Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
            </p>
            <button
              onClick={handleContinue}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full"
            >
              Thử lại
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
