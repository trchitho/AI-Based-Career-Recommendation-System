/**
 * Assessment Limit Banner
 * Hiển thị số lượt làm bài test còn lại
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AssessmentLimitBannerProps {
    remaining: number;
    total: number;
    className?: string;
}

export const AssessmentLimitBanner: React.FC<AssessmentLimitBannerProps> = ({
    remaining,
    total,
    className = '',
}) => {
    const navigate = useNavigate();
    const percentage = (remaining / total) * 100;

    // Màu sắc dựa trên số lượt còn lại
    const getColorClass = () => {
        if (percentage > 50) return 'bg-green-50 border-green-200 text-green-800';
        if (percentage > 20) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        return 'bg-red-50 border-red-200 text-red-800';
    };

    const getIconColor = () => {
        if (percentage > 50) return 'text-green-600';
        if (percentage > 20) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className={`border rounded-lg p-4 ${getColorClass()} ${className}`}>
            <div className="flex items-start gap-3">
                <svg
                    className={`w-6 h-6 flex-shrink-0 ${getIconColor()}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <div className="flex-1">
                    <p className="font-semibold mb-1">
                        Bạn còn <strong>{remaining}/{total}</strong> lượt làm bài test miễn phí trong tháng này
                    </p>
                    <p className="text-sm opacity-90">
                        Nâng cấp gói Premium để không giới hạn số lần làm bài test.
                    </p>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="mt-2 text-sm font-semibold underline hover:no-underline"
                    >
                        Xem các gói nâng cấp →
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 ${percentage > 50 ? 'bg-green-600' : percentage > 20 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};
