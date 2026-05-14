/**
 * RIASECPage4Careers - Careers to Explore intro page
 * 
 * Shows introduction text before career matches
 * Based on Truity Career Personality Profiler format
 */

const RIASECPage4Careers = () => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-5 print:text-xl print:mb-4">
                Nghề Nghiệp Để Khám Phá
            </h2>

            {/* Intro Text */}
            <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed print:text-xs print:space-y-4">
                <p>
                    Trong phần này, chúng tôi sẽ cho bạn thấy những nghề nghiệp hàng đầu phù hợp với hồ sơ sở thích của bạn. Có một vài điều cần lưu ý khi bạn đọc qua các gợi ý nghề nghiệp này:
                </p>

                <div>
                    <p className="mb-2">
                        <span className="font-bold">1. Các tên nghề nghiệp này chỉ là điểm khởi đầu.</span> Các nghề nghiệp được liệt kê ở đây là những nghề phổ biến nhất trên thị trường lao động và là những nghề mà nhiều người sẽ nhận ra. Tuy nhiên, nhiều người có công việc không hoàn toàn phù hợp với bất kỳ mô tả nào được liệt kê ở đây. Bạn có thể kết thúc với một công việc kết hợp nhiều vai trò điển hình này. Bạn có thể có một công việc đặc thù cho một công ty hoặc ngành cụ thể. Hoặc bạn có thể tạo ra một nghề nghiệp hoàn toàn mới! Tóm lại, đừng giới hạn trí tưởng tượng của bạn vào các công việc được liệt kê ở đây. Đây là mẫu đại diện của các công việc phù hợp với tính cách của bạn, nhưng chúng không bao gồm mọi khả năng hoặc cơ hội mà bạn sẽ gặp trong con đường sự nghiệp.
                    </p>
                </div>

                <div>
                    <p className="mb-2">
                        <span className="font-bold">2. Sự độc đáo của bạn là chìa khóa.</span> Các nghề nghiệp trong phần này được liệt kê theo mức độ phù hợp với hồ sơ sở thích của bạn. Tuy nhiên, bạn không nên cho rằng nghề nghiệp đầu tiên trong danh sách là nghề tốt nhất cho bạn, hay nghề thứ hai là tốt thứ hai, v.v. Bạn có thể tìm thấy những nghề nghiệp khơi dậy sự quan tâm của bạn ở bất kỳ đâu trong danh sách này. Bạn cũng có thể thấy một số nghề nghiệp không thu hút bạn chút nào. Điều này là bình thường và không có nghĩa là kết quả của bạn không chính xác! Mỗi người đều độc đáo, và ngay cả người có hồ sơ sở thích giống hệt bạn cũng sẽ có những xu hướng, đam mê và sở thích khác nhau. Vì vậy, trong khi bài đánh giá này có thể chỉ cho bạn hướng đi đúng và cho bạn một số ý tưởng tốt để bắt đầu, lựa chọn cuối cùng về nghề nghiệp tốt nhất của bạn sẽ phụ thuộc vào bạn.
                    </p>
                </div>

                <div>
                    <p className="mb-2">
                        <span className="font-bold">3. Cuối cùng, lựa chọn là của bạn.</span> Vì không có bài đánh giá nào có thể cho bạn biết chính xác nghề nghiệp nào sẽ hoàn hảo cho bạn, cách tốt nhất để nghĩ về danh sách này là điểm khởi đầu cho nghiên cứu nghề nghiệp của bạn. Bạn có thể sử dụng danh sách này để có ý tưởng về các nghề nghiệp có thể phù hợp với bạn, nhưng bạn vẫn cần đọc thêm về từng nghề nghiệp mà bạn quan tâm, thực hiện nghiên cứu thực tế (như phỏng vấn hoặc theo dõi những người trong lĩnh vực đó), và đánh giá từng nghề nghiệp theo tiêu chí cá nhân của bạn. Hiện tại, hãy đọc qua danh sách này với tâm trí cởi mở. Xem liệu có ý tưởng nghề nghiệp nào nổi bật là đặc biệt thú vị, và những ý tưởng nào xứng đáng được kiểm tra thêm.
                    </p>
                </div>

                <p className="font-semibold text-base text-gray-900 dark:text-white mt-5 print:mt-4 print:text-sm">
                    Với điều đó trong tâm trí, hãy cùng xem xét một số nghề nghiệp.
                </p>
            </div>
        </div>
    );
};

export default RIASECPage4Careers;
