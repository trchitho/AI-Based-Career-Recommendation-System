import React from "react";

const HomeWhy: React.FC = () => {
    const items = [
        {
            icon: "",
            title: "Bài test RIASEC + Big Five",
            desc: "Bài test dựa trên khoa học giúp phân tích tính cách & gợi ý nghề nghiệp phù hợp nhất."
        },
        {
            icon: "",
            title: "Thông tin ngành nghề chi tiết",
            desc: "Kho dữ liệu ngành nghề cập nhật liên tục giúp bạn ra quyết định chính xác."
        },
        {
            icon: "",
            title: "Lộ trình phát triển rõ ràng",
            desc: "Cung cấp các bước phát triển kỹ năng theo từng nghề cụ thể."
        },
        {
            icon: "",
            title: "Hỗ trợ quyết định tự tin",
            desc: "Phân tích dữ liệu & AI giúp bạn chọn nghề chính xác, giảm rủi ro."
        }
    ];

    return (
        <section className="mt-32 text-center">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Tại sao chọn nền tảng của chúng tôi ?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-12">
                Giải pháp toàn diện để hỗ trợ phát triển sự nghiệp
            </p>

            <div className="grid md:grid-cols-4 gap-10 mt-10">
                {items.map((item, index) => (
                    <div key={index} className="text-center px-6">
                        <div className="text-4xl mb-4">{item.icon}</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {item.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">{item.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default HomeWhy;
