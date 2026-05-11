/**
 * Subscription Demo Page
 * Trang demo các tính năng subscription
 */
import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useSubscription } from '../hooks/useSubscription';
import { AssessmentLimitBanner } from '../components/subscription/AssessmentLimitBanner';
import LockedCareerCard from '../components/subscription/LockedCareerCard';
import { LockedRoadmapLevel } from '../components/subscription/LockedRoadmapLevel';
import { UpgradeModal } from '../components/subscription/UpgradeModal';

export const SubscriptionDemoPage = () => {
    const { subscriptionData, loading, isPremium, planName, checkFeatureAccess } = useSubscription();

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    // Derive values from subscriptionData
    const subscription = subscriptionData?.subscription;
    const usageList = subscriptionData?.usage || [];
    const isFree = !isPremium;

    // Get usage info for specific features
    const getUsageInfo = (feature: string) => usageList.find((u) => u.feature === feature);
    const assessmentUsage = getUsageInfo('assessment');
    const careerUsage = getUsageInfo('career_view');

    const assessmentsRemaining = assessmentUsage?.remaining ?? 0;
    const careersRemaining = careerUsage?.remaining ?? 0;
    const assessmentsTotal = assessmentUsage?.limit ?? 0;
    const assessmentsCurrent = assessmentUsage?.current_usage ?? 0;

    const handleTestAssessment = async () => {
        const result = await checkFeatureAccess('assessment');
        if (!result.allowed) {
            setModalMessage(result.reason || 'Bạn đã hết lượt làm bài test');
            setShowUpgradeModal(true);
        } else {
            alert('Bạn có thể làm bài test! Còn lại: ' + assessmentsRemaining);
        }
    };

    const handleTestCareer = async (careerId: number) => {
        const result = await checkFeatureAccess('career_view');
        if (!result.allowed) {
            setModalMessage(result.reason || 'Bạn đã hết lượt xem nghề nghiệp');
            setShowUpgradeModal(true);
        } else {
            alert('Bạn có thể xem nghề ' + careerId);
        }
    };

    const handleTestRoadmap = async (level: number) => {
        const result = await checkFeatureAccess('roadmap', level);
        if (!result.allowed) {
            setModalMessage(result.reason || 'Bạn cần nâng cấp để xem level này');
            setShowUpgradeModal(true);
        } else {
            alert('Bạn có thể xem roadmap level ' + level);
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
                    <h1 className="text-4xl font-bold text-gray-900 mb-2"> Subscription Demo</h1>
                    <p className="text-gray-600 mb-8">Test các tính năng giới hạn nội dung</p>

                    {/* Plan Info */}
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4"> Thông tin gói hiện tại</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Plan</h3>
                                <div className="bg-gray-50 p-4 rounded">
                                    <p className="text-lg font-bold text-blue-600">{planName}</p>
                                    <p className="text-sm text-gray-600 mt-1">Status: {subscription?.status || 'N/A'}</p>
                                    <div className="mt-3 space-y-1 text-sm">
                                        <p>
                                            <strong>Premium:</strong> {isPremium ? 'Có' : 'Không'}
                                        </p>
                                        {subscription?.expires_at && (
                                            <p>
                                                <strong>Hết hạn:</strong> {new Date(subscription.expires_at).toLocaleDateString('vi-VN')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Usage (tháng này)</h3>
                                <div className="bg-gray-50 p-4 rounded">
                                    <div className="space-y-2 text-sm">
                                        <p>
                                            <strong>Bài test đã làm:</strong> {assessmentsCurrent}
                                        </p>
                                        <p>
                                            <strong>Còn lại:</strong>
                                        </p>
                                        <ul className="ml-4 space-y-1">
                                            <li>• Bài test: {isPremium ? '∞' : assessmentsRemaining}</li>
                                            <li>• Nghề nghiệp: {isPremium ? '∞' : careersRemaining}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            {isPremium && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">⭐ Premium</span>
                            )}
                            {isFree && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">🆓 Free</span>
                            )}
                        </div>
                    </div>

                    {/* Assessment Limit Banner */}
                    {isFree && assessmentsTotal > 0 && (
                        <AssessmentLimitBanner remaining={assessmentsRemaining} total={assessmentsTotal} className="mb-8" />
                    )}

                    {/* Test Buttons */}
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold mb-4"> Test giới hạn</h2>
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
                                    {[1, 2, 3].map((id) => (
                                        <button
                                            key={id}
                                            onClick={() => handleTestCareer(id)}
                                            className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white rounded-lg"
                                        >
                                            Xem nghề {id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">3. Test xem roadmap level</h3>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => handleTestRoadmap(level)}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                                        >
                                            Level {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* UI Components Demo */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-4"> Locked Career Card</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <LockedCareerCard
                                    career={{ id: '1', title: 'Software Engineer', description: 'Phát triển phần mềm và ứng dụng' }}
                                    position={1}
                                />
                                <LockedCareerCard
                                    career={{ id: '2', title: 'Data Scientist', description: 'Phân tích dữ liệu và machine learning' }}
                                    position={2}
                                />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4"> Locked Roadmap Level</h2>
                            <LockedRoadmapLevel level={2} />
                        </div>
                    </div>
                </div>
            </div>

            <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} message={modalMessage} />
        </MainLayout>
    );
};

export default SubscriptionDemoPage;
