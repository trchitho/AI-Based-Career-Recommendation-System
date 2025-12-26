/**
 * Payment Page - Simple & Working Version
 */
import React, { useState, useEffect } from 'react';
import { PaymentButton } from '../components/payment/PaymentButton';
import { getPaymentHistory, PaymentHistory } from '../services/paymentService';
import MainLayout from '../components/layout/MainLayout';
import { getAccessToken } from '../utils/auth';
import SubscriptionExpiryCard from '../components/subscription/SubscriptionExpiryCard';

export const PaymentPage: React.FC = () => {
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
    const isLoggedIn = !!getAccessToken();

    // Simple plan detection from payment history
    const [userPlan, setUserPlan] = useState<string>('Free');

    // Define plans array first
    const plans = [
        {
            id: 'basic',
            name: 'Gói Cơ Bản',
            price: 99000,
            description: 'Dành cho người dùng mới muốn thử nghiệm',
            features: [
                'Tối đa 20 bài kiểm tra / tháng',
                'Xem 5 nghề nghiệp phù hợp nhất',
                'Lộ trình học tập cơ bản (Level 1-2)',
                'Phân tích tóm tắt RIASEC & Big Five'
            ],
            gradient: 'from-blue-500 to-cyan-500',
        },
        {
            id: 'premium',
            name: 'Gói Premium',
            price: 299000,
            description: 'Gói phổ biến nhất - Định hướng rõ ràng',
            features: [
                'Làm bài kiểm tra không giới hạn',
                'Xem toàn bộ danh mục nghề nghiệp',
                'Lộ trình học tập đầy đủ (Full Roadmap)',
                'Phân tích AI chi tiết tính cách & tiềm năng'
            ],
            gradient: 'from-green-500 to-emerald-500',
            popular: true,
        },
        {
            id: 'pro',
            name: 'Gói Pro',
            price: 499000,
            description: 'Người cố vấn số đồng hành suốt hành trình',
            features: [
                'Tất cả tính năng gói Premium',
                '🤖 Trợ lý ảo AI 24/7',
                '📄 Xuất báo cáo PDF chuyên sâu',
                '📊 So sánh lịch sử phát triển'
            ],
            gradient: 'from-purple-500 to-pink-500',
        },
    ];

    // Filter plans based on user's current plan
    const getAvailablePlans = () => {
        if (userPlan === 'Free') {
            return plans; // Show all plans for free users
        } else if (userPlan === 'Basic') {
            return plans.filter(plan => plan.id !== 'basic'); // Hide Basic, show Premium & Pro
        } else if (userPlan === 'Premium') {
            return plans.filter(plan => plan.id === 'pro'); // Only show Pro
        } else if (userPlan === 'Pro') {
            return []; // Already has highest plan
        }
        return plans;
    };

    const availablePlans = getAvailablePlans();

    useEffect(() => {
        if (isLoggedIn) {
            loadHistory();
            detectUserPlan();
        }
    }, [isLoggedIn]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const token = getAccessToken();
            if (!token) return;

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
            if (!token) return;

            const payments = await getPaymentHistory();
            const successfulPayments = payments.filter((p) => 
                p.status?.toLowerCase() === 'success'
            );
            
            if (successfulPayments.length > 0) {
                const latestPayment = successfulPayments[0];
                
                if (latestPayment && latestPayment.amount >= 450000) {
                    setUserPlan('Pro');
                } else if (latestPayment && latestPayment.amount >= 250000) {
                    setUserPlan('Premium');
                } else if (latestPayment && latestPayment.amount >= 80000) {
                    setUserPlan('Basic');
                }
            }
        } catch (error) {
            console.error('Failed to detect user plan:', error);
        }
    };

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
            pending: 'bg-yellow-100 text-yellow-800',
            success: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800',
        };

        const labels = {
            pending: 'Đang xử lý',
            success: 'Thành công',
            failed: 'Thất bại',
            cancelled: 'Đã hủy',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${badges[status as keyof typeof badges] || badges.pending}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                            Choose Your Plan
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Unlock your career potential with our premium features
                        </p>

                        {/* Current Plan Display with Expiry Info */}
                        {userPlan !== 'Free' && (
                            <div className="mt-8 max-w-2xl mx-auto">
                                <SubscriptionExpiryCard />
                            </div>
                        )}

                        {userPlan === 'Free' && (
                            <div className="mt-8 max-w-md mx-auto">
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="text-2xl">🆓</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Gói Free (Hiện tại)</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Miễn phí - Mặc định cho tất cả người dùng</p>
                                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                <span>5 bài kiểm tra / tháng</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                <span>Xem 1 nghề nghiệp đầu tiên</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                <span>Roadmap Level 1 only</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const token = getAccessToken();
                                                    const response = await fetch('http://localhost:8000/api/subscription/force-sync', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'Content-Type': 'application/json'
                                                        }
                                                    });
                                                    const result = await response.json();
                                                    if (result.success) {
                                                        alert(`✅ ${result.message}`);
                                                        window.location.reload();
                                                    } else {
                                                        alert(`❌ ${result.message}`);
                                                    }
                                                } catch (err) {
                                                    alert('Lỗi kết nối server');
                                                }
                                            }}
                                            className="mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
                                        >
                                            Đã thanh toán? Click để đồng bộ gói
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    {isLoggedIn && (
                        <div className="flex justify-center mb-8">
                            <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setActiveTab('plans')}
                                    className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                                        activeTab === 'plans'
                                            ? 'bg-gray-900 text-white'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    Chọn gói
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                                        activeTab === 'history'
                                            ? 'bg-gray-900 text-white'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    Lịch sử giao dịch
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    {activeTab === 'plans' && (
                        <>
                            {availablePlans.length === 0 ? (
                                // User already has the highest plan
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
                                        Bạn đang sử dụng gói {userPlan} - gói cao nhất của chúng tôi với đầy đủ tính năng.
                                    </p>
                                    <button
                                        onClick={() => window.location.href = '/dashboard'}
                                        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg"
                                    >
                                        Quay lại Dashboard
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-12">
                                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                            {userPlan === 'Free' ? 'Gói Thanh Toán' : 'Nâng Cấp Gói'}
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            {userPlan === 'Free' 
                                                ? 'Chọn gói phù hợp để mở khóa toàn bộ tiềm năng nghề nghiệp của bạn'
                                                : 'Nâng cấp lên gói cao hơn để trải nghiệm thêm nhiều tính năng'
                                            }
                                        </p>
                                    </div>
                                    
                                    <div className={`grid gap-8 max-w-6xl mx-auto ${
                                        availablePlans.length === 1 ? 'grid-cols-1 max-w-md' : 
                                        availablePlans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl' : 
                                        'grid-cols-1 md:grid-cols-3'
                                    }`}>
                                        {availablePlans.map((plan) => (
                                            <div
                                                key={plan.id}
                                                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border transition-all duration-300 ${
                                                    plan.popular
                                                        ? 'border-green-500 ring-2 ring-green-500/20 scale-105'
                                                        : 'border-gray-200 dark:border-gray-700 hover:shadow-xl'
                                                }`}
                                            >
                                                {plan.popular && (
                                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                                        <span className="bg-green-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                                                            Most Popular
                                                        </span>
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

                                                <PaymentButton
                                                    amount={plan.price}
                                                    description={`Thanh toán ${plan.name}`}
                                                    onSuccess={(orderId) => {
                                                        console.log('Payment initiated', plan.name, orderId);
                                                        // Reload page after payment
                                                        setTimeout(() => {
                                                            window.location.reload();
                                                        }, 2000);
                                                    }}
                                                    className={`w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r ${plan.gradient} hover:opacity-90 transition-all`}
                                                >
                                                    {userPlan === 'Free' ? 'Chọn Gói Này' : 'Nâng Cấp'}
                                                </PaymentButton>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Transaction History</h3>
                                <button 
                                    onClick={loadHistory} 
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Refresh
                                </button>
                            </div>

                            {loading ? (
                                <div className="p-20 text-center">
                                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-500">Loading transactions...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="p-20 text-center">
                                    <p className="text-gray-500 mb-4">No transactions found</p>
                                    <button
                                        onClick={() => setActiveTab('plans')}
                                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
                                    >
                                        Browse Plans
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {history.map((payment) => (
                                                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">#{payment.order_id.slice(-8)}</td>
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
        </MainLayout>
    );
};