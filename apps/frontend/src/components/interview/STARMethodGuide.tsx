import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle, Target, Zap, Trophy } from 'lucide-react';
import './STARMethodGuide.css';

interface STARMethodGuideProps {
    className?: string;
}

const STARMethodGuide: React.FC<STARMethodGuideProps> = ({ className = "" }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const starSteps = [
        {
            letter: 'S',
            title: 'Situation',
            subtitle: 'Tình huống',
            description: 'Mô tả bối cảnh, hoàn cảnh cụ thể',
            example: 'Trong dự án phát triển app mobile tại công ty cũ...',
            icon: <Target className="h-4 w-4" />,
            colorClass: 'star-step-blue'
        },
        {
            letter: 'T',
            title: 'Task',
            subtitle: 'Nhiệm vụ',
            description: 'Nêu rõ trách nhiệm, mục tiêu cần đạt',
            example: 'Tôi được giao nhiệm vụ tối ưu hóa hiệu suất app trong 2 tuần...',
            icon: <CheckCircle className="h-4 w-4" />,
            colorClass: 'star-step-indigo'
        },
        {
            letter: 'A',
            title: 'Action',
            subtitle: 'Hành động',
            description: 'Mô tả các bước cụ thể bạn đã thực hiện',
            example: 'Tôi đã phân tích code, áp dụng lazy loading, tối ưu database queries...',
            icon: <Zap className="h-4 w-4" />,
            colorClass: 'star-step-orange'
        },
        {
            letter: 'R',
            title: 'Result',
            subtitle: 'Kết quả',
            description: 'Nêu thành quả đạt được, số liệu cụ thể',
            example: 'Kết quả là tốc độ tải app tăng 40%, user retention tăng 25%...',
            icon: <Trophy className="h-4 w-4" />,
            colorClass: 'star-step-purple'
        }
    ];

    return (
        <div className={`star-guide-container ${className}`}>
            <div
                className="star-guide-header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="star-guide-icon-wrapper">
                        <Lightbulb className="h-5 w-5 star-guide-icon" />
                    </div>
                    <div>
                        <h3 className="star-guide-title">Phương pháp STAR</h3>
                        <p className="star-guide-subtitle">Cách trả lời hiệu quả cho câu hỏi phỏng vấn</p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 star-guide-chevron" />
                ) : (
                    <ChevronDown className="h-5 w-5 star-guide-chevron" />
                )}
            </div>

            {isExpanded && (
                <div className="star-guide-content">
                    <div className="mt-4 space-y-4">
                        {starSteps.map((step) => (
                            <div key={step.letter} className="flex gap-4">
                                <div className={`star-step-letter ${step.colorClass}`}>
                                    {step.letter}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {step.icon}
                                        <h4 className="star-step-title">
                                            {step.title} - {step.subtitle}
                                        </h4>
                                    </div>
                                    <p className="star-step-description mb-2">{step.description}</p>
                                    <div className="star-step-example">
                                        <p className="star-step-example-text">
                                            <strong>Ví dụ:</strong> {step.example}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="star-benefits-box">
                        <h4 className="star-benefits-title">💡 Lợi ích của phương pháp STAR:</h4>
                        <ul className="star-benefits-list space-y-1">
                            <li>• <strong>Cấu trúc rõ ràng:</strong> Giúp câu trả lời có logic, dễ theo dõi</li>
                            <li>• <strong>Thể hiện năng lực:</strong> Chứng minh kỹ năng qua ví dụ thực tế</li>
                            <li>• <strong>Tạo ấn tượng:</strong> Cho thấy tư duy có hệ thống và chuyên nghiệp</li>
                            <li>• <strong>Dễ nhớ:</strong> Công thức đơn giản, áp dụng được cho mọi câu hỏi</li>
                        </ul>
                    </div>

                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                        <h4 className="font-medium text-indigo-950 mb-2"> Mẹo áp dụng hiệu quả:</h4>
                        <ul className="text-sm text-indigo-950 space-y-1">
                            <li>• Chuẩn bị trước 3-5 câu chuyện STAR cho các tình huống khác nhau</li>
                            <li>• Sử dụng số liệu cụ thể trong phần Result (tăng 30%, giảm 50%...)</li>
                            <li>• Tập trung vào vai trò của bạn, không nói chung chung về team</li>
                            <li>• Kết thúc bằng bài học rút ra hoặc kỹ năng đã phát triển</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default STARMethodGuide;
