import React from 'react';
import { Clock, Users, Target, Briefcase, Star } from 'lucide-react';

interface QuestionCountOption {
    count: number;
    label: string;
    description: string;
    duration: string;
    distribution: {
        warm_up: number;
        technical: number;
        behavioral: number;
        situational: number;
        closing: number;
    };
    icon: React.ReactNode;
    recommended?: boolean;
}

interface QuestionCountSelectorProps {
    selectedCount: number;
    onSelect: (count: number) => void;
    hasJD?: boolean;
    className?: string;
}

const questionOptions: QuestionCountOption[] = [
    {
        count: 5,
        label: "Cơ bản",
        description: "Phỏng vấn nhanh, tập trung vào các kỹ năng cốt lõi",
        duration: "10-15 phút",
        distribution: { warm_up: 1, technical: 2, behavioral: 1, situational: 1, closing: 1 },
        icon: <Clock className="h-5 w-5" />
    },
    {
        count: 7,
        label: "Tiêu chuẩn",
        description: "Đánh giá toàn diện các khía cạnh quan trọng",
        duration: "15-20 phút",
        distribution: { warm_up: 1, technical: 3, behavioral: 2, situational: 1, closing: 1 },
        icon: <Users className="h-5 w-5" />,
        recommended: true
    },
    {
        count: 8,
        label: "Mở rộng",
        description: "Khám phá sâu hơn về kỹ năng và kinh nghiệm",
        duration: "20-25 phút",
        distribution: { warm_up: 1, technical: 3, behavioral: 2, situational: 2, closing: 1 },
        icon: <Target className="h-5 w-5" />
    },
    {
        count: 10,
        label: "Chuyên sâu",
        description: "Đánh giá chi tiết cho các vị trí quan trọng",
        duration: "25-30 phút",
        distribution: { warm_up: 1, technical: 4, behavioral: 3, situational: 2, closing: 1 },
        icon: <Briefcase className="h-5 w-5" />
    },
    {
        count: 12,
        label: "Toàn diện",
        description: "Phỏng vấn đầy đủ nhất, phù hợp cho senior",
        duration: "30-35 phút",
        distribution: { warm_up: 1, technical: 5, behavioral: 3, situational: 3, closing: 1 },
        icon: <Star className="h-5 w-5" />
    }
];

const QuestionCountSelector: React.FC<QuestionCountSelectorProps> = ({
    selectedCount,
    onSelect,
    hasJD = false,
    className = ""
}) => {
    // Khi có JD: thay 2 câu technical/situational bằng jd_specific
    const getDistribution = (base: QuestionCountOption['distribution']) => {
        if (!hasJD) return base;
        const jd = 2;
        const tech = Math.max(0, base.technical - 1);
        const sit = Math.max(0, base.situational - 1);
        return { ...base, technical: tech, situational: sit, jd_specific: jd };
    };
    return (
        <div className={`space-y-4 ${className}`}>
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Chọn số lượng câu hỏi phỏng vấn
                </h3>
                <p className="text-sm text-gray-600">
                    Chọn mức độ chi tiết phù hợp với mục tiêu của bạn
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questionOptions.map((option) => (
                    <div
                        key={option.count}
                        onClick={() => onSelect(option.count)}
                        className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${selectedCount === option.count
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                    >
                        {option.recommended && (
                            <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                Đề xuất
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${selectedCount === option.count ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {option.icon}
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">{option.count + 1} câu hỏi</h4>
                                <p className="text-sm font-medium text-blue-600">{option.label}</p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{option.description}</p>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Thời gian:</span>
                                <span className="font-medium text-gray-700">{option.duration}</span>
                            </div>

                            <div className="text-xs text-gray-500">
                                {(() => {
                                    const dist = getDistribution(option.distribution) as any;
                                    return (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Kỹ thuật:</span>
                                                <span className="font-medium">{dist.technical}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Hành vi:</span>
                                                <span className="font-medium">{dist.behavioral}</span>
                                            </div>
                                            {dist.situational > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Tình huống:</span>
                                                    <span className="font-medium">{dist.situational}</span>
                                                </div>
                                            )}
                                            {hasJD && (
                                                <div className="flex justify-between text-yellow-700 font-medium">
                                                    <span>Từ JD:</span>
                                                    <span>{dist.jd_specific}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-purple-600 font-medium">
                                                <span>Kết thúc:</span>
                                                <span>1</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2"> Gợi ý chọn lựa:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>5 câu:</strong> Phù hợp cho đánh giá nhanh, sinh viên mới ra trường</li>
                    <li>• <strong>7 câu:</strong> Cân bằng tốt giữa thời gian và độ chi tiết (đề xuất)</li>
                    <li>• <strong>8-10 câu:</strong> Cho các vị trí chuyên môn cao, cần đánh giá kỹ</li>
                    <li>• <strong>12 câu:</strong> Dành cho senior, leadership, hoặc vị trí quan trọng</li>
                </ul>
            </div>
        </div>
    );
};

export default QuestionCountSelector;