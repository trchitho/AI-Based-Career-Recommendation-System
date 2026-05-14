import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle, Target, Zap, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface STARMethodGuideProps {
    className?: string;
}

const starSteps = [
    {
        letter: 'S',
        title: 'Situation',
        subtitle: 'Tình huống',
        description: 'Mô tả bối cảnh, hoàn cảnh cụ thể',
        example: 'Trong dự án phát triển app mobile tại công ty cũ...',
        icon: <Target className="h-4 w-4" />,
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        badge: 'bg-blue-500',
    },
    {
        letter: 'T',
        title: 'Task',
        subtitle: 'Nhiệm vụ',
        description: 'Nêu rõ trách nhiệm, mục tiêu cần đạt',
        example: 'Tôi được giao nhiệm vụ tối ưu hóa hiệu suất app trong 2 tuần...',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
        badge: 'bg-indigo-500',
    },
    {
        letter: 'A',
        title: 'Action',
        subtitle: 'Hành động',
        description: 'Mô tả các bước cụ thể bạn đã thực hiện',
        example: 'Tôi đã phân tích code, áp dụng lazy loading, tối ưu database queries...',
        icon: <Zap className="h-4 w-4" />,
        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        badge: 'bg-orange-500',
    },
    {
        letter: 'R',
        title: 'Result',
        subtitle: 'Kết quả',
        description: 'Nêu thành quả đạt được, số liệu cụ thể',
        example: 'Kết quả là tốc độ tải app tăng 40%, user retention tăng 25%...',
        icon: <Trophy className="h-4 w-4" />,
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        badge: 'bg-purple-500',
    }
];

const STARMethodGuide: React.FC<STARMethodGuideProps> = ({ className = "" }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={className}>
            {/* Header — always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors rounded-t-[24px]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                        <Lightbulb className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Phương pháp STAR</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Cách trả lời hiệu quả cho câu hỏi phỏng vấn</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                        Xem hướng dẫn
                    </span>
                    {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-gray-400" />
                        : <ChevronDown className="h-4 w-4 text-gray-400" />
                    }
                </div>
            </button>

            {/* Expandable content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700/50 pt-4 space-y-4">
                            {/* STAR Steps */}
                            <div className="space-y-3">
                                {starSteps.map((step, idx) => (
                                    <motion.div
                                        key={step.letter}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.07 }}
                                        className="flex gap-3"
                                    >
                                        {/* Letter Badge */}
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-sm shadow-md ${step.badge}`}>
                                            {step.letter}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${step.color}`}>
                                                    {step.icon}
                                                    {step.title} — {step.subtitle}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">{step.description}</p>
                                            <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-lg px-3 py-1.5">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                    <strong className="text-gray-700 dark:text-gray-300 not-italic">Ví dụ: </strong>
                                                    {step.example}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Benefits */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/40">
                                <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2 text-sm">💡 Lợi ích của phương pháp STAR:</h4>
                                <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
                                    <li>• <strong>Cấu trúc rõ ràng:</strong> Giúp câu trả lời có logic, dễ theo dõi</li>
                                    <li>• <strong>Thể hiện năng lực:</strong> Chứng minh kỹ năng qua ví dụ thực tế</li>
                                    <li>• <strong>Tạo ấn tượng:</strong> Cho thấy tư duy có hệ thống và chuyên nghiệp</li>
                                    <li>• <strong>Dễ nhớ:</strong> Công thức đơn giản, áp dụng được cho mọi câu hỏi</li>
                                </ul>
                            </div>

                            {/* Tips */}
                            <div className="bg-amber-50/70 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800/40">
                                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 text-sm">⚡ Mẹo áp dụng hiệu quả:</h4>
                                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                    <li>• Chuẩn bị trước 3-5 câu chuyện STAR cho các tình huống khác nhau</li>
                                    <li>• Sử dụng số liệu cụ thể trong phần Result (tăng 30%, giảm 50%...)</li>
                                    <li>• Tập trung vào vai trò của bạn, không nói chung chung về team</li>
                                    <li>• Kết thúc bằng bài học rút ra hoặc kỹ năng đã phát triển</li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default STARMethodGuide;
