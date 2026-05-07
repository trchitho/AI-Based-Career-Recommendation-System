import React from 'react';
import { Clock, Users, Target, Briefcase, Star } from 'lucide-react';
import './QuestionCountSelector.css';

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
    };
    icon: React.ReactNode;
    recommended?: boolean;
}

interface QuestionCountSelectorProps {
    selectedCount: number;
    onSelect: (count: number) => void;
    className?: string;
}

const questionOptions: QuestionCountOption[] = [
    {
        count: 5,
        label: "Cơ bản",
        description: "Phỏng vấn nhanh, tập trung vào các kỹ năng cốt lõi",
        duration: "10-15 phút",
        distribution: { warm_up: 1, technical: 2, behavioral: 1, situational: 1 },
        icon: <Clock className="h-5 w-5" />
    },
    {
        count: 7,
        label: "Tiêu chuẩn",
        description: "Đánh giá toàn diện các khía cạnh quan trọng",
        duration: "15-20 phút",
        distribution: { warm_up: 1, technical: 3, behavioral: 2, situational: 1 },
        icon: <Users className="h-5 w-5" />,
        recommended: true
    },
    {
        count: 8,
        label: "Mở rộng",
        description: "Khám phá sâu hơn về kỹ năng và kinh nghiệm",
        duration: "20-25 phút",
        distribution: { warm_up: 1, technical: 3, behavioral: 2, situational: 2 },
        icon: <Target className="h-5 w-5" />
    },
    {
        count: 10,
        label: "Chuyên sâu",
        description: "Đánh giá chi tiết cho các vị trí quan trọng",
        duration: "25-30 phút",
        distribution: { warm_up: 1, technical: 4, behavioral: 3, situational: 2 },
        icon: <Briefcase className="h-5 w-5" />
    },
    {
        count: 12,
        label: "Toàn diện",
        description: "Phỏng vấn đầy đủ nhất, phù hợp cho senior",
        duration: "30-35 phút",
        distribution: { warm_up: 1, technical: 5, behavioral: 3, situational: 3 },
        icon: <Star className="h-5 w-5" />
    }
];

const QuestionCountSelector: React.FC<QuestionCountSelectorProps> = ({
    selectedCount,
    onSelect,
    className = ""
}) => {
    return (
        <div className={`space-y-4 question-selector-container ${className}`}>
            <div className="text-center mb-6">
                <h3 className="question-selector-title">
                    Chọn số lượng câu hỏi phỏng vấn
                </h3>
                <p className="question-selector-subtitle">
                    Chọn mức độ chi tiết phù hợp với mục tiêu của bạn
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questionOptions.map((option) => (
                    <div
                        key={option.count}
                        onClick={() => onSelect(option.count)}
                        className={`question-option-card ${selectedCount === option.count
                            ? 'question-option-card-selected'
                            : 'question-option-card-default'
                            }`}
                    >
                        {option.recommended && (
                            <div className="question-recommended-badge">
                                Đề xuất
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                            <div className={`question-icon-container ${selectedCount === option.count ? 'question-icon-selected' : 'question-icon-default'
                                }`}>
                                {option.icon}
                            </div>
                            <div>
                                <h4 className="question-count-text">{option.count} câu hỏi</h4>
                                <p className="question-label-text">{option.label}</p>
                            </div>
                        </div>

                        <p className="question-description-text mb-3">{option.description}</p>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="question-detail-label">Thời gian:</span>
                                <span className="question-detail-value">{option.duration}</span>
                            </div>

                            <div className="text-xs">
                                <div className="flex justify-between">
                                    <span className="question-detail-label">Kỹ thuật:</span>
                                    <span className="question-detail-value">{option.distribution.technical}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="question-detail-label">Hành vi:</span>
                                    <span className="question-detail-value">{option.distribution.behavioral}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="question-detail-label">Tình huống:</span>
                                    <span className="question-detail-value">{option.distribution.situational}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="question-info-box">
                <h4 className="question-info-title">💡 Gợi ý chọn lựa:</h4>
                <ul className="question-info-list space-y-1">
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
