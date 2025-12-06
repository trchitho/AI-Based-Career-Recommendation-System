/**
 * Locked Career Card
 * Hiển thị nghề nghiệp bị khóa
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LockedCareerCardProps {
    career: {
        id: number;
        title: string;
        description?: string;
    };
    className?: string;
}

export const LockedCareerCard: React.FC<LockedCareerCardProps> = ({ career, className = '' }) => {
    const navigate = useNavigate();

    return (
        <div className={`relative rounded-lg border border-gray-200 overflow-hidden ${className}`}>
            {/* Blurred content */}
            <div className="p-6 filter blur-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{career.title}</h3>
                <p className="text-gray-600">{career.description || 'Mô tả nghề nghiệp...'}</p>
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent flex items-center justify-center">
                <div className="text-center text-white p-6">
                    <svg
                        className="w-16 h-16 mx-auto mb-4"
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
                    <h4 className="text-xl font-bold mb-2">Nội dung bị khóa</h4>
                    <p className="text-sm mb-4 opacity-90">
                        Nâng cấp gói để xem thêm nghề nghiệp
                    </p>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Nâng cấp ngay
                    </button>
                </div>
            </div>
        </div>
    );
};
