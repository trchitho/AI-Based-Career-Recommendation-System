import React from "react";
import { Link } from "react-router-dom";

interface Props {
    isAuthenticated?: boolean;
}

const HomeCTA: React.FC<Props> = ({ isAuthenticated }) => {
    return (
        <section className="mt-32 bg-gradient-to-r from-[#E8DCC8] to-[#D4C4B0] dark:from-gray-800 dark:to-gray-700 rounded-3xl border border-gray-300 dark:border-gray-600 p-12 text-center shadow-xl">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Sẵn sàng khám phá nghề nghiệp lý tưởng?
            </h2>

            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                Hơn 10.000 người đã tìm được định hướng nghề nghiệp phù hợp với CareerBridge AI.
            </p>

            <Link
                to={isAuthenticated ? "/dashboard" : "/assessment"}
                className="inline-block px-10 py-5 bg-[#4A7C59] dark:bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-[#3d6449] dark:hover:bg-green-700 transition-all duration-200 shadow-xl"
            >
                {isAuthenticated ? "Tiếp tục hành trình" : "Bắt đầu miễn phí"}
            </Link>
        </section>
    );
};

export default HomeCTA;
