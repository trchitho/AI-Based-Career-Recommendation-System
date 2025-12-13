/**
    * Payment Page - Modern Geometric SaaS Design
    * Clean, Green Glow, Rounded Cards
    */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaymentButton } from '../components/payment/PaymentButton';
import { getPaymentHistory, pollPaymentStatus, queryPayment, Payment } from '../services/paymentService';
import MainLayout from '../components/layout/MainLayout';
import { getAccessToken } from '../utils/auth';
import { useSubscription } from '../hooks/useSubscription';
import PaidUserStatus from '../components/subscription/PaidUserStatus';
import EnterpriseUserStatus from '../components/subscription/EnterpriseUserStatus';

export const PaymentPage: React.FC = () => {
    // ==========================================
    // 1. LOGIC BLOCK
    // ==========================================
    const [searchParams] = useSearchParams();
    const [history, setHistory] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
    const isLoggedIn = !!getAccessToken();
    const { isPremium, subscriptionData } = useSubscription();

    // Payment status modal
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<{
        type: 'success' | 'failed' | 'pending';
        message: string;
    } | null>(null);

    useEffect(() => {
        const orderId = searchParams.get('order_id');
        const urlStatus = searchParams.get('status');

        if (orderId) {
            // Nếu URL có status từ ZaloPay, nhận diện ngay
            if (urlStatus) {
                const statusCode = parseInt(urlStatus);
                if (statusCode === -49) {
                    // Hủy giao dịch
                    setPaymentStatus({
                        type: 'failed',
                        message: 'Giao dịch đã bị hủy.',
                    });
                    setShowStatusModal(true);
                    loadHistory(false);
                    return;
                } else if (statusCode === 1) {
                    // Thành công (hiếm khi có trong URL)
                    setPaymentStatus({
                        type: 'success',
                        message: 'Thanh toán thành công!',
                    });
                    setShowStatusModal(true);
                    loadHistory(false);
                    setActiveTab('history');
                    return;
                }
            }

            // Nếu không có status trong URL, bắt đầu polling
            startPaymentPolling(orderId);
        }
    }, [searchParams]);

    useEffect(() => {
        if (isLoggedIn) {
            loadHistory(true); // Auto query pending orders lần đầu
        }
    }, [isLoggedIn]);

    const startPaymentPolling = async (orderId: string) => {
        try {
            const token = getAccessToken();
            if (!token) return;

            // Hiển thị trạng thái đang chờ
            setPaymentStatus({
                type: 'pending',
                message: 'Đang kiểm tra trạng thái thanh toán...',
            });
            setShowStatusModal(true);

            // Bắt đầu polling
            const result = await pollPaymentStatus(orderId);

            // Cập nhật kết quả
            if (result.status === 'success') {
                setPaymentStatus({
                    type: 'success',
                    message: 'Thanh toán thành công! Tài khoản của bạn đã được nâng cấp.',
                });
                loadHistory(false);
                setActiveTab('history');
            } else {
                // Tất cả các trường hợp khác (failed, cancelled, timeout) đều là failed
                const messages: Record<string, string> = {
                    'failed': 'Thanh toán thất bại. Vui lòng thử lại.',
                    'cancelled': 'Giao dịch đã bị hủy.',
                    'timeout': 'Không thể xác nhận thanh toán. Giao dịch có thể đã bị hủy.',
                };

                setPaymentStatus({
                    type: 'failed',
                    message: messages[result.status] || 'Thanh toán không thành công.',
                });
            }
        } catch (error) {
            console.error('Payment polling error:', error);
            setPaymentStatus({
                type: 'failed',
                message: 'Có lỗi xảy ra khi kiểm tra thanh toán.',
            });
        }
    };

    const loadHistory = async (autoQuery: boolean = false) => {
        try {
            setLoading(true);
            const token = getAccessToken();
            if (!token) return;

            const data = await getPaymentHistory(0, 20);
            setHistory(data);

            // Chỉ auto query 1 lần khi được yêu cầu
            if (autoQuery) {
                const pendingOrders = data.filter((p: Payment) => p.status === 'pending');
                if (pendingOrders.length > 0) {
                    console.log(`Found ${pendingOrders.length} pending orders, querying...`);

                    // Query tất cả pending orders
                    await Promise.all(
                        pendingOrders.map((payment: Payment) =>
                            queryPayment(payment.order_id).catch(err =>
                                console.error(`Failed to query ${payment.order_id}:`, err)
                            )
                        )
                    );

                    // Reload 1 lần cuối (không auto query nữa)
                    setTimeout(() => {
                        loadHistory(false);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Load history error:', error);
        } finally {
            setLoading(false);
        }
    };

    const plans = [
        {
            id: 'basic',
            name: 'Gói Cơ Bản',
            price: 99000,
            description: 'Phù hợp cho người mới bắt đầu',
            features: ['5 bài test/tháng', 'Xem 5 nghề nghiệp', 'Roadmap Level 1', 'Hỗ trợ email'],
            gradient: 'from-blue-500 to-cyan-500',
            glowColor: 'shadow-blue-500/50',
            popular: false,
        },
        {
            id: 'premium',
            name: 'Gói Premium',
            price: 299000,
            description: 'Phổ biến nhất - Không giới hạn',
            features: [
                'Không giới hạn bài test',
                'Xem tất cả nghề nghiệp',
                'Roadmap đầy đủ',
                'Phân tích AI chi tiết',
                'Hỗ trợ ưu tiên',
            ],
            gradient: 'from-green-500 to-emerald-500',
            glowColor: 'shadow-green-500/50',
            popular: true,
        },
        {
            id: 'enterprise',
            name: 'Gói Doanh Nghiệp',
            price: 999000,
            description: 'Giải pháp cho tổ chức',
            features: [
                'Tất cả tính năng Premium',
                'Quản lý nhiều người dùng',
                'API tích hợp',
                'Hỗ trợ 24/7',
                'Tùy chỉnh theo yêu cầu',
            ],
            gradient: 'from-purple-500 to-pink-500',
            glowColor: 'shadow-purple-500/50',
            popular: false,
        },
    ];

    // Filter plans based on user's current subscription
    const getAvailablePlans = () => {
        if (!isPremium) {
            return plans; // Show all plans for non-premium users
        }
        
        const currentPlan = subscriptionData?.subscription?.plan_name?.toLowerCase() || '';
        
        // For premium users, only show higher tier plans
        if (currentPlan.includes('enterprise') || currentPlan.includes('doanh nghiệp')) {
            return []; // Already has highest plan
        }
        
        if (currentPlan.includes('premium') || currentPlan.includes('pro')) {
            return plans.filter(plan => plan.id === 'enterprise'); // Only show Enterprise
        }
        
        if (currentPlan.includes('basic') || currentPlan.includes('cơ bản')) {
            return plans.filter(plan => plan.id !== 'basic'); // Show Premium and Enterprise
        }
        
        return plans.filter(plan => plan.id === 'enterprise'); // Default to Enterprise only
    };

    const availablePlans = getAvailablePlans();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN');
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
            success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
            failed: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
            cancelled: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
        };

        const labels = {
            pending: 'Đang xử lý',
            success: 'Thành công',
            failed: 'Thất bại',
            cancelled: 'Đã hủy',
        };

        return (
            <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${badges[status as keyof typeof badges] || badges.pending}`}
            >
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    // ==========================================
    // 2. NEW DESIGN UI
    // ==========================================
    
    // Check if user wants to view all plans
    const viewAll = searchParams.get('view') === 'all';
    
    // Check if user is Enterprise
    const isEnterprise = subscriptionData?.subscription?.plan_name?.toLowerCase().includes('enterprise') || 
                        subscriptionData?.subscription?.plan_name?.toLowerCase().includes('doanh nghiệp');
    
    // If user is Enterprise and doesn't want to view all plans, show Enterprise status
    if (isPremium && isEnterprise && !viewAll) {
        return <EnterpriseUserStatus />;
    }
    
    // If user is premium (but not Enterprise) and doesn't want to view all plans, show paid status
    if (isPremium && !viewAll) {
        return <PaidUserStatus />;
    }
    
    return (
        <MainLayout>
            <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-x-hidden pb-20">

                {/* CSS Injection */}
                <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
            .bg-dot-pattern {
               background-image: radial-gradient(#E5E7EB 1px, transparent 1px);
               background-size: 24px 24px;
            }
            .dark .bg-dot-pattern {
               background-image: radial-gradient(#374151 1px, transparent 1px);
            }
            @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
            .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
         `}</style>

                {/* Background Layers */}
                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-40"></div>
                <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
                <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

                    {/* --- PREMIUM USER BANNER --- */}
                    {isPremium && viewAll && (
                        <div className="mb-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Bạn đã là thành viên {subscriptionData?.subscription?.plan_name || 'Premium'}!</h3>
                                        <p className="text-green-100">Xem các gói nâng cấp bên dưới hoặc quay lại trang trạng thái</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.location.href = '/pricing'}
                                    className="px-6 py-3 bg-white text-green-600 font-bold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                                >
                                    Xem trạng thái
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- HEADER & TABS --- */}
                    <div className="text-center mb-16 animate-fade-in-up">
                        <span className="inline-block py-1.5 px-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-6 border border-green-200 dark:border-green-800">
                            {isPremium ? 'Upgrade Options' : 'Premium Access'}
                        </span>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
                            {isPremium ? 'Nâng cấp' : 'Choose Your'} <span className="text-green-600 dark:text-green-500">{isPremium ? 'Gói Cao Hơn' : 'Upgrade'}</span>
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
                            {isPremium 
                                ? 'Khám phá các gói cao cấp hơn để mở rộng quy mô và tính năng.'
                                : 'Unlock full potential with our premium career guidance features.'
                            }
                        </p>

                        {/* Tabs Navigation */}
                        {isLoggedIn && (
                            <div className="inline-flex bg-white dark:bg-gray-800 p-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
                                <button
                                    onClick={() => setActiveTab('plans')}
                                    className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all ${activeTab === 'plans'
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Chọn gói
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'history'
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Lịch sử giao dịch
                                    {history.length > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'history' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            {history.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- CONTENT AREA --- */}
                    <div className="animate-fade-in-up">

                        {/* TAB: PLANS */}
                        {activeTab === 'plans' && (
                            <>
                                {availablePlans.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                            Bạn đã có gói cao nhất!
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                                            Bạn đang sử dụng gói {subscriptionData?.subscription?.plan_name || 'Enterprise'} - gói cao nhất của chúng tôi với đầy đủ tính năng.
                                        </p>
                                        <button
                                            onClick={() => window.location.href = '/pricing'}
                                            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg"
                                        >
                                            Quay lại trang trạng thái
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`grid gap-8 ${availablePlans.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : availablePlans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
                                        {availablePlans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={`relative bg-white dark:bg-gray-800 rounded-[32px] p-8 shadow-xl border transition-all duration-300 flex flex-col
                              ${plan.popular
                                                ? 'border-green-500 dark:border-green-500 ring-4 ring-green-500/10 scale-105 z-10'
                                                : 'border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 hover:-translate-y-1'
                                            }`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                                <span className="bg-green-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg shadow-green-600/30 uppercase tracking-wider">
                                                    Most Popular
                                                </span>
                                            </div>
                                        )}

                                        <div className="mb-6">
                                            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{plan.description}</p>
                                        </div>

                                        <div className="mb-8">
                                            <div className="flex items-baseline">
                                                <span className={`text-4xl font-extrabold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                                    {formatCurrency(plan.price).replace(' ₫', '')}
                                                </span>
                                                <span className="text-gray-400 text-lg font-bold ml-1">đ</span>
                                            </div>
                                            <p className="text-xs text-gray-400 font-semibold mt-1">thanh toán một lần</p>
                                        </div>

                                        <ul className="space-y-4 mb-8 flex-grow">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start text-sm font-medium text-gray-600 dark:text-gray-300">
                                                    <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r ${plan.gradient} flex items-center justify-center text-white mr-3 mt-0.5`}>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-auto">
                                            <PaymentButton
                                                amount={plan.price}
                                                description={`Thanh toán ${plan.name}`}
                                                onSuccess={(orderId) => {
                                                    console.log('Payment initiated', plan.name, orderId);
                                                    // Tự động bắt đầu polling
                                                    if (orderId) {
                                                        startPaymentPolling(orderId);
                                                    }
                                                }}
                                                className={`w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${plan.gradient} hover:shadow-lg hover:shadow-green-500/20 transition-all transform hover:scale-[1.02] active:scale-95`}
                                            >
                                                Chọn Gói Này
                                            </PaymentButton>
                                        </div>
                                    </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* TAB: HISTORY */}
                        {activeTab === 'history' && (
                            <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Transaction History</h3>
                                    <button onClick={() => loadHistory(true)} className="text-sm font-bold text-green-600 hover:text-green-700 flex items-center gap-1">
                                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Refresh
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="py-20 text-center">
                                        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-gray-500 font-medium">Loading transactions...</p>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="py-20 text-center">
                                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-dashed border-gray-200 dark:border-gray-700">
                                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No transactions found</h4>
                                        <p className="text-gray-500 mb-6">You haven't made any purchases yet.</p>
                                        <button
                                            onClick={() => setActiveTab('plans')}
                                            className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-sm hover:opacity-90 transition-all"
                                        >
                                            Browse Plans
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                                                    <th className="px-6 py-4">Order ID</th>
                                                    <th className="px-6 py-4">Description</th>
                                                    <th className="px-6 py-4">Amount</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {history.map((payment) => (
                                                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors text-sm font-medium">
                                                        <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">#{payment.order_id.slice(-8)}</td>
                                                        <td className="px-6 py-4 text-gray-900 dark:text-white">{payment.description}</td>
                                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-bold">{formatCurrency(payment.amount)}</td>
                                                        <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(payment.created_at)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- FAQ & CTA --- */}
                    {activeTab === 'plans' && (
                        <div className="mt-24 animate-fade-in-up">
                            <div className="max-w-3xl mx-auto mb-24">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">
                                    Frequently Asked Questions
                                </h2>
                                <div className="grid gap-4">
                                    {[
                                        { q: 'Can I change my plan later?', a: 'Yes, you can upgrade or downgrade your plan at any time.' },
                                        { q: 'Is there a free trial?', a: 'Yes! All paid plans come with a 14-day free trial.' },
                                        { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, PayPal, and bank transfers.' },
                                        { q: 'Can I cancel anytime?', a: 'Absolutely! You can cancel your subscription at any time.' },
                                    ].map((faq, idx) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                                                <span className="text-green-500 text-xl">?</span> {faq.q}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 ml-7">{faq.a}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="max-w-5xl mx-auto bg-gray-900 dark:bg-gray-800 rounded-[48px] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px]"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
                                <div className="relative z-10">
                                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Still have questions?</h2>
                                    <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto font-medium">Our team is here to help you choose the right plan for your career needs.</p>
                                    <button className="px-10 py-4 bg-white text-gray-900 rounded-full font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:scale-105">
                                        Contact Sales
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Payment Status Modal */}
                {showStatusModal && paymentStatus && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 animate-fade-in-up">
                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                                {paymentStatus.type === 'success' && (
                                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                                {paymentStatus.type === 'failed' && (
                                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                )}
                                {paymentStatus.type === 'pending' && (
                                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            {/* Title */}
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
                                {paymentStatus.type === 'success' && 'Thanh toán thành công!'}
                                {paymentStatus.type === 'failed' && 'Thanh toán thất bại'}
                                {paymentStatus.type === 'pending' && 'Đang xử lý...'}
                            </h3>

                            {/* Message */}
                            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                                {paymentStatus.message}
                            </p>

                            {/* Actions */}
                            {paymentStatus.type !== 'pending' && (
                                <div className="flex gap-3">
                                    {paymentStatus.type === 'success' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setShowStatusModal(false);
                                                    setActiveTab('history');
                                                }}
                                                className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all"
                                            >
                                                Xem lịch sử
                                            </button>
                                            <button
                                                onClick={() => setShowStatusModal(false)}
                                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                            >
                                                Đóng
                                            </button>
                                        </>
                                    )}
                                    {paymentStatus.type === 'failed' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setShowStatusModal(false);
                                                    setActiveTab('plans');
                                                }}
                                                className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:opacity-90 transition-all"
                                            >
                                                Thử lại
                                            </button>
                                            <button
                                                onClick={() => setShowStatusModal(false)}
                                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                            >
                                                Đóng
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};