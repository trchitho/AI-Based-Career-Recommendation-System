import React from 'react';
import { Clock, Users, Target, Briefcase, Star } from 'lucide-react';
import { motion } from 'framer-motion';

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
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Chọn số lượng câu hỏi phỏng vấn
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Chọn mức độ chi tiết phù hợp với mục tiêu của bạn
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questionOptions.map((option) => {
                    const isSelected = selectedCount === option.count;
                    return (
                        <motion.div
                            key={option.count}
                            whileHover={{ y: -2, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelect(option.count)}
                            className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
                                isSelected
                                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-900/20 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20'
                                    : 'border-white/40 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/40 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'
                            }`}
                        >
                            {option.recommended && (
                                <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md">
                                    Đề xuất
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-xl transition-all duration-200 ${
                                    isSelected
                                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500'
                                }`}>
                                    {option.icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{option.count + 1} câu hỏi</h4>
                                    <p className={`text-xs font-semibold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {option.label}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                                {option.description}
                            </p>

                            <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-700/50 pt-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400 dark:text-gray-500">Thời gian:</span>
                                    <span className={`font-semibold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {option.duration}
                                    </span>
                                </div>
                                {(() => {
                                    const dist = getDistribution(option.distribution) as any;
                                    return (
                                        <>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400 dark:text-gray-500">Kỹ thuật:</span>
                                                <span className="font-medium text-gray-600 dark:text-gray-300">{dist.technical}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400 dark:text-gray-500">Hành vi:</span>
                                                <span className="font-medium text-gray-600 dark:text-gray-300">{dist.behavioral}</span>
                                            </div>
                                            {dist.situational > 0 && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-400 dark:text-gray-500">Tình huống:</span>
                                                    <span className="font-medium text-gray-600 dark:text-gray-300">{dist.situational}</span>
                                                </div>
                                            )}
                                            {hasJD && (
                                                <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                                    <span>Từ JD:</span>
                                                    <span>{dist.jd_specific}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold">
                                                <span>Kết thúc:</span>
                                                <span>1</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Selected glow ring */}
                            {isSelected && (
                                <div className="absolute inset-0 rounded-2xl ring-2 ring-indigo-500/30 pointer-events-none" />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            <div className="mt-4 p-4 bg-indigo-50/70 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40">
                <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2 text-sm">💡 Gợi ý chọn lựa:</h4>
                <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
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
