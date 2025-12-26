/**
 * RIASECCareerDetailPage - Single Career Full Page (1 career = 1 page)
 *
 * Shows one career per page with rich content from 5 DB tables:
 * - career_overview (salary, degree_text)
 * - career_tasks (key tasks)
 * - career_ksas (skills, knowledge, abilities)
 * - career_technology (tools/tech)
 * - career_outlook (growth, summary)
 * 
 * OPTIMIZED FOR PDF: Content fits within A4 page without overflow
 */

export interface CareerFullData {
    career_id: string;
    onet_code?: string;
    title: string;
    description?: string;
    match_score: number;
    tags: string[];
    tasks: string[];
    skills: Array<{ name: string; level: number; importance: number }>;
    knowledge: Array<{ name: string; level: number; importance: number }>;
    abilities: Array<{ name: string; level: number; importance: number }>;
    technologies: Array<{ category: string; name: string; hot_flag: boolean }>;
    growth_label?: string;
    education_req?: string;
    outlook_summary?: string;
    salary_min?: number;
    salary_max?: number;
    salary_avg?: number;
}

interface RIASECCareerDetailPageProps {
    career: CareerFullData;
    rank: number;
    sectionTitle?: string | undefined;
}

const formatSalary = (salary?: number): string => {
    if (!salary) return 'N/A';
    if (salary >= 1000000) {
        return `${(salary / 1000000).toFixed(1)}M`;
    }
    if (salary >= 1000) {
        return `${(salary / 1000).toFixed(0)}K`;
    }
    return `${salary.toLocaleString()}`;
};

// Truncate text to fit within space
const truncateText = (text: string, maxLength: number): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
};

const RIASECCareerDetailPage = ({ career, rank, sectionTitle }: RIASECCareerDetailPageProps) => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Section Title - only for first career in each group */}
            {sectionTitle && (
                <div className="mb-3 print:mb-2 flex-shrink-0">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white print:text-lg">
                        {sectionTitle}
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 print:text-[10px]">
                        {sectionTitle === 'Your Top Career Matches'
                            ? 'These careers best match your interest profile based on your RIASEC assessment results.'
                            : 'Additional careers that align well with your interests and may be worth exploring.'}
                    </p>
                </div>
            )}

            {/* Career Header */}
            <div className="flex justify-between items-start mb-3 print:mb-2 pb-2 border-b border-green-500 dark:border-green-400 flex-shrink-0">
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white print:text-base leading-tight">
                        {rank}. {career.title}
                    </h2>
                    {career.onet_code && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 print:text-[9px]">
                            O*NET Code: {career.onet_code}
                        </p>
                    )}
                </div>
                <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-semibold shadow-sm print:text-[10px]">
                    {Math.round(career.match_score)}% Match
                </span>
            </div>

            {/* Interest Tags - Compact */}
            {career.tags && career.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 print:mb-2 flex-shrink-0">
                    {career.tags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium print:text-[9px]">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Career Overview - Compact */}
            <div className="mb-3 print:mb-2 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5 print:text-xs">
                    <span className="w-1 h-3 bg-blue-500 rounded"></span>
                    Career Overview
                </h3>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed print:text-[10px] print:leading-snug">
                    {truncateText(career.description || 'No description available for this career.', 280)}
                </p>
            </div>

            {/* Quick Stats - 3 columns - Compact */}
            <div className="grid grid-cols-3 gap-2 mb-3 print:mb-2 print:gap-1.5 flex-shrink-0">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg p-2 print:p-1.5">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide print:text-[9px]">Average Salary</p>
                    <p className="text-base font-bold text-blue-700 dark:text-blue-300 print:text-sm">{formatSalary(career.salary_avg)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-lg p-2 print:p-1.5">
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wide print:text-[9px]">Job Growth</p>
                    <p className="text-base font-bold text-green-700 dark:text-green-300 print:text-sm">{career.growth_label || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-lg p-2 print:p-1.5">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide print:text-[9px]">Education</p>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 print:text-[10px] leading-tight">{truncateText(career.education_req || 'N/A', 50)}</p>
                </div>
            </div>

            {/* Two Column Layout - Flex grow to fill remaining space */}
            <div className="grid grid-cols-2 gap-3 flex-1 print:gap-2 overflow-hidden">
                {/* Left Column */}
                <div className="space-y-2.5 print:space-y-2 overflow-hidden">
                    {/* Tasks */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5 print:text-xs print:mb-1">
                            <span className="w-1 h-3 bg-green-500 rounded"></span>
                            Typical Tasks
                        </h3>
                        {career.tasks && career.tasks.length > 0 ? (
                            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 print:text-[10px] print:space-y-0.5">
                                {career.tasks.slice(0, 4).map((task, i) => (
                                    <li key={i} className="flex items-start gap-1.5 leading-snug">
                                        <span className="text-green-500 mt-0.5 text-xs">•</span>
                                        <span className="line-clamp-2">{truncateText(task, 100)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic print:text-[10px]">Task information not available</p>
                        )}
                    </div>

                    {/* Knowledge */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5 print:text-xs print:mb-1">
                            <span className="w-1 h-3 bg-orange-500 rounded"></span>
                            Knowledge Areas
                        </h3>
                        {career.knowledge && career.knowledge.length > 0 ? (
                            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5 print:text-[10px]">
                                {career.knowledge.slice(0, 4).map((k, i) => (
                                    <li key={i} className="flex items-center gap-1.5">
                                        <span className="text-orange-500 text-xs">•</span>
                                        <span>{k.name}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic print:text-[10px]">Knowledge information not available</p>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2.5 print:space-y-2 overflow-hidden">
                    {/* Technologies */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5 print:text-xs print:mb-1">
                            <span className="w-1 h-3 bg-cyan-500 rounded"></span>
                            Technologies & Tools
                        </h3>
                        {career.technologies && career.technologies.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 print:gap-1">
                                {career.technologies.slice(0, 6).map((tech, i) => (
                                    <span
                                        key={i}
                                        className={`text-[10px] px-2 py-0.5 rounded font-medium print:text-[9px] ${tech.hot_flag
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        {tech.name}
                                        {tech.hot_flag && ' 🔥'}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic print:text-[10px]">Technology information not available</p>
                        )}
                    </div>

                    {/* Outlook */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5 print:text-xs print:mb-1">
                            <span className="w-1 h-3 bg-teal-500 rounded"></span>
                            Career Outlook
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 print:p-1.5">
                            {career.outlook_summary ? (
                                <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug print:text-[10px]">{truncateText(career.outlook_summary, 180)}</p>
                            ) : (
                                <div className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5 print:text-[10px]">
                                    <p><span className="font-medium">Growth:</span> {career.growth_label || 'Data not available'}</p>
                                    <p><span className="font-medium">Education:</span> {truncateText(career.education_req || 'Data not available', 60)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RIASECCareerDetailPage;
