import React from "react";

interface CareerBlock {
    title: string;
    desc: string;
    img: string;
    reverse?: boolean;
}

const blocks: CareerBlock[] = [
    {
        title: "Khám phá ngành phù hợp",
        desc: "Tìm ra ngành nghề phù hợp nhất dựa vào tính cách, sở thích và xu hướng thị trường.",
        img: "/assets/career1.svg",
    },
    {
        title: "Xây dựng kỹ năng trọng điểm",
        desc: "Danh sách kỹ năng cần học để cải thiện năng lực nghề nghiệp theo đúng lộ trình.",
        img: "/assets/career2.svg",
        reverse: true
    },
    {
        title: "Lộ trình học tập cá nhân hóa",
        desc: "Gợi ý khóa học, tài liệu và bài tập phù hợp với cấp độ hiện tại của bạn.",
        img: "/assets/career3.svg"
    },
    {
        title: "Theo dõi tiến độ liên tục",
        desc: "Đánh giá sự tiến bộ qua từng cột mốc và điều chỉnh kế hoạch khi cần thiết.",
        img: "/assets/career4.svg",
        reverse: true
    }
];

const HomeCareerBlocks: React.FC = () => {
    return (
        <section className="mt-32">
            {blocks.map((block, i) => (
                <div
                    key={i}
                    className={`grid md:grid-cols-2 gap-12 items-center mt-20 ${block.reverse ? "md:flex-row-reverse" : ""
                        }`}
                >
                    {/* Text */}
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            {block.title}
                        </h3>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            {block.desc}
                        </p>
                    </div>

                    {/* Image */}
                    <div className="flex justify-center">
                        <img
                            src={block.img}
                            alt={block.title}
                            className="w-80 h-auto drop-shadow-xl"
                        />
                    </div>
                </div>
            ))}
        </section>
    );
};

export default HomeCareerBlocks;
