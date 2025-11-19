import React from "react";
import { Link } from "react-router-dom";

interface Props {
    isAuthenticated?: boolean;
}

const HomeCTA: React.FC<Props> = ({ isAuthenticated }) => {
    return (
        <section className="mt-32 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-500/20 dark:to-purple-600/20 rounded-3xl border border-purple-300 dark:border-purple-500/30 p-12 text-center shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Sẵn sàng khám phá nghề nghiệp lý tưởng?
            </h2>

            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                Hơn 10.000 người đã tìm được định hướng nghề nghiệp phù hợp với CareerBridge AI.
            </p>

            <Link
                to={isAuthenticated ? "/dashboard" : "/assessment"}
                className="px-10 py-5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold text-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-2xl hover:shadow-purple-500/50"
            >
                {isAuthenticated ? "Tiếp tục hành trình" : "Bắt đầu miễn phí"}
            </Link>
        </section>
    );
};

export default HomeCTA;
