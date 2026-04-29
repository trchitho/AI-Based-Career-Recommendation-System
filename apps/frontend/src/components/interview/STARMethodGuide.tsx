import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, CheckCircle, Target, Zap, Trophy } from 'lucide-react';

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
            color: 'bg-blue-100 text-blue-600 border-blue-200'
        },
        {
            letter: 'T',
            title: 'Task',
            subtitle: 'Nhiệm vụ',
            description: 'Nêu rõ trách nhiệm, mục tiêu cần đạt',
            example: 'Tôi được giao nhiệm vụ tối ưu hóa hiệu suất app trong 2 tuần...',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'bg-indigo-50 text-indigo-800 border-indigo-200'
        },
        {
            letter: 'A',
            title: 'Action',
            subtitle: 'Hành động',
            description: 'Mô tả các bước cụ thể bạn đã thực hiện',
            example: 'Tôi đã phân tích code, áp dụng lazy loading, tối ưu database queries...',
            icon: <Zap className="h-4 w-4" />,
            color: 'bg-orange-100 text-orange-600 border-orange-200'
        },
        {
            letter: 'R',
            title: 'Result',
            subtitle: 'Kết quả',
            description: 'Nêu thành quả đạt được, số liệu cụ thể',
            example: 'Kết quả là tốc độ tải app tăng 40%, user retention tăng 25%...',
            icon: <Trophy className="h-4 w-4" />,
            color: 'bg-purple-100 text-purple-600 border-purple-200'
        }
    ];

    return (
        <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                        <Lightbulb className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Phương pháp STAR</h3>
                        <p className="text-sm text-gray-600">Cách trả lời hiệu quả cho câu hỏi phỏng vấn</p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
            </div>

            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="mt-4 space-y-4">
                        {starSteps.map((step, index) => (
                            <div key={step.letter} className="flex gap-4">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 ${step.color} flex items-center justify-center font-bold text-lg`}>
                                    {step.letter}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {step.icon}
                                        <h4 className="font-semibold text-gray-900">
                                            {step.title} - {step.subtitle}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-sm text-gray-700 italic">
                                            <strong>Ví dụ:</strong> {step.example}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2"> Lợi ích của phương pháp STAR:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• <strong>Cấu trúc rõ ràng:</strong> Giúp câu trả lời có logic, dễ theo dõi</li>
                            <li>• <strong>Thể hiện năng lực:</strong> Chứng minh kỹ năng qua ví dụ thực tế</li>
                            <li>• <strong>Tạo ấn tượng:</strong> Cho thấy tư duy có hệ thống và chuyên nghiệp</li>
                            <li>• <strong>Dễ nhớ:</strong> Công thức đơn giản, áp dụng được cho mọi câu hỏi</li>
                        </ul>
                    </div>

                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2"> Mẹo áp dụng hiệu quả:</h4>
                        <ul className="text-sm text-green-800 space-y-1">
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