/**
 * RIASECContent - RIASEC scores visualization and interpretation
 * 
 * Print-optimized layout matching Big5 style
 */

import { ScoreItem } from '../../../services/reportService';
import { getRIASECFullName } from '../../../utils/riasec';

interface RIASECContentProps {
    scores: ScoreItem[];
}

const DIMENSION_COLORS: Record<string, { bar: string; bg: string }> = {
    realistic: { bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    investigative: { bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    artistic: { bar: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    social: { bar: 'bg-indigo-700', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
    enterprising: { bar: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    conventional: { bar: 'bg-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/50' },
};

const DESCRIPTIONS: Record<string, { high: string; low: string }> = {
    realistic: {
        high: 'Bạn thích công việc thực hành, thực tế với công cụ, máy móc hoặc các hoạt động thể chất.',
        low: 'Bạn có thể thích các nhiệm vụ khái niệm hoặc giao tiếp hơn là công việc thể chất.',
    },
    investigative: {
        high: 'Bạn thích phân tích vấn đề, tiến hành nghiên cứu và khám phá ý tưởng.',
        low: 'Bạn có thể thích ứng dụng thực tế hơn là khám phá lý thuyết.',
    },
    artistic: {
        high: 'Bạn đề cao sự sáng tạo, tự biểu đạt và tính độc đáo trong công việc.',
        low: 'Bạn có thể thích công việc có cấu trúc, có thể dự đoán hơn là sự mơ hồ sáng tạo.',
    },
    social: {
        high: 'Bạn thích giúp đỡ, giảng dạy và làm việc với người khác.',
        low: 'Bạn có thể thích làm việc độc lập hơn là tương tác xã hội nhiều.',
    },
    enterprising: {
        high: 'Bạn bị thu hút bởi lãnh đạo, thuyết phục và các dự án kinh doanh.',
        low: 'Bạn có thể thích các vai trò hợp tác hoặc hỗ trợ hơn là lãnh đạo.',
    },
    conventional: {
        high: 'Bạn đề cao tổ chức, độ chính xác và các phương pháp có hệ thống.',
        low: 'Bạn có thể thích sự linh hoạt và đa dạng hơn là thói quen và cấu trúc.',
    },
};

const RIASECContent = ({ scores }: RIASECContentProps) => {
    // Sort scores by value descending
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const topInterests = sortedScores.slice(0, 3);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Pattern Summary */}
            <section className="mb-5 print:mb-4 flex-shrink-0">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3 print:text-lg print:mb-2">
                    Mẫu Sở Thích Của Bạn
                </h2>
                <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800/30 print:p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 print:text-xs print:mb-2">
                        Sở thích nghề nghiệp hàng đầu của bạn là:
                    </p>
                    <div className="flex flex-wrap gap-2 print:gap-1.5">
                        {topInterests.map((item, index) => (
                            <span
                                key={item.trait}
                                className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-indigo-200 dark:border-indigo-800 print:px-2 print:py-1"
                            >
                                <span className="font-bold text-indigo-900 dark:text-indigo-400 text-sm print:text-xs">
                                    {index + 1}. {getRIASECFullName(item.trait)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-1.5 text-xs print:text-[10px]">
                                    ({Math.round(item.score)}%)
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Score Bars */}
            <section className="mb-5 print:mb-4 flex-shrink-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 print:text-sm print:mb-2">
                    Điểm Số RIASEC
                </h2>
                <div className="space-y-2.5 print:space-y-2">
                    {sortedScores.map((item) => {
                        const colors = DIMENSION_COLORS[item.trait.toLowerCase()] || DIMENSION_COLORS['conventional'];
                        const isTop = topInterests.some(t => t.trait === item.trait);

                        return (
                            <div key={item.trait} className={isTop ? 'opacity-100' : 'opacity-70'}>
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className={`font-semibold text-xs print:text-[10px] ${isTop ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {getRIASECFullName(item.trait)}
                                        {isTop && (
                                            <span className="ml-1.5 text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-400 px-1.5 py-0.5 rounded-full print:text-[8px]">
                                                Hàng đầu
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 print:text-[10px]">
                                        {Math.round(item.score)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden print:h-1.5">
                                    <div
                                        className={`h-full ${colors?.bar || 'bg-gray-500'} rounded-full`}
                                        style={{ width: `${item.score}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Interpretations */}
            <section className="flex-1 overflow-hidden">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 print:text-sm print:mb-2 flex-shrink-0">
                    Ý Nghĩa Sở Thích Của Bạn
                </h2>
                <div className="grid gap-2 grid-cols-2 print:gap-1.5">
                    {sortedScores.slice(0, 4).map((item) => {
                        const colors = DIMENSION_COLORS[item.trait.toLowerCase()] || DIMENSION_COLORS['conventional'];
                        const desc = DESCRIPTIONS[item.trait.toLowerCase()];
                        const isHigh = item.score >= 50;

                        return (
                            <div key={item.trait} className={`p-3 rounded-lg print:p-2 ${colors?.bg || 'bg-gray-50'}`}>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-xs print:text-[10px]">
                                    {getRIASECFullName(item.trait)}
                                </h3>
                                <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-snug print:text-[9px]">
                                    {isHigh ? desc?.high : desc?.low}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default RIASECContent;
