/**
 * RIASECPage5CareerMatches - Your Top Career Matches page
 * 
 * Shows career recommendations with details from DB
 * Based on Truity Career Personality Profiler format
 */

export interface CareerMatchData {
    career_id: string;
    onet_code?: string | undefined;
    title: string;
    description?: string | undefined;
    match_score: number;
    tags: string[];
    tasks?: string[];
    salary_avg?: number;
    growth_label?: string;
}

interface RIASECPage5CareerMatchesProps {
    careers: CareerMatchData[];
    pageNumber: number; // 1 = first 5 careers, 2 = next 5 careers
}

const formatSalary = (salary?: number): string => {
    if (!salary) return 'N/A';
    if (salary >= 1000000) {
        return `$${(salary / 1000000).toFixed(0)}M`;
    }
    return `$${(salary / 1000).toFixed(0)}K`;
};

const RIASECPage5CareerMatches = ({ careers, pageNumber }: RIASECPage5CareerMatchesProps) => {
    // Get careers for this page (5 per page)
    const startIdx = (pageNumber - 1) * 5;
    const pageCareers = careers.slice(startIdx, startIdx + 5);

    const isFirstPage = pageNumber === 1;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 print:text-lg">
                {isFirstPage ? 'Nghề Nghiệp Phù Hợp Nhất Của Bạn' : 'Thêm Nghề Nghiệp Để Khám Phá'}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 print:text-[10px] print:mb-3">
                {isFirstPage
                    ? 'Danh sách này bao gồm các nghề nghiệp phù hợp nhất với hồ sơ sở thích của bạn.'
                    : 'Đây là các nghề nghiệp bổ sung cũng có thể phù hợp với sở thích của bạn.'}
            </p>

            {/* Career List */}
            <div className="flex-1 space-y-4 overflow-auto print:space-y-3">
                {pageCareers.map((career, index) => (
                    <div
                        key={career.career_id}
                        className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 print:pb-2"
                    >
                        {/* Career Header */}
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white print:text-xs">
                                {startIdx + index + 1}. {career.title}
                            </h3>
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-400 px-2 py-0.5 rounded-full print:text-[8px]">
                                {Math.round(career.match_score)}% Phù Hợp
                            </span>
                        </div>

                        {/* Tags */}
                        {career.tags && career.tags.length > 0 && (
                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 print:text-[8px]">
                                {career.tags.slice(0, 3).join(', ')}
                            </p>
                        )}

                        {/* Salary & Growth */}
                        <div className="flex gap-4 text-[10px] text-gray-500 dark:text-gray-400 mb-2 print:text-[8px]">
                            {career.salary_avg && (
                                <span>Thu Nhập Trung Bình: {formatSalary(career.salary_avg)}</span>
                            )}
                            {career.growth_label && (
                                <span>Tăng Trưởng Dự Kiến: {career.growth_label}</span>
                            )}
                        </div>

                        {/* Description */}
                        {career.description && (
                            <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-2 leading-snug print:text-[9px]">
                                {career.description.length > 200
                                    ? career.description.substring(0, 200) + '...'
                                    : career.description}
                            </p>
                        )}

                        {/* Tasks */}
                        {career.tasks && career.tasks.length > 0 && (
                            <div>
                                <p className="text-[9px] font-medium text-gray-700 dark:text-gray-300 mb-0.5 print:text-[8px]">
                                    Nhiệm vụ điển hình bao gồm:
                                </p>
                                <ul className="text-[9px] text-gray-500 dark:text-gray-400 grid grid-cols-2 gap-x-2 print:text-[8px]">
                                    {career.tasks.slice(0, 6).map((task, i) => (
                                        <li key={i} className="truncate">• {task}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RIASECPage5CareerMatches;
