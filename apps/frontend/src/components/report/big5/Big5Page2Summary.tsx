/**
 * Big5Page2Summary - Page 2: Behavioral Patterns Summary
 * 
 * Shows 6 behavioral pattern cards (summary only, no charts)
 * Charts are displayed on pages 3-5
 * 
 * FIXED: Each summary card uses the color of its dominant trait
 */

import { NarrativeData, Facet } from '../../../services/reportService';

interface Big5Page2SummaryProps {
    narrative: NarrativeData;
    facets: Facet[];
}

// Facet display names for cards
const FACET_DISPLAY_NAMES: Record<string, string> = {
    problemSolving: 'Tư Duy & Giải Quyết',
    motivation: 'Động Lực',
    interaction: 'Tương Tác',
    communication: 'Giao Tiếp',
    teamwork: 'Làm Việc Nhóm',
    taskManagement: 'Quản Lý Công Việc',
};

// Fixed color mapping by trait name - matches QuadrantChart and FacetSection
// Each trait has a fixed color regardless of percentage
const TRAIT_COLORS: Record<string, { text: string; border: string; bg: string }> = {
    // Problem-Solving facet labels
    innovator: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    humanitarian: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    caretaker: { text: 'text-indigo-800 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
    pragmatist: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Motivation facet labels
    ambitious: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    excitable: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    dutiful: { text: 'text-indigo-800 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
    casual: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Interaction facet labels
    gregarious: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    dominant: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    supportive: { text: 'text-indigo-800 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
    independent: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Communication facet labels
    inspiring: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    informative: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    insightful: { text: 'text-indigo-800 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
    concise: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Teamwork facet labels
    taskmaster: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    empath: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    improviser: { text: 'text-indigo-800 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
    cooperator: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    // Task Management facet labels
    director: { text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    visionary: { text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    inspector: { text: 'text-indigo-800 dark:text-indigo-400', border: 'border-indigo-300 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
    responder: { text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
};

const DEFAULT_COLOR = { text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-700', bg: 'bg-gray-50 dark:bg-gray-800/50' };

// Vietnamese display names for facet labels
const LABEL_DISPLAY_NAMES: Record<string, string> = {
    innovator: 'Nhà Đổi Mới (Innovator)',
    humanitarian: 'Nhà Nhân Đạo (Humanitarian)',
    caretaker: 'Người Cẩn Trọng (Caretaker)',
    pragmatist: 'Người Thực Tế (Pragmatist)',
    ambitious: 'Tham Vọng (Ambitious)',
    excitable: 'Nhiệt Huyết (Excitable)',
    dutiful: 'Tận Tụy (Dutiful)',
    casual: 'Thoải Mái (Casual)',
    gregarious: 'Hòa Đồng (Gregarious)',
    dominant: 'Quyết Đoán (Dominant)',
    supportive: 'Hỗ Trợ (Supportive)',
    independent: 'Độc Lập (Independent)',
    inspiring: 'Truyền Cảm Hứng (Inspiring)',
    informative: 'Cung Cấp Thông Tin (Informative)',
    insightful: 'Sâu Sắc (Insightful)',
    concise: 'Ngắn Gọn (Concise)',
    taskmaster: 'Người Dẫn Dắt (Taskmaster)',
    empath: 'Đồng Cảm (Empath)',
    improviser: 'Ứng Biến (Improviser)',
    cooperator: 'Hợp Tác (Cooperator)',
    director: 'Người Điều Phối (Director)',
    visionary: 'Tầm Nhìn (Visionary)',
    inspector: 'Kiểm Soát (Inspector)',
    responder: 'Linh Hoạt (Responder)',
};

const getLabelDisplayName = (labelName: string): string => {
    const lowerName = labelName.toLowerCase();
    return LABEL_DISPLAY_NAMES[lowerName] || labelName;
};

// Get color by dominant trait name
const getTraitColor = (traitName: string) => {
    const lowerName = traitName.toLowerCase();
    return TRAIT_COLORS[lowerName] || DEFAULT_COLOR;
};

const Big5Page2Summary = ({ narrative, facets }: Big5Page2SummaryProps) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Section A: Your Career Personality Type */}
            <section className="mb-5 print:mb-4 flex-shrink-0">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 print:text-xl">
                    Loại Tính Cách Nghề Nghiệp Của Bạn
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-3 italic text-sm print:text-xs">
                    Điều gì thúc đẩy bạn? Bạn tiếp cận công việc và các mối quan hệ như thế nào?
                </p>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800/30 print:p-3">
                    <h3 className="text-2xl font-extrabold text-purple-700 dark:text-purple-400 mb-2 print:text-xl">
                        {narrative.type_name}
                    </h3>
                    <div className="space-y-2 text-gray-700 dark:text-gray-300 leading-relaxed text-sm print:text-xs print:space-y-1.5">
                        {narrative.paragraphs.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section B: Behavioral Patterns Overview */}
            <section className="flex-1 flex flex-col overflow-hidden">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 print:text-base flex-shrink-0">
                    Mẫu Hành Vi
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm print:text-xs print:mb-2 flex-shrink-0">
                    Tính cách của bạn thể hiện qua sáu lĩnh vực hành vi chính. Mỗi lĩnh vực cho thấy phong cách nổi trội của bạn
                    dựa trên các chiều tính cách Big Five.
                </p>

                {/* 6 Summary Cards - 2x3 Grid - Each card uses dominant trait's color */}
                <div className="grid grid-cols-3 gap-2 print:gap-1.5 flex-shrink-0">
                    {facets.map((facet) => {
                        const traitColor = getTraitColor(facet.dominant);
                        return (
                            <div
                                key={facet.name}
                                className={`rounded-lg p-3 border shadow-sm print:p-2 print:shadow-none ${traitColor.bg} ${traitColor.border}`}
                            >
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5 print:text-[10px]">
                                    {FACET_DISPLAY_NAMES[facet.name] || facet.title}
                                </p>
                                <p className={`text-lg font-bold print:text-base ${traitColor.text}`}>
                                    {getLabelDisplayName(facet.dominant)}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 print:text-xs">
                                    {facet.dominant_percent}%
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Note - Shortened */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic print:mt-2 print:text-[10px] flex-shrink-0">
                    Lưu ý: Các mẫu hành vi này được suy ra từ điểm số Big Five của bạn bằng
                    công thức ánh xạ heuristic. Biểu đồ chi tiết sẽ xuất hiện ở các trang tiếp theo.
                </p>
            </section>
        </div>
    );
};

export default Big5Page2Summary;
