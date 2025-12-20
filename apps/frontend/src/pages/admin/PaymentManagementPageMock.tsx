import { useEffect, useState, useCallback } from 'react';
import Pagination from '../../components/common/Pagination';
import api from '../../lib/api';

interface Payment {
  id: number;
  user_id: number;
  user_email?: string;
  user_name?: string;
  order_id: string;
  amount: number;
  description?: string;
  payment_method: string;
  status: string;
  transaction_id?: string;
  gateway_order_id?: string;
  gateway_response?: any;
  created_at: string;
  updated_at?: string;
}

interface PaymentStats {
  total_payments: number;
  total_amount: number;
  completed_payments: number;
  completed_amount: number;
  pending_payments: number;
  failed_payments: number;
  refunded_payments: number;
  today_payments: number;
  today_amount: number;
}

interface PaymentsResponse {
  items: Payment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const PaymentManagementPageMock = () => {
  const [paymentsData, setPaymentsData] = useState<PaymentsResponse | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
      });
      
      const response = await api.get(`/api/payment/admin/mock-payments?${params}`);
      setPaymentsData(response.data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage]);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get('/api/payment/admin/mock-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading payment stats:', error);
    }
  }, []);

  useEffect(() => {
    loadPayments();
    loadStats();
  }, [loadPayments, loadStats]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Thành công';
      case 'pending': return 'Đang xử lý';
      case 'failed': return 'Thất bại';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'zalopay': return 'ZaloPay';
      case 'vnpay': return 'VNPay';
      case 'momo': return 'MoMo';
      default: return method;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Quản lý lịch sử thanh toán (Mock Data)
        </h1>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng thanh toán</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total_payments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatAmount(stats.total_amount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Thành công</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.completed_payments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatAmount(stats.completed_amount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Đang xử lý</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pending_payments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hôm nay</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.today_payments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatAmount(stats.today_amount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Đang tải...
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Phương thức
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ngày tạo
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paymentsData?.items.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.order_id}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {payment.id}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.user_email}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {payment.user_name || `User #${payment.user_id}`}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {formatAmount(payment.amount)}
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {getPaymentMethodText(payment.payment_method)}
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {getStatusText(payment.status)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                    {formatDate(payment.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paymentsData?.items.length === 0 && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              Không tìm thấy thanh toán nào
            </div>
          )}
        </div>
      )}

      {/* PAGINATION */}
      {paymentsData && paymentsData.total > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={paymentsData.total_pages}
          totalItems={paymentsData.total}
          itemsPerPage={perPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handlePerPageChange}
        />
      )}
    </div>
  );
};

export default PaymentManagementPageMock;