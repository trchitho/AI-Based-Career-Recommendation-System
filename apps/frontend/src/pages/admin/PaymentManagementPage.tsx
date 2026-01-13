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

const PaymentManagementPage = () => {
  const [paymentsData, setPaymentsData] = useState<PaymentsResponse | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState<Payment | null>(null);
  const [showUserHistory, setShowUserHistory] = useState<number | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadPayments = useCallback(async (searchQuery?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const query = searchQuery !== undefined ? searchQuery : searchTerm;
      if (query) params.append('search', query);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (paymentMethodFilter) params.append('payment_method', paymentMethodFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (selectedUserId) params.append('user_id', selectedUserId.toString());

      const response = await api.get(`/api/payment/admin/payments?${params}`);
      setPaymentsData(response.data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, sortBy, sortOrder, statusFilter, paymentMethodFilter, dateFrom, dateTo, searchTerm, selectedUserId]);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get('/api/payment/admin/payments/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading payment stats:', error);
    }
  }, []);

  useEffect(() => {
    loadPayments();
    loadStats();
  }, [loadPayments, loadStats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadPayments(searchTerm);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/api/payment/admin/payments/users/search?q=${encodeURIComponent(query)}`);
      setUserSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
      setUserSearchResults([]);
    }
  };

  const handleUserFilterChange = (value: string) => {
    setUserFilter(value);
    if (value) {
      searchUsers(value);
      setShowUserSearch(true);
    } else {
      setShowUserSearch(false);
      setSelectedUserId(null);
    }
  };

  const selectUser = (user: any) => {
    setSelectedUserId(user.id);
    setUserFilter(`${user.full_name || user.email} (ID: ${user.id})`);
    setShowUserSearch(false);
    setCurrentPage(1);
  };

  const clearUserFilter = () => {
    setUserFilter('');
    setSelectedUserId(null);
    setShowUserSearch(false);
    setCurrentPage(1);
  };

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);

      if (statusFilter) params.append('status_filter', statusFilter);
      if (paymentMethodFilter) params.append('payment_method', paymentMethodFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (selectedUserId) params.append('user_id', selectedUserId.toString());

      const response = await api.get(`/api/payment/admin/payments/export?${params}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payments_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US');
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
      case 'success': return 'Success';
      case 'pending': return 'Processing';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></span>
            Payment Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-5">
            Manage all payment transactions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportData('csv')}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-green-500/30 transition-all hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => exportData('json')}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export JSON
          </button>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="relative group bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"></div>
            <div className="relative z-10 flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_payments}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatAmount(stats.total_amount)}</p>
              </div>
            </div>
          </div>

          <div className="relative group bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-t-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"></div>
            <div className="relative z-10 flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Successful</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed_payments}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatAmount(stats.completed_amount)}</p>
              </div>
            </div>
          </div>

          <div className="relative group bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-t-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-yellow-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"></div>
            <div className="relative z-10 flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending_payments}</p>
              </div>
            </div>
          </div>

          <div className="relative group bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"></div>
            <div className="relative z-10 flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.today_payments}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatAmount(stats.today_amount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS & SEARCH */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 p-6 shadow-lg">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Row 1: Search and User Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                General Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Email, Order ID, Transaction ID, username..."
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by User
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userFilter}
                  onChange={(e) => handleUserFilterChange(e.target.value)}
                  placeholder="Search user by email or name..."
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
                {selectedUserId && (
                  <button
                    type="button"
                    onClick={clearUserFilter}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* User Search Results */}
              {showUserSearch && userSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.full_name || user.email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email} (ID: {user.id})
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="pending">Processing</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Method
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              >
                <option value="">All</option>
                <option value="zalopay">ZaloPay</option>
                <option value="vnpay">VNPay</option>
                <option value="momo">MoMo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
          </div>

          {/* Row 3: Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPaymentMethodFilter('');
                  setDateFrom('');
                  setDateTo('');
                  clearUserFilter();
                  setCurrentPage(1);
                }}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-semibold border-2 border-gray-200 dark:border-gray-600 transition-colors"
              >
                Clear Filters
              </button>
            </div>

            {selectedUserId && (
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Filtering by user ID: {selectedUserId}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* STATS INFO */}
      {paymentsData && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 p-4 shadow-lg">
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, paymentsData.total)} of {paymentsData.total} payments
            </span>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-medium">
              Page {currentPage} / {paymentsData.total_pages}
            </span>
          </div>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('order_id')}
                >
                  <div className="flex items-center gap-1">
                    Order ID
                    {sortBy === 'order_id' && (
                      <span className="text-blue-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    Amount
                    {sortBy === 'amount' && (
                      <span className="text-blue-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Created At
                    {sortBy === 'created_at' && (
                      <span className="text-blue-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
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

                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowDetail(payment)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-colors"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setShowUserHistory(payment.user_id)}
                        className="px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg text-xs font-semibold border border-green-200 dark:border-green-800 transition-colors"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paymentsData?.items.length === 0 && (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              No payments found
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

      {/* DETAIL MODAL */}
      {showDetail && (
        <PaymentDetailModal
          payment={showDetail}
          onClose={() => setShowDetail(null)}
          onUpdate={() => {
            setShowDetail(null);
            loadPayments();
          }}
        />
      )}

      {/* USER HISTORY MODAL */}
      {showUserHistory && (
        <UserPaymentHistoryModal
          userId={showUserHistory}
          onClose={() => setShowUserHistory(null)}
        />
      )}
    </div>
  );
};

interface PaymentDetailModalProps {
  payment: Payment;
  onClose: () => void;
  onUpdate: () => void;
}

const PaymentDetailModal = ({ payment, onClose }: PaymentDetailModalProps) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Chi tiết thanh toán
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order ID</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{payment.order_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Số tiền</label>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{formatAmount(payment.amount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email người dùng</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{payment.user_email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tên người dùng</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{payment.user_name || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phương thức thanh toán</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{payment.payment_method}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{payment.status}</p>
            </div>
          </div>

          {payment.transaction_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transaction ID</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{payment.transaction_id}</p>
            </div>
          )}

          {payment.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mô tả</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{payment.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ngày tạo</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(payment.created_at)}</p>
            </div>
            {payment.updated_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cập nhật lần cuối</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(payment.updated_at)}</p>
              </div>
            )}
          </div>

          {payment.gateway_response && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gateway Response</label>
              <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-auto max-h-40">
                {JSON.stringify(payment.gateway_response, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

interface UserPaymentHistoryModalProps {
  userId: number;
  onClose: () => void;
}

const UserPaymentHistoryModal = ({ userId, onClose }: UserPaymentHistoryModalProps) => {
  const [userPayments, setUserPayments] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);

  const loadUserPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '10',
      });

      if (statusFilter) params.append('status_filter', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await api.get(`/api/payment/admin/payments/user/${userId}?${params}`);
      setUserPayments(response.data);

      // Lấy thông tin user từ payment đầu tiên
      if (response.data.items.length > 0) {
        const firstPayment = response.data.items[0];
        setUserInfo({
          id: firstPayment.user_id,
          email: firstPayment.user_email,
          name: firstPayment.user_name
        });
      }
    } catch (error) {
      console.error('Error loading user payments:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, currentPage, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadUserPayments();
  }, [loadUserPayments]);

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

  // Tính toán thống kê
  const stats = userPayments ? {
    total: userPayments.total,
    totalAmount: userPayments.items.reduce((sum, p) => sum + p.amount, 0),
    successCount: userPayments.items.filter(p => p.status === 'success').length,
    successAmount: userPayments.items.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0),
  } : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Lịch sử thanh toán
            </h2>
            {userInfo && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {userInfo.name} ({userInfo.email}) - ID: {userInfo.id}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-sm text-blue-600 dark:text-blue-400">Tổng giao dịch</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-sm text-green-600 dark:text-green-400">Thành công</div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.successCount}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-sm text-purple-600 dark:text-purple-400">Tổng tiền</div>
                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">{formatAmount(stats.totalAmount)}</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="text-sm text-orange-600 dark:text-orange-400">Paid</div>
                <div className="text-lg font-bold text-orange-900 dark:text-orange-100">{formatAmount(stats.successAmount)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tất cả</option>
                <option value="success">Thành công</option>
                <option value="pending">Đang xử lý</option>
                <option value="failed">Thất bại</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Đang tải...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Số tiền
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Phương thức
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {userPayments?.items.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {payment.order_id}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(payment.amount)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {getPaymentMethodText(payment.payment_method)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {getStatusText(payment.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-300">
                        {formatDate(payment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {userPayments?.items.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Không tìm thấy giao dịch nào
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {userPayments && userPayments.total > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Hiển thị {((currentPage - 1) * 10) + 1} đến {Math.min(currentPage * 10, userPayments.total)} của {userPayments.total} giao dịch
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                  {currentPage} / {userPayments.total_pages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(userPayments.total_pages, currentPage + 1))}
                  disabled={currentPage === userPayments.total_pages}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentManagementPage;