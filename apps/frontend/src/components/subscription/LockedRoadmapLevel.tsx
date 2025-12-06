/**
 * Locked Roadmap Level
 * Hiển thị level roadmap bị khóa
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LockedRoadmapLevelProps {
    level: number;
    className?: string;
}

export const LockedRoadmapLevel: React.FC<LockedRoadmapLevelProps> = ({ level, className = '' }) => {
    const navigate = useNavigate();

    return (
        <div className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 ${className}`}>
            <div className="max-w-sm mx-auto">
                <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                </svg>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Level {level} - Đã khóa
                </h3>

                <p className="text-gray-600 mb-6">
                    Nâng cấp gói Premium để mở khóa level này và xem roadmap đầy đủ
                </p>

                <button
                    onClick={() => navigate('/pricing')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                    Nâng cấp ngay
                </button>

                <p className="text-xs text-gray-500 mt-4">
                    Chỉ từ 299,000đ/tháng
                </p>
            </div>
        </div>
    );
};
