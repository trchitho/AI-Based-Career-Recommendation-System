import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ScoreTooltipProps {
    score: number;
    skillName: string;
    className?: string;
}

const ScoreTooltip: React.FC<ScoreTooltipProps> = ({ score, skillName, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);

    const getScoreLevel = (score: number) => {
        if (score >= 9) return { level: 'Xuất sắc', color: 'text-indigo-800', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' };
        if (score >= 8) return { level: 'Tốt', color: 'text-indigo-800', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' };
        if (score >= 7) return { level: 'Khá', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
        if (score >= 6) return { level: 'Trung bình khá', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
        if (score >= 5) return { level: 'Trung bình', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
        if (score >= 4) return { level: 'Yếu', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
        return { level: 'Rất yếu', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    };

    const scoreInfo = getScoreLevel(score);

    const scoreDescriptions = [
        { range: '9-10', level: 'Xuất sắc', description: 'Thể hiện kỹ năng vượt trội, có thể làm mentor cho người khác' },
        { range: '8-8.9', level: 'Tốt', description: 'Kỹ năng tốt, có thể xử lý các tình huống phức tạp một cách hiệu quả' },
        { range: '7-7.9', level: 'Khá', description: 'Kỹ năng ở mức khá, đáp ứng được yêu cầu công việc' },
        { range: '6-6.9', level: 'Trung bình khá', description: 'Có nền tảng cơ bản, cần phát triển thêm để đạt hiệu quả cao' },
        { range: '5-5.9', level: 'Trung bình', description: 'Kỹ năng cơ bản, cần hướng dẫn và thực hành thêm' },
        { range: '4-4.9', level: 'Yếu', description: 'Kỹ năng chưa đáp ứng yêu cầu, cần đào tạo và phát triển' },
        { range: '1-3.9', level: 'Rất yếu', description: 'Cần học hỏi và rèn luyện cơ bản từ đầu' }
    ];

    return (
        <div className={`relative inline-block ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
                <HelpCircle className="h-4 w-4" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Tooltip */}
                    <div className="absolute right-0 top-6 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">Thang điểm đánh giá</h4>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Current Score */}
                        <div className={`p-3 rounded-lg border ${scoreInfo.bgColor} ${scoreInfo.borderColor} mb-4`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">{skillName}</span>
                                <span className={`font-bold ${scoreInfo.color}`}>{score}/10</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${scoreInfo.color}`}>{scoreInfo.level}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${score >= 8 ? 'bg-indigo-700' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${score * 10}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Score Scale */}
                        <div className="space-y-2">
                            <h5 className="font-medium text-gray-900 text-sm">Thang điểm chi tiết:</h5>
                            {scoreDescriptions.map((item, index) => (
                                <div
                                    key={index}
                                    className={`p-2 rounded text-xs ${score >= parseFloat(item.range.split('-')[0]) && score <= parseFloat(item.range.split('-')[1])
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{item.range} điểm</span>
                                        <span className={`font-medium ${item.level === 'Xuất sắc' || item.level === 'Tốt' ? 'text-indigo-800' :
                                                item.level === 'Khá' ? 'text-blue-600' :
                                                    item.level.includes('Trung bình') ? 'text-yellow-600' :
                                                        'text-red-600'
                                            }`}>
                                            {item.level}
                                        </span>
                                    </div>
                                    <p className="text-gray-600">{item.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-800">
                                <strong>Lưu ý:</strong> Điểm số được AI đánh giá dựa trên nội dung câu trả lời,
                                tính logic, kinh nghiệm thực tế và cách diễn đạt. Đây là tham khảo để bạn cải thiện kỹ năng.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ScoreTooltip;