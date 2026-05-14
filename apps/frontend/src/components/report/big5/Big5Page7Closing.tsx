/**
 * Big5Page7Closing - Page 7: Closing / Summary
 * 
 * Concise closing with key takeaways
 */

const Big5Page7Closing = () => {
    return (
        <div className="h-full flex flex-col justify-center overflow-hidden">
            {/* Main Content - Centered */}
            <div className="text-center max-w-2xl mx-auto">
                {/* Icon */}
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-5 print:w-14 print:h-14 print:mb-4">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 print:w-7 print:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-5 print:text-xl print:mb-4">
                    Kết Luận & Bước Tiếp Theo
                </h2>

                {/* Content Paragraphs - Shortened */}
                <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed text-left print:space-y-3">
                    <p className="text-sm print:text-xs">
                        Báo cáo này phân tích tính cách của bạn bằng mô hình Big Five (OCEAN).
                        Sáu mẫu hành vi cho thấy các đặc điểm của bạn biểu hiện như thế nào trong môi trường làm việc.
                    </p>

                    <p className="text-sm print:text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Tự nhận thức</span> giúp
                        đưa ra quyết định nghề nghiệp tốt hơn. Hãy sử dụng những hiểu biết này để xác định các vai trò
                        phát huy điểm mạnh và xây dựng chiến lược phát triển.
                    </p>

                    <p className="text-sm print:text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Sự phù hợp nghề nghiệp</span> xảy ra
                        khi môi trường làm việc phù hợp với tính cách của bạn. Hãy đánh giá các cơ hội dựa trên
                        mức độ phù hợp với xu hướng tự nhiên của bạn.
                    </p>

                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 print:text-xs">
                        Các bài đánh giá tính cách là công cụ để suy ngẫm, không phải dự đoán. Hãy kết hợp những
                        hiểu biết này với kinh nghiệm và học hỏi liên tục.
                    </p>
                </div>

                {/* Decorative Divider */}
                <div className="mt-8 flex justify-center print:mt-6">
                    <div className="w-24 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" />
                </div>
            </div>

            {/* Footer - Methodology Note - Shortened */}
            <div className="mt-auto pt-8 print:pt-6">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 print:pt-3">
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center print:text-[10px]">
                        Được tạo bằng mô hình tính cách Big Five (OCEAN) với ánh xạ hành vi heuristic
                        dựa trên nghiên cứu tâm lý học đã được thiết lập.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Big5Page7Closing;
