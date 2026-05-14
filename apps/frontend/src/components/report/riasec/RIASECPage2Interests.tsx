/**
 * RIASECPage2Interests - Your Career Interests page
 * 
 * Shows horizontal bar chart + 6 interest area descriptions
 * Based on Truity Career Personality Profiler format
 */

import { ScoreItem } from '../../../services/reportService';

interface RIASECPage2InterestsProps {
    scores: ScoreItem[];
}

// RIASEC display names mapping to Truity style
const INTEREST_NAMES: Record<string, string> = {
    realistic: 'Xây Dựng',
    investigative: 'Tư Duy',
    artistic: 'Sáng Tạo',
    social: 'Hỗ Trợ',
    enterprising: 'Thuyết Phục',
    conventional: 'Tổ Chức',
};

// Full descriptions for each interest area
const INTEREST_DESCRIPTIONS: Record<string, string> = {
    realistic: 'Công việc Xây Dựng liên quan đến việc sử dụng công cụ, máy móc hoặc kỹ năng thể chất. Người thuộc nhóm này thích làm việc bằng tay và cơ thể, làm việc với cây cối và động vật, và làm việc ngoài trời.',
    investigative: 'Công việc Tư Duy liên quan đến lý thuyết, nghiên cứu và khám phá trí tuệ. Người thuộc nhóm này thích làm việc với ý tưởng và khái niệm, và yêu thích khoa học, công nghệ và học thuật.',
    artistic: 'Công việc Sáng Tạo liên quan đến nghệ thuật, thiết kế, ngôn ngữ và tự biểu đạt. Người thuộc nhóm này thích làm việc trong môi trường không có cấu trúc cứng nhắc và tạo ra những sản phẩm độc đáo.',
    social: 'Công việc Hỗ Trợ liên quan đến việc giúp đỡ, giảng dạy, huấn luyện và phục vụ người khác. Người thuộc nhóm này thích làm việc trong môi trường hợp tác để cải thiện cuộc sống của người khác.',
    enterprising: 'Công việc Thuyết Phục liên quan đến việc lãnh đạo, thúc đẩy và ảnh hưởng đến người khác. Người thuộc nhóm này thích làm việc ở vị trí có quyền lực để đưa ra quyết định và thực hiện dự án.',
    conventional: 'Công việc Tổ Chức liên quan đến quản lý dữ liệu, thông tin và quy trình. Người thuộc nhóm này thích làm việc trong môi trường có cấu trúc để hoàn thành nhiệm vụ với độ chính xác và cẩn thận.',
};

const BAR_COLORS: Record<string, string> = {
    realistic: 'bg-amber-600',
    investigative: 'bg-blue-600',
    artistic: 'bg-purple-600',
    social: 'bg-indigo-800',
    enterprising: 'bg-red-600',
    conventional: 'bg-gray-600',
};

const RIASECPage2Interests = ({ scores }: RIASECPage2InterestsProps) => {
    // Sort by score descending for bar chart
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);

    // Fixed order for descriptions (RIASEC order mapped to Truity names)
    const orderedTraits = ['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional'];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 print:text-2xl">
                Sở Thích Nghề Nghiệp Của Bạn
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 mb-6 print:text-sm print:mb-4">
                Phần này cho thấy các lĩnh vực sở thích nghề nghiệp hàng đầu của bạn. Có tổng cộng 6 lĩnh vực sở thích, mỗi lĩnh vực có tập hợp các nhiệm vụ công việc, vai trò và giá trị điển hình riêng. Chọn nghề nghiệp phù hợp với hồ sơ sở thích của bạn đảm bảo rằng bạn thích thú với công việc hàng ngày.
            </p>

            {/* Horizontal Bar Chart */}
            <div className="mb-8 print:mb-6">
                <div className="space-y-3 print:space-y-2">
                    {sortedScores.map((item) => {
                        const traitKey = item.trait.toLowerCase();
                        const displayName = INTEREST_NAMES[traitKey] || item.trait;
                        const barColor = BAR_COLORS[traitKey] || 'bg-gray-500';
                        const scoreValue = Math.round(item.score);

                        return (
                            <div key={item.trait} className="flex items-center gap-4">
                                <span className="w-24 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right print:text-xs print:w-20">
                                    {displayName}
                                </span>
                                <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-700 rounded print:h-5">
                                    <div
                                        className={`h-full ${barColor} rounded flex items-center justify-end pr-3`}
                                        style={{ width: `${scoreValue}%` }}
                                    >
                                        {scoreValue > 15 && (
                                            <span className="text-sm font-bold text-white print:text-xs">
                                                {scoreValue}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {scoreValue <= 15 && (
                                    <span className="text-sm font-medium text-gray-500 print:text-xs w-8">
                                        {scoreValue}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Scale */}
                <div className="flex justify-end mt-2 text-xs text-gray-400 print:text-[10px]">
                    <span>0</span>
                    <span className="ml-auto mr-0">100</span>
                </div>
            </div>

            {/* The Six Interest Areas */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 print:text-lg">
                Sáu Lĩnh Vực Sở Thích
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 print:text-xs print:mb-3">
                Mỗi trong sáu lĩnh vực sở thích mô tả một nhóm các nhiệm vụ và hoạt động công việc liên quan. Những người bị thu hút bởi mỗi lĩnh vực sở thích này thường có những đặc điểm, sở thích và tính cách chung.
            </p>

            {/* Interest Descriptions Grid */}
            <div className="grid grid-cols-1 gap-3 print:gap-2 flex-1 overflow-auto">
                {orderedTraits.map((traitKey) => {
                    const displayName = INTEREST_NAMES[traitKey] || traitKey;
                    const description = INTEREST_DESCRIPTIONS[traitKey] || '';

                    return (
                        <div key={traitKey} className="flex gap-4 print:gap-3">
                            <span className="font-bold text-base text-gray-900 dark:text-white w-24 flex-shrink-0 print:text-sm print:w-20">
                                {displayName}
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed print:text-xs">
                                {description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RIASECPage2Interests;
