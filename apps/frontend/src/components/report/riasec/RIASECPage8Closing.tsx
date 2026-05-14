/**
 * RIASECPage8Closing - The Next Step / Closing page
 * 
 * Final page with encouragement and next steps
 * Based on Truity Career Personality Profiler format
 */

const RIASECPage8Closing = () => {
    return (
        <div className="h-full flex flex-col justify-center overflow-hidden">
            {/* Main Content - Centered */}
            <div className="text-center max-w-2xl mx-auto">
                {/* Icon */}
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center mx-auto mb-5 print:w-14 print:h-14 print:mb-4">
                    <svg className="w-8 h-8 text-indigo-800 dark:text-indigo-400 print:w-7 print:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-5 print:text-xl print:mb-4">
                    Bước Tiếp Theo
                </h2>

                {/* Content */}
                <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed text-left print:space-y-3">
                    <p className="text-sm print:text-xs">
                        Bạn vừa có một khởi đầu tuyệt vời cho quá trình tìm kiếm nghề nghiệp bằng cách khám phá sở thích, tài năng, sở thích và giá trị của mình. Hãy tự khen ngợi bản thân!
                    </p>

                    <p className="text-sm print:text-xs">
                        Mặc dù chọn nghề nghiệp không phải là quá trình dễ dàng, nhưng nó có thể cực kỳ bổ ích khi được thực hiện đúng cách. Bằng cách đánh giá khách quan về bản thân và những gì bạn phù hợp, bạn đã có một khởi đầu vượt trội.
                    </p>

                    <p className="text-sm print:text-xs">
                        Bạn đã tiếp thu rất nhiều thông tin, vì vậy hãy dành thời gian để suy ngẫm. Khi bạn sẵn sàng, hãy quay lại danh sách nghề nghiệp của mình và chọn những nghề nghe có vẻ hấp dẫn nhất. Sử dụng điều này như điểm khởi đầu để bắt đầu nghiên cứu của riêng bạn.
                    </p>

                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 print:text-xs">
                        Bạn còn nhiều việc phải làm để tìm nghề nghiệp lý tưởng, nhưng bây giờ bạn nên cảm thấy được chuẩn bị tốt để bắt đầu. Chúc bạn may mắn trong hành trình tìm kiếm!
                    </p>
                </div>

                {/* Decorative Divider */}
                <div className="mt-8 flex justify-center print:mt-6">
                    <div className="w-24 h-0.5 bg-gradient-to-r from-indigo-700 to-indigo-600 rounded-full" />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-8 print:pt-6">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 print:pt-3">
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center print:text-[10px]">
                        Được tạo bằng mô hình sở thích nghề nghiệp RIASEC của Holland với tính năng ghép nối nghề nghiệp bằng AI.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RIASECPage8Closing;
