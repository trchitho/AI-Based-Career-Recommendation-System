/**
 * RIASECPage3TopInterests - Your Top Interests page
 * 
 * Shows detailed info for top 2 interests with:
 * - Top Job Tasks
 * - Your Core Values
 * - Key Personality Traits
 * - Detailed description
 * - Sample Jobs, Career Fields, Areas of Study
 */

import { ScoreItem } from '../../../services/reportService';

interface RIASECPage3TopInterestsProps {
    scores: ScoreItem[];
}

// RIASEC display names
const INTEREST_NAMES: Record<string, string> = {
    realistic: 'Xây Dựng',
    investigative: 'Tư Duy',
    artistic: 'Sáng Tạo',
    social: 'Hỗ Trợ',
    enterprising: 'Thuyết Phục',
    conventional: 'Tổ Chức',
};

// Detailed data for each interest type
const INTEREST_DATA: Record<string, {
    topTasks: string[];
    coreValues: string[];
    traits: string[];
    description: string;
    satisfyText: string;
    sampleJobs: string[];
    careerFields: string[];
    areasOfStudy: string[];
}> = {
    realistic: {
        topTasks: ['Xây dựng', 'Sửa chữa', 'Vận hành máy móc', 'Làm việc ngoài trời', 'Lao động thể chất'],
        coreValues: ['Thực tiễn', 'Độc lập', 'Kỹ năng thể chất', 'Kết quả hữu hình', 'Thiên nhiên'],
        traits: ['Thực tế', 'Cơ khí', 'Thể thao', 'Thực hành', 'Thẳng thắn'],
        description: 'Vì bạn là người thuộc nhóm Xây Dựng, bạn thường hướng đến các vai trò cho phép làm việc bằng tay, công cụ hoặc máy móc. Bạn sẽ tìm thấy môi trường tự nhiên trong các công việc tạo ra kết quả hữu hình, và sẽ thích bất kỳ vai trò nào mà bạn có thể thấy kết quả vật lý từ công việc của mình.',
        satisfyText: 'Để thỏa mãn sở thích Xây Dựng, hãy tìm kiếm nghề nghiệp cho phép bạn làm việc với các vật thể vật lý và thấy kết quả cụ thể. Bạn sẽ hạnh phúc nhất khi có thể dùng tay và cơ thể để tạo ra, sửa chữa hoặc vận hành.',
        sampleJobs: ['Thợ mộc', 'Thợ điện', 'Thợ cơ khí', 'Kỹ sư', 'Nông dân'],
        careerFields: ['Xây dựng', 'Sản xuất', 'Nông nghiệp', 'Vận tải', 'Kỹ thuật'],
        areasOfStudy: ['Kỹ thuật', 'Nông nghiệp', 'Nghệ thuật ẩm thực', 'Hàng không', 'Nghề thủ công'],
    },
    investigative: {
        topTasks: ['Nghiên cứu', 'Phân tích', 'Giải quyết vấn đề', 'Thử nghiệm', 'Lý thuyết hóa'],
        coreValues: ['Kiến thức', 'Khám phá', 'Logic', 'Độc lập', 'Chuyên môn'],
        traits: ['Phân tích', 'Tò mò', 'Trí tuệ', 'Kín đáo', 'Chính xác'],
        description: 'Vì bạn là người thuộc nhóm Tư Duy, bạn thường hướng đến các vai trò cho phép nghiên cứu, phân tích và giải quyết các vấn đề phức tạp. Bạn sẽ tìm thấy môi trường tự nhiên trong các môi trường học thuật, khoa học hoặc kỹ thuật nơi bạn có thể theo đuổi kiến thức và hiểu biết.',
        satisfyText: 'Để thỏa mãn sở thích Tư Duy, hãy tìm kiếm nghề nghiệp cho phép bạn điều tra, phân tích và giải quyết vấn đề. Bạn sẽ hạnh phúc nhất khi có thể dùng trí tuệ để khám phá kiến thức mới hoặc phát triển các giải pháp sáng tạo.',
        sampleJobs: ['Nhà khoa học', 'Nhà nghiên cứu', 'Bác sĩ', 'Giáo sư', 'Nhà phân tích dữ liệu'],
        careerFields: ['Khoa học', 'Công nghệ', 'Y tế', 'Học thuật', 'Nghiên cứu'],
        areasOfStudy: ['Khoa học', 'Toán học', 'Y học', 'Khoa học máy tính', 'Kỹ thuật'],
    },
    artistic: {
        topTasks: ['Sáng tạo', 'Thiết kế', 'Biểu diễn', 'Viết lách', 'Biểu đạt'],
        coreValues: ['Sáng tạo', 'Độc đáo', 'Tự biểu đạt', 'Vẻ đẹp', 'Độc lập'],
        traits: ['Sáng tạo', 'Tưởng tượng', 'Biểu cảm', 'Phi truyền thống', 'Nhạy cảm'],
        description: 'Vì bạn là người thuộc nhóm Sáng Tạo, bạn thường hướng đến các vai trò cho phép sử dụng tài năng sáng tạo và biểu đạt nghệ thuật. Bạn sẽ tìm thấy môi trường tự nhiên trong các môi trường đề cao sự độc đáo và cho phép bạn tạo ra những tác phẩm riêng biệt.',
        satisfyText: 'Để thỏa mãn sở thích Sáng Tạo, hãy tìm kiếm nghề nghiệp cho phép bạn tự do biểu đạt bản thân. Bạn sẽ hạnh phúc nhất khi có thể tưởng tượng, hình dung, thử nghiệm và sáng tạo.',
        sampleJobs: ['Nghệ sĩ', 'Nhà thiết kế', 'Nhà văn', 'Nhạc sĩ', 'Kiến trúc sư'],
        careerFields: ['Nghệ thuật', 'Thiết kế', 'Truyền thông', 'Giải trí', 'Kiến trúc'],
        areasOfStudy: ['Mỹ thuật', 'Thiết kế', 'Âm nhạc', 'Sân khấu', 'Viết sáng tạo'],
    },
    social: {
        topTasks: ['Giảng dạy', 'Tư vấn', 'Giúp đỡ', 'Chăm sóc', 'Giao tiếp'],
        coreValues: ['Phục vụ', 'Hợp tác', 'Đồng cảm', 'Cộng đồng', 'Tạo ra sự khác biệt'],
        traits: ['Hữu ích', 'Thân thiện', 'Đồng cảm', 'Kiên nhẫn', 'Hợp tác'],
        description: 'Vì bạn là người thuộc nhóm Hỗ Trợ, bạn thường hướng đến các vai trò cho phép giúp đỡ, giảng dạy hoặc chăm sóc người khác. Bạn sẽ tìm thấy môi trường tự nhiên trong các môi trường hợp tác nơi bạn có thể tạo ra tác động tích cực đến cuộc sống của mọi người.',
        satisfyText: 'Để thỏa mãn sở thích Hỗ Trợ, hãy tìm kiếm nghề nghiệp cho phép bạn làm việc gần gũi với mọi người và đóng góp vào sự phát triển của họ. Bạn sẽ hạnh phúc nhất khi có thể thấy tác động tích cực từ công việc của mình đối với người khác.',
        sampleJobs: ['Giáo viên', 'Tư vấn viên', 'Y tá', 'Nhân viên xã hội', 'Nhà trị liệu'],
        careerFields: ['Giáo dục', 'Y tế', 'Dịch vụ xã hội', 'Tư vấn', 'Nhân sự'],
        areasOfStudy: ['Giáo dục', 'Tâm lý học', 'Điều dưỡng', 'Công tác xã hội', 'Tư vấn'],
    },
    enterprising: {
        topTasks: ['Quản lý', 'Ra quyết định', 'Lập chiến lược', 'Bán hàng', 'Thúc đẩy'],
        coreValues: ['Ảnh hưởng', 'Lãnh đạo', 'Chấp nhận rủi ro', 'Thành tích', 'Chủ động'],
        traits: ['Quyết đoán', 'Năng động', 'Tự tin', 'Tham vọng', 'Phiêu lưu'],
        description: 'Vì bạn là người thuộc nhóm Thuyết Phục, bạn thường hướng đến các vai trò cho phép bán hàng, lãnh đạo, ảnh hưởng, thúc đẩy và chỉ đạo người khác. Bạn sẽ tìm thấy môi trường tự nhiên trong thế giới kinh doanh, nhưng sẽ thích bất kỳ vai trò nào mà bạn có thể đặt ra hướng đi và dùng sự khéo léo và ảnh hưởng để đạt được mục tiêu.',
        satisfyText: 'Để thỏa mãn sở thích Thuyết Phục, hãy tìm kiếm nghề nghiệp nơi bạn có thể dẫn đầu để khởi xướng và thực hiện các sáng kiến, hành động nhanh chóng và quyết đoán để định hướng, và dùng sức hút của mình để ảnh hưởng đến người khác.',
        sampleJobs: ['Giám đốc điều hành', 'Luật sư', 'Giám đốc kinh doanh', 'Doanh nhân', 'Cố vấn tài chính'],
        careerFields: ['Kinh doanh', 'Marketing', 'Khởi nghiệp', 'Quản lý', 'Pháp lý'],
        areasOfStudy: ['Quản trị kinh doanh', 'Marketing', 'Luật', 'Truyền thông', 'Khoa học chính trị'],
    },
    conventional: {
        topTasks: ['Tổ chức', 'Xử lý', 'Ghi chép', 'Tính toán', 'Lưu trữ'],
        coreValues: ['Chính xác', 'Ổn định', 'Hiệu quả', 'Trật tự', 'Đáng tin cậy'],
        traits: ['Có tổ chức', 'Chú ý đến chi tiết', 'Đáng tin cậy', 'Có phương pháp', 'Cẩn thận'],
        description: 'Vì bạn là người thuộc nhóm Tổ Chức, bạn thường hướng đến các vai trò cho phép quản lý dữ liệu, thông tin và quy trình. Bạn sẽ tìm thấy môi trường tự nhiên trong các môi trường có cấu trúc nơi bạn có thể hoàn thành nhiệm vụ với độ chính xác và cẩn thận.',
        satisfyText: 'Để thỏa mãn sở thích Tổ Chức, hãy tìm kiếm nghề nghiệp cho phép bạn làm việc với dữ liệu và hệ thống trong môi trường có cấu trúc. Bạn sẽ hạnh phúc nhất khi có thể mang lại trật tự và hiệu quả cho công việc của mình.',
        sampleJobs: ['Kế toán', 'Quản trị viên', 'Nhà phân tích', 'Nhân viên ngân hàng', 'Quản lý văn phòng'],
        careerFields: ['Tài chính', 'Kế toán', 'Hành chính', 'Ngân hàng', 'Bảo hiểm'],
        areasOfStudy: ['Kế toán', 'Tài chính', 'Quản trị kinh doanh', 'Hệ thống thông tin'],
    },
};

const RIASECPage3TopInterests = ({ scores }: RIASECPage3TopInterestsProps) => {
    // Get top 2 interests
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const top2 = sortedScores.slice(0, 2);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 print:text-2xl print:mb-3">
                Sở Thích Hàng Đầu Của Bạn
            </h2>

            {/* Top 2 Interest Sections */}
            <div className="flex-1 space-y-6 overflow-auto print:space-y-4">
                {top2.map((item, index) => {
                    const traitKey = item.trait.toLowerCase();
                    const displayName = INTEREST_NAMES[traitKey] || item.trait;
                    const data = INTEREST_DATA[traitKey];

                    if (!data) return null;

                    return (
                        <div key={item.trait} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 print:pb-4">
                            {/* Interest Header */}
                            <p className="text-base text-gray-700 dark:text-gray-300 mb-3 leading-relaxed print:text-sm">
                                Lĩnh vực sở thích {index === 0 ? 'hàng đầu' : 'thứ hai'} của bạn là <span className="font-bold text-gray-900 dark:text-white text-lg">{displayName}</span>. {data.description}
                            </p>

                            {/* Three Columns: Tasks, Values, Traits */}
                            <div className="grid grid-cols-3 gap-6 my-4 print:gap-4 print:my-3">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 print:text-xs">
                                        Nhiệm Vụ Công Việc Hàng Đầu
                                    </h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 print:text-xs">
                                        {data.topTasks.map((task, i) => (
                                            <li key={i}>• {task}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 print:text-xs">
                                        Giá Trị Cốt Lõi Của Bạn
                                    </h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 print:text-xs">
                                        {data.coreValues.map((value, i) => (
                                            <li key={i}>• {value}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 print:text-xs">
                                        Đặc Điểm Tính Cách Chính
                                    </h4>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 print:text-xs">
                                        {data.traits.map((trait, i) => (
                                            <li key={i}>• {trait}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed print:text-xs">
                                {data.description}
                            </p>

                            {/* Satisfy Text */}
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed print:text-xs">
                                {data.satisfyText}
                            </p>

                            {/* Sample Jobs, Career Fields, Areas of Study */}
                            <div className="grid grid-cols-3 gap-6 mt-3 print:gap-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 print:text-[10px]">
                                        Công Việc Mẫu
                                    </h4>
                                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 print:text-[10px]">
                                        {data.sampleJobs.map((job, i) => (
                                            <li key={i}>• {job}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 print:text-[10px]">
                                        Lĩnh Vực Nghề Nghiệp
                                    </h4>
                                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 print:text-[10px]">
                                        {data.careerFields.map((field, i) => (
                                            <li key={i}>• {field}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 print:text-[10px]">
                                        Lĩnh Vực Học Tập
                                    </h4>
                                    <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 print:text-[10px]">
                                        {data.areasOfStudy.map((area, i) => (
                                            <li key={i}>• {area}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RIASECPage3TopInterests;
