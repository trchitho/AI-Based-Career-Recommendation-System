/**
 * RIASECPage7Guidance - Choosing the Right Career page
 * 
 * Shows career guidance content dynamically based on user's top interests
 * Based on Truity Career Personality Profiler format
 */

import { ScoreItem } from '../../../services/reportService';

interface RIASECPage7GuidanceProps {
    scores?: ScoreItem[];
}

// Dynamic content based on interest type
const INTEREST_GUIDANCE: Record<string, {
    coreNeeds: string[];
    preferredTasks: string[];
    keyQuestions: string[];
}> = {
    realistic: {
        coreNeeds: [
            'Làm việc bằng tay để tạo ra kết quả thực tế, hữu hình',
            'Sử dụng công cụ, máy móc hoặc kỹ năng thể chất trong công việc hàng ngày',
            'Thấy được kết quả cụ thể từ nỗ lực của mình',
            'Làm việc độc lập với ít sự giám sát',
        ],
        preferredTasks: [
            'Xây dựng, thi công hoặc chế tạo đồ vật',
            'Sửa chữa hoặc bảo trì thiết bị',
            'Vận hành máy móc hoặc công cụ',
            'Làm việc ngoài trời hoặc với thiên nhiên',
            'Lao động thể chất hoặc hoạt động thể thao',
            'Tạo ra thứ gì đó hữu hình và có ích',
        ],
        keyQuestions: [
            'Nghề nghiệp này có cho phép tôi làm việc bằng tay không?',
            'Tôi có thấy được kết quả hữu hình từ công việc của mình không?',
            'Nghề nghiệp này có liên quan đến giải quyết vấn đề thực tế không?',
            'Tôi có cơ hội làm việc độc lập không?',
        ],
    },
    investigative: {
        coreNeeds: [
            'Nghiên cứu và phân tích các vấn đề phức tạp',
            'Sử dụng logic và lý luận để đưa ra kết luận',
            'Phát triển chuyên môn trong lĩnh vực của mình',
            'Làm việc độc lập với các thách thức trí tuệ',
        ],
        preferredTasks: [
            'Nghiên cứu các nguyên lý và lý thuyết khoa học',
            'Thu thập và phân tích dữ liệu',
            'Phát triển và kiểm tra các giả thuyết',
            'Sử dụng logic và lý luận để đưa ra kết luận',
            'Đọc và học hỏi để tăng kiến thức',
            'Áp dụng chuyên môn để tìm ra giải pháp sáng tạo',
        ],
        keyQuestions: [
            'Nghề nghiệp này có cho phép tôi nghiên cứu và phân tích không?',
            'Tôi có được thách thức về mặt trí tuệ trong vai trò này không?',
            'Nghề nghiệp này có đề cao chuyên môn và kiến thức không?',
            'Tôi có cơ hội học hỏi liên tục không?',
        ],
    },
    artistic: {
        coreNeeds: [
            'Sử dụng tài năng sáng tạo để làm điều gì đó độc đáo và riêng biệt',
            'Biểu đạt ý tưởng, cảm xúc và trải nghiệm của mình',
            'Trải nghiệm các giác quan qua nghệ thuật, thiết kế, âm nhạc hoặc sân khấu',
            'Theo đuổi cảm hứng để tạo ra những gì chân thực với bản thân',
        ],
        preferredTasks: [
            'Làm việc với hình dạng, màu sắc, hoa văn hoặc các yếu tố thị giác',
            'Làm việc với phương tiện thẩm mỹ hoặc biểu đạt',
            'Tạo ra bản trình bày hoặc thiết kế hấp dẫn về mặt thị giác',
            'Đưa ra ý tưởng độc đáo với ít hướng dẫn',
            'Làm việc theo những gì truyền cảm hứng cho bạn vào lúc đó',
            'Sáng tạo, tưởng tượng và độc đáo',
        ],
        keyQuestions: [
            'Nghề nghiệp này có cho phép tôi sáng tạo và độc đáo không?',
            'Tôi có thể biểu đạt bản thân một cách chân thực không?',
            'Nghề nghiệp này có tận dụng tài năng sáng tạo của tôi không?',
            'Tôi có làm việc trong môi trường thẩm mỹ không?',
        ],
    },
    social: {
        coreNeeds: [
            'Giúp người khác cải thiện cuộc sống và sức khỏe của họ',
            'Làm việc hợp tác với người khác hướng đến mục tiêu chung',
            'Tạo ra sự khác biệt tích cực trong cộng đồng của mình',
            'Xây dựng các mối quan hệ có ý nghĩa thông qua công việc',
        ],
        preferredTasks: [
            'Giảng dạy hoặc đào tạo người khác',
            'Tư vấn hoặc hướng dẫn mọi người',
            'Chăm sóc nhu cầu thể chất hoặc cảm xúc của người khác',
            'Làm việc như một phần của nhóm',
            'Giao tiếp và xây dựng mối quan hệ',
            'Phục vụ cộng đồng hoặc giúp đỡ những người cần',
        ],
        keyQuestions: [
            'Nghề nghiệp này có cho phép tôi giúp đỡ người khác trực tiếp không?',
            'Tôi có làm việc gần gũi với mọi người trong vai trò này không?',
            'Nghề nghiệp này có tạo ra tác động tích cực đến người khác không?',
            'Tôi có là một phần của nhóm hỗ trợ và hợp tác không?',
        ],
    },
    enterprising: {
        coreNeeds: [
            'Sử dụng sức hút và khả năng thuyết phục để thúc đẩy và ảnh hưởng đến người khác',
            'Đặt ra mục tiêu thú vị và chấp nhận rủi ro để đạt được thành công',
            'Tăng quyền lực và vị thế trong lĩnh vực của mình',
            'Thúc đẩy ý tưởng mới và tác động đến các quyết định quan trọng',
        ],
        preferredTasks: [
            'Bán sản phẩm hoặc dịch vụ',
            'Lãnh đạo hoặc quản lý nhóm',
            'Trình bày ý tưởng hoặc sáng kiến',
            'Khởi nghiệp kinh doanh hoặc dự án mới',
            'Phát biểu trước đám đông',
            'Ảnh hưởng đến người khác theo cách suy nghĩ của bạn',
        ],
        keyQuestions: [
            'Nghề nghiệp này có cho phép tôi ảnh hưởng và thúc đẩy người khác không?',
            'Tôi có cảm thấy có quyền lực và quan trọng trong nghề nghiệp này không?',
            'Nghề nghiệp này có cho phép tôi chấp nhận rủi ro và theo đuổi thành tích thú vị không?',
            'Nghề nghiệp này có cho tôi nền tảng để chia sẻ ý tưởng và thuyết phục người khác không?',
        ],
    },
    conventional: {
        coreNeeds: [
            'Làm việc trong môi trường có cấu trúc và tổ chức',
            'Hoàn thành nhiệm vụ với độ chính xác và cẩn thận',
            'Tuân theo các quy trình và hệ thống đã được thiết lập',
            'Đạt được sự ổn định và khả năng dự đoán trong công việc',
        ],
        preferredTasks: [
            'Tổ chức và quản lý dữ liệu hoặc thông tin',
            'Tuân theo các quy trình đã được thiết lập',
            'Làm việc với số liệu và tính toán',
            'Duy trì hồ sơ chính xác',
            'Xử lý thông tin một cách có hệ thống',
            'Đảm bảo chất lượng và độ chính xác trong công việc',
        ],
        keyQuestions: [
            'Nghề nghiệp này có cung cấp cấu trúc và sự ổn định không?',
            'Tôi có làm việc với dữ liệu, hệ thống hoặc quy trình không?',
            'Nghề nghiệp này có đề cao độ chính xác và chú ý đến chi tiết không?',
            'Tôi có kỳ vọng và quy trình rõ ràng để tuân theo không?',
        ],
    },
};

const RIASECPage7Guidance = ({ scores }: RIASECPage7GuidanceProps) => {
    // Get top 2 interests to generate dynamic content
    const sortedScores = scores ? [...scores].sort((a, b) => b.score - a.score) : [];
    const topInterest = sortedScores[0]?.trait?.toLowerCase() || 'enterprising';
    const secondInterest = sortedScores[1]?.trait?.toLowerCase() || 'artistic';

    // Combine guidance from top 2 interests (with fallback)
    const fallback = INTEREST_GUIDANCE['enterprising'];
    const topGuidance = INTEREST_GUIDANCE[topInterest] || fallback;
    const secondGuidance = INTEREST_GUIDANCE[secondInterest] || fallback;

    // Mix content from both interests
    const coreNeeds = [...(topGuidance?.coreNeeds || []).slice(0, 2), ...(secondGuidance?.coreNeeds || []).slice(0, 2)];
    const preferredTasks = [...(topGuidance?.preferredTasks || []).slice(0, 3), ...(secondGuidance?.preferredTasks || []).slice(0, 3)];
    const keyQuestions = [...(topGuidance?.keyQuestions || []).slice(0, 2), ...(secondGuidance?.keyQuestions || []).slice(0, 2)];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4 print:text-xl print:mb-3">
                Chọn Nghề Nghiệp Phù Hợp
            </h2>

            {/* Intro */}
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-5 leading-relaxed print:text-xs print:mb-4">
                Bây giờ bạn đã xem qua một số nghề nghiệp có thể, bạn có thể đang tự hỏi nên đi đâu tiếp theo. Phần này được thiết kế để cung cấp cho bạn một lộ trình mà bạn có thể sử dụng để tiến về phía trước khi khám phá các khả năng nghề nghiệp của mình.
            </p>

            {/* Core Needs Section */}
            <div className="mb-5 print:mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 print:text-sm">
                    Nhu Cầu Cốt Lõi Của Bạn
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 print:text-[10px]">
                    Dưới đây là các yếu tố có khả năng quan trọng nhất với bạn trong một nghề nghiệp. Nếu một nghề nghiệp có hầu hết các yếu tố này, bạn sẽ thấy công việc hàng ngày thỏa mãn.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 print:text-xs">
                    {coreNeeds.slice(0, 4).map((need, i) => (
                        <li key={i}>• {need}</li>
                    ))}
                </ul>
            </div>

            {/* Preferred Tasks Section */}
            <div className="mb-5 print:mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 print:text-sm">
                    Nhiệm Vụ Ưa Thích Của Bạn
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 print:text-[10px]">
                    Một trong những khía cạnh quan trọng nhất của sự hài lòng trong công việc là mức độ công việc hàng ngày của bạn phù hợp với các loại hoạt động ưa thích của bạn.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 grid grid-cols-2 gap-x-4 print:text-xs">
                    {preferredTasks.slice(0, 6).map((task, i) => (
                        <li key={i}>• {task}</li>
                    ))}
                </ul>
            </div>

            {/* Key Questions Section */}
            <div className="mb-5 print:mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 print:text-sm">
                    Câu Hỏi Quan Trọng Của Bạn
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 print:text-[10px]">
                    Khi khám phá nghề nghiệp, hãy đặt những câu hỏi phù hợp với sở thích cá nhân của bạn:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 print:text-xs">
                    {keyQuestions.slice(0, 4).map((q, i) => (
                        <li key={i}>• {q}</li>
                    ))}
                </ul>
            </div>

            {/* What Makes Your Ideal Career */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 print:p-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 print:text-sm">
                    Điều Gì Tạo Nên Nghề Nghiệp Lý Tưởng Của Bạn?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed print:text-xs">
                    Khi chọn nghề nghiệp, bạn cần chú ý đến các yếu tố quan trọng nhất với bạn. Nhiều yếu tố trong số này sẽ dựa trên sở thích và tính cách của bạn, nhưng một số sẽ là độc đáo với bạn. Một nghề nghiệp lý tưởng nên thỏa mãn những động lực cơ bản nhất của bạn để làm việc. Để hiểu loại nghề nghiệp nào sẽ thỏa mãn, bạn phải hiểu các yếu tố tạo ra sự hài lòng cho bạn.
                </p>
            </div>
        </div>
    );
};

export default RIASECPage7Guidance;
