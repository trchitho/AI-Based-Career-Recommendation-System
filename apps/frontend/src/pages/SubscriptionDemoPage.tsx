/**
 * Subscription Demo Page
 * Trang demo các tính năng subscription
 */
import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useSubscription } from '../hooks/useSubscription';
import { AssessmentLimitBanner } from '../components/subscription/AssessmentLimitBanner';
import { LockedCareerCard } from '../components/subscription/LockedCareerCard';
import { LockedRoadmapLevel } from '../components/subscription/LockedRoadmapLevel';
import { UpgradeModal } from '../components/subscription/UpgradeModal';

export const SubscriptionDemoPage: React.FC = () => {
    const {
        plan,
        usage,
        loading,
        isPremium,
        isFree,
        assessmentsRemaining,
        careersRemaining,
        canTakeAssessment,
        canViewCareer,
        canViewRoadmapLevel,
        recordAssessment,
        recordCareerView,
    } = useSubscription();

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    const handleTestAssessment = async () => {
        const result = await canTakeAssessment();
        if (!result.allowed) {
            setModalMessage(result.message);
            setShowUpgradeModal(true);
        } else {
            try {
                await recordAssessment();
                alert('Đã track assessment! ' + result.message);
            } catch (error) {
                alert('Lỗi: Bạn đã hết lượt làm bài test');
            }
        }
    };

    const handleTestCareer = async (careerId: number) => {
        const result = await canViewCareer(careerId);
        if (!result.allowed) {
            setModalMessage(result.message);
            setShowUpgradeModal(true);
        } else {
            try {
                await recordCareerView(careerId);
                alert('Đã track career view! ' + result.message);
            } catch (error) {
                alert('Lỗi: Không thể xem nghề này');
            }
        }
    };

    const handleTestRoadmap = async (level: number) => {
        const result = await canViewRoadmapLevel(level);
        if (!result.allowed) {
            setModalMessage(result.message);
            setShowUpgradeModal(true);
        } else {
            alert('Bạn có thể xem level ' + level);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="min-h-screen bg-gray-50 py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">🔒 Subscription Demo</h1>
                    <p className="text-gray-600 mb-8">Test các tính năng giới hạn nội dung</p>

                    {/* Plan Info */}
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4">📊 Thông tin gói hiện tại</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Plan</h3>
                                <div className="bg-gray-50 p-4 rounded">
                                    <p className="text-lg font-bold text-blue-600">{plan?.display_name}</p>
                                    <p className="text-sm text-gray-600 mt-1">{plan?.description}</p>
                                    <div className="mt-3 space-y-1 text-sm">
                                        <p>
                                            <strong>Bài test/tháng:</strong>{' '}
                                            {plan?.max_assessments_per_month === -1
                                                ? 'Không giới hạn'
                                                : plan?.max_assessments_per_month}
                                        </p>
                                        <p>
                                            <strong>Nghề nghiệp:</strong>{' '}
                                            {plan?.can_view_all_careers ? 'Tất cả' : plan?.max_career_views}
                                        </p>
                                        <p>
                                            <strong>Roadmap:</strong>{' '}
                                            {plan?.can_view_full_roadmap ? 'Đầy đủ' : `Level ${plan?.max_roadmap_level}`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Usage (tháng này)</h3>
                                <div className="bg-gray-50 p-4 rounded">
                                    <div className="space-y-2 text-sm">
                                        <p>
                                            <strong>Bài test đã làm:</strong> {usage?.assessments_count || 0}
                                        </p>
                                        <p>
                                            <strong>Nghề đã xem:</strong> {usage?.careers_viewed?.length || 0}
                                        </p>
                                        <p>
                                            <strong>Còn lại:</strong>
                                        </p>
                                        <ul className="ml-4 space-y-1">
                                            <li>
                                                • Bài test:{' '}
                                                {assessmentsRemaining === Infinity ? '∞' : assessmentsRemaining}
                                            </li>
                                            <li>
                                                • Nghề nghiệp: {careersRemaining === Infinity ? '∞' : careersRemaining}
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            {isPremium && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                                    ⭐ Premium
                                </span>
                            )}
                            {isFree && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
                                    🆓 Free
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Assessment Limit Banner */}
                    {isFree && plan && usage && (
                        <AssessmentLimitBanner
                            remaining={plan.max_assessments_per_month - usage.assessments_count}
                            total={plan.max_assessments_per_month}
                            className="mb-8"
                        />
                    )}

                    {/* Test Buttons */}
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4">🧪 Test giới hạn</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">1. Test làm bài test</h3>
                                <button
                                    onClick={handleTestAssessment}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                                >
                                    Làm bài test
                                </button>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">2. Test xem nghề nghiệp</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleTestCareer(1)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                                    >
                                        Xem nghề #1
                                    </button>
                                    <button
                                        onClick={() => handleTestCareer(2)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                                    >
                                        Xem nghề #2
                                    </button>
                                    <button
                                        onClick={() => handleTestCareer(3)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                                    >
                                        Xem nghề #3
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">3. Test xem roadmap level</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleTestRoadmap(1)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                    >
                                        Level 1
                                    </button>
                                    <button
                                        onClick={() => handleTestRoadmap(2)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                    >
                                        Level 2
                                    </button>
                                    <button
                                        onClick={() => handleTestRoadmap(3)}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                    >
                                        Level 3
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* UI Components Demo */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-4">🎨 Locked Career Card</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <LockedCareerCard
                                    career={{
                                        id: 1,
                                        title: 'Software Engineer',
                                        description: 'Phát triển phần mềm và ứng dụng',
                                    }}
                                />
                                <LockedCareerCard
                                    career={{
                                        id: 2,
                                        title: 'Data Scientist',
                                        description: 'Phân tích dữ liệu và machine learning',
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">🎨 Locked Roadmap Level</h2>
                            <LockedRoadmapLevel level={2} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                message={modalMessage}
            />
        </MainLayout>
    );
};

export default SubscriptionDemoPage;
