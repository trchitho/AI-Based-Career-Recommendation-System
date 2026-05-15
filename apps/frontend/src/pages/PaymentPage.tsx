/**
 * Payment Page - With Multiple Payment Methods
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPaymentHistory, PaymentHistory } from '../services/paymentService';
import MainLayout from '../components/layout/MainLayout';
import { getAccessToken } from '../utils/auth';
import SubscriptionExpiryCard from '../components/subscription/SubscriptionExpiryCard';
import SubscriptionRefresh from '../components/subscription/SubscriptionRefresh';
import PaymentMethodSelector from '../components/payment/PaymentMethodSelector';

interface Plan {
    id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
    gradient: string;
    popular?: boolean;
}

export const PaymentPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
    const isLoggedIn = !!getAccessToken();
    const [userPlan, setUserPlan] = useState<string>('Free');
    const [planLoading, setPlanLoading] = useState<boolean>(true);

    const plans: Plan[] = [
        {
            id: 'basic',
            name: 'Gói Cơ Bản',
            price: 99000,
            description: 'Dành cho người mới muốn khám phá',
            features: [
                'Tối đa 20 bài đánh giá mỗi tháng',
                'Xem top 5 nghề phù hợp',
                'Lộ trình học tập cơ bản (Cấp 1-2)',
                'Tóm tắt phân tích RIASEC & Big Five'
            ],
            gradient: 'from-blue-500 to-cyan-500',
        },
        {
            id: 'premium',
            name: 'Gói Nâng Cao',
            price: 199000,
            description: 'Phổ biến nhất - Định hướng nghề nghiệp rõ ràng',
            features: [
                'Đánh giá không giới hạn',
                'Xem tất cả danh mục nghề nghiệp',
                'Lộ trình học tập đầy đủ',
                'Phân tích chi tiết Kiến thức, Kỹ năng và Năng lực'
            ],
            gradient: 'from-indigo-700 to-indigo-700',
            popular: true,
        },
        {
            id: 'pro',
            name: 'Gói Chuyên Nghiệp',
            price: 299000,
            description: 'Cố vấn nghề nghiệp số của bạn',
            features: [
                'Tất cả tính năng Nâng Cao',
                'Trợ lý AI 24/7',
                'Xuất báo cáo PDF chi tiết',
                'So sánh lịch sử tiến trình',
                'Đầy đủ thông tin liên quan nghề nghiệp'
            ],
            gradient: 'from-purple-500 to-pink-500',
        },
    ];

    const getAvailablePlans = () => {
        if (userPlan === 'Free') return plans;
        if (userPlan === 'Basic') return plans.filter(plan => plan.id !== 'basic');
        if (userPlan === 'Premium') return plans.filter(plan => plan.id === 'pro');
        if (userPlan === 'Pro') return [];
        return plans;
    };

    const availablePlans = getAvailablePlans();

    // Xử lý status từ URL (sau khi redirect từ VNPay)
    useEffect(() => {
        const status = searchParams.get('status');
        if (status) {
            if (status === 'cancelled') {
                setNotification({ type: 'warning', message: 'Bạn đã hủy giao dịch. Vui lòng thử lại khi sẵn sàng.' });
            } else if (status === 'failed') {
                setNotification({ type: 'error', message: 'Thanh toán thất bại. Vui lòng thử lại hoặc chọn phương thức khác.' });
            } else if (status === 'error') {
                setNotification({ type: 'error', message: 'Có lỗi xảy ra. Vui lòng thử lại sau.' });
            }
            // Xóa params khỏi URL
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (isLoggedIn) {
            loadHistory();
            detectUserPlan();
        } else {
            setPlanLoading(false);
        }
    }, [isLoggedIn]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await getPaymentHistory();
            setHistory(data);
        } catch (error) {
            console.error('Load history error:', error);
        } finally {
            setLoading(false);
        }
    };

    const detectUserPlan = async () => {
        try {
            const token = getAccessToken();
            if (!token) { setPlanLoading(false); return; }

            try {
                const response = await fetch('/api/subscription/subscription', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.plan_name && data.plan_name !== 'Free') {
                        setUserPlan(data.plan_name);
                        setPlanLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.log('Subscription API not available');
            }

            const payments = await getPaymentHistory();
            const successfulPayments = payments.filter((p) => p.status?.toLowerCase() === 'success');
            if (successfulPayments.length > 0) {
                const latestPayment = successfulPayments[0];
                if (latestPayment && latestPayment.amount >= 280000) setUserPlan('Pro');
                else if (latestPayment && latestPayment.amount >= 180000) setUserPlan('Premium');
                else if (latestPayment && latestPayment.amount >= 80000) setUserPlan('Basic');
            }
        } catch (error) {
            console.error('Failed to detect user plan:', error);
        } finally {
            setPlanLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN');
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            success: 'bg-indigo-50 text-indigo-950',
            failed: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800',
        };
        const labels: Record<string, string> = {
            pending: 'Pending',
            success: 'Success',
            failed: 'Failed',
            cancelled: 'Cancelled',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${badges[status] || badges['pending']}`}>
                {labels[status] || status}
            </span>
        );
    };

    const handleSelectPlan = (plan: Plan) => {
        if (!isLoggedIn) {
            alert('Vui lòng đăng nhập để thanh toán');
            window.location.href = '/login';
            return;
        }
        setSelectedPlan(plan);
        setShowPaymentModal(true);
    };

    return (
        <MainLayout>
            <SubscriptionRefresh />
            <div className="min-h-[calc(100vh-64px)] bg-surface-primary dark:bg-gray-900 py-16 relative overflow-hidden font-['Plus_Jakarta_Sans']">
                
                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-60" />
                <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-400/5 rounded-full blur-[120px] pointer-events-none z-0" />
                <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/5 rounded-full blur-[120px] pointer-events-none z-0" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Notification Banner */}
                    {notification && (
                        <div className={`mb-8 p-4 rounded-xl flex items-center justify-between ${
                            notification.type === 'success' ? 'bg-indigo-50 text-indigo-950 border border-indigo-200' :
                            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                            <div className="flex items-center gap-3">
                                <span className="text-xl">
                                    {notification.type === 'success' ? '' : notification.type === 'warning' ? '' : ''}
                                </span>
                                <span className="font-medium">{notification.message}</span>
                            </div>
                            <button 
                                onClick={() => setNotification(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                
                            </button>
                        </div>
                    )}

                    {/* Header */}
                    <div className="text-center mb-16 relative z-10">
                        <h1 className="text-4xl md:text-5xl font-extrabold premium-gradient mb-6 inline-block tracking-tight">
                            Chọn Gói Dịch Vụ
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Khai phá tiềm năng nghề nghiệp với các tính năng cao cấp
                        </p>

                        {!planLoading && userPlan !== 'Free' && (
                            <div className="mt-8 max-w-2xl mx-auto">
                                <SubscriptionExpiryCard />
                            </div>
                        )}

                        {!planLoading && userPlan === 'Free' && (
                            <div className="mt-8 max-w-md mx-auto">
                                <div className="glass rounded-[24px] p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-all duration-300">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="text-lg font-bold text-gray-500">Free</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Gói Miễn Phí (Hiện tại)</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Miễn phí - Mặc định cho tất cả người dùng</p>
                                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                <span>5 bài đánh giá mỗi tháng</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                <span>Chỉ xem nghề đầu tiên</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    {isLoggedIn && (
                        <div className="flex justify-center mb-8 relative z-10">
                            <div className="glass p-1.5 rounded-2xl border border-white/20 shadow-md flex gap-1">
                                <button
                                    onClick={() => setActiveTab('plans')}
                                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'plans' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                >
                                    Choose Plan
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                >
                                    Lịch Sử Giao Dịch
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Plans */}
                    {activeTab === 'plans' && (
                        <>
                            {planLoading ? (
                                <div className="grid gap-8 max-w-6xl mx-auto grid-cols-1 md:grid-cols-3 relative z-10">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="glass rounded-[32px] p-8 animate-pulse">
                                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 w-3/4"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8 w-full"></div>
                                            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8 w-1/2"></div>
                                            <div className="space-y-3 mb-8">
                                                {[1,2,3,4].map((j) => <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>)}
                                            </div>
                                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : availablePlans.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10 text-indigo-800" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Bạn đang dùng gói cao nhất!</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-8">Bạn đang sử dụng gói {userPlan}.</p>
                                    <button onClick={() => window.location.href = '/dashboard'} className="px-8 py-3 bg-indigo-800 hover:bg-indigo-900 text-white font-bold rounded-xl">
                                        Về Trang Chủ
                                    </button>
                                </div>
                            ) : (
                                <div className={`grid gap-8 max-w-6xl mx-auto relative z-10 ${availablePlans.length === 1 ? 'grid-cols-1 max-w-md' : availablePlans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl' : 'grid-cols-1 md:grid-cols-3'}`}>
                                    {availablePlans.map((plan) => (
                                        <div
                                            key={plan.id}
                                            className={`relative glass rounded-[32px] p-8 shadow-xl transition-all duration-300 ${plan.popular ? 'border-2 border-indigo-400/50 shadow-indigo-500/20 md:-translate-y-4 md:scale-105' : 'border border-white/20 hover:shadow-2xl hover:-translate-y-2'}`}
                                        >
                                            {plan.popular && (
                                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                                    <span className="bg-indigo-800 text-white px-4 py-1 rounded-full text-xs font-bold">Phổ Biến Nhất</span>
                                                </div>
                                            )}

                                            <div className="mb-6">
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">{plan.description}</p>
                                            </div>

                                            <div className="mb-8">
                                                <div className="flex items-baseline">
                                                    <span className={`text-4xl font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                                        {formatCurrency(plan.price).replace(' ₫', '')}
                                                    </span>
                                                    <span className="text-gray-400 text-lg font-bold ml-1">đ</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">thanh toán một lần</p>
                                            </div>

                                            <ul className="space-y-4 mb-8">
                                                {plan.features.map((feature, idx) => (
                                                    <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                                                        <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${plan.gradient} flex items-center justify-center text-white mr-3 mt-0.5 flex-shrink-0`}>
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>

                                            <button
                                                onClick={() => handleSelectPlan(plan)}
                                                className={`w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r ${plan.gradient} hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
                                            >
                                                {userPlan === 'Free' ? 'Chọn Gói Này' : 'Nâng Cấp'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* History */}
                    {activeTab === 'history' && (
                        <div className="glass rounded-[32px] shadow-2xl border border-white/20 overflow-hidden relative z-10">
                            <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center backdrop-blur-md bg-white/30 dark:bg-gray-900/40">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Transaction History</h3>
                                <button onClick={loadHistory} className="text-sm font-medium text-blue-600 hover:text-blue-700">Refresh</button>
                            </div>

                            {loading ? (
                                <div className="p-20 text-center">
                                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-500">Loading transactions...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="p-20 text-center">
                                    <p className="text-gray-500 mb-4">No transactions found</p>
                                    <button onClick={() => setActiveTab('plans')} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">Browse Plans</button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-indigo-50/50 dark:bg-indigo-900/20">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                            {history.map((payment) => (
                                                <tr key={payment.id} className="hover:bg-white/40 dark:hover:bg-gray-800/40 transition-colors duration-200">
                                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{(payment.order_id ?? '').slice(-8)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{payment.description}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</td>
                                                    <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(payment.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedPlan && (
                <PaymentMethodSelector
                    amount={selectedPlan.price}
                    description={`Thanh toán ${selectedPlan.name}`}
                    planName={selectedPlan.name}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={(orderId) => {
                        console.log('Payment initiated:', orderId);
                    }}
                    onError={(error) => {
                        alert(error);
                        setShowPaymentModal(false);
                    }}
                />
            )}
        </MainLayout>
    );
};

export default PaymentPage;
