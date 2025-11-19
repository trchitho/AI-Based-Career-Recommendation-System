import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { roadmapService } from '../services/roadmapService';
import { careerService } from '../services/careerService';
import { useAppSettings } from '../contexts/AppSettingsContext';
import RoadmapTimelineComponent from '../components/roadmap/RoadmapTimelineComponent';
import { Roadmap } from '../types/roadmap';

const RoadmapPage = () => {
    const { careerId } = useParams<{ careerId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const app = useAppSettings();

    const isDark = app.theme === "dark";

    const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completingMilestone, setCompletingMilestone] = useState<string | null>(null);
    const [careerDesc, setCareerDesc] = useState<string>('');
    const [showFullDesc, setShowFullDesc] = useState<boolean>(false);

    useEffect(() => {
        if (careerId) fetchRoadmap();
    }, [careerId]);

    const fetchRoadmap = async () => {
        if (!careerId) return;
        try {
            setLoading(true);
            const data = await roadmapService.getRoadmap(careerId);
            setRoadmap(data);

            try {
                const c = await careerService.get(careerId);
                setCareerDesc((c as any).description || (c as any).short_desc || '');
            } catch { }
        } catch (err) {
            setError('Failed to load roadmap.');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteMilestone = async (milestoneId: string) => {
        if (!careerId) return;
        try {
            setCompletingMilestone(milestoneId);
            await roadmapService.completeMilestone(careerId, milestoneId);
            await fetchRoadmap();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to mark complete.');
        } finally {
            setCompletingMilestone(null);
        }
    };

    return (
        <div
            className={`
                relative min-h-screen transition-all duration-300
                ${isDark ? "bg-[#111827] text-gray-100" : "bg-gray-50 text-gray-900"}
            `}
        >

            {/* TOP NAV */}
            <nav
                className={`
                    w-full border-b transition-all duration-300
                    ${isDark
                        ? "bg-[#111827] border-[#1F2937]"
                        : "bg-white border-gray-200 shadow-sm"
                    }
                `}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

                    {/* BACK + TITLE */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className={`
                                px-3 py-1.5 rounded-lg text-sm transition
                                ${isDark
                                    ? "text-gray-300 hover:text-white hover:bg-gray-700/50"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                }
                            `}
                        >
                            ← Back
                        </button>

                        <span
                            onClick={() => navigate('/dashboard')}
                            className={`
                                cursor-pointer text-xl font-bold
                                ${isDark
                                    ? "text-gray-100 hover:text-purple-300"
                                    : "text-gray-900 hover:text-purple-700"
                                }
                            `}
                        >
                            {app.app_title || 'CareerBridge AI'}
                        </span>
                    </div>

                    {/* USER */}
                    <div className="flex items-center gap-4">
                        <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                            {user?.firstName || user?.email}
                        </span>

                        <button
                            onClick={logout}
                            className={`
                                text-sm px-3 py-1.5 rounded-lg transition
                                ${isDark
                                    ? "text-gray-300 hover:text-red-400 hover:bg-gray-700/50"
                                    : "text-gray-700 hover:text-red-600 hover:bg-gray-100"
                                }
                            `}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* MAIN */}
            <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6">

                    {/* HEADER CARD */}
                    {!loading && roadmap && (
                        <section className="mb-8">
                            <div
                                className={`
                                    rounded-xl p-6 transition-all duration-300
                                    ${isDark
                                        ? "bg-[#1F2937] border border-[#374151]"
                                        : "bg-white border border-gray-200 shadow"
                                    }
                                `}
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                                    {/* LEFT */}
                                    <div className="lg:col-span-3">
                                        <h1 className="text-3xl font-extrabold mb-4">
                                            {roadmap.careerTitle?.toUpperCase()}
                                        </h1>

                                        {/* STAGES */}
                                        <div className="flex flex-wrap items-center gap-6 mb-6">
                                            {['intern', 'employee', 'manager', 'director', 'ceo'].map((stage, idx) => {
                                                const completed =
                                                    (roadmap.userProgress?.completed_milestones?.length || 0) > idx;
                                                const label = t(`roadmap.careerStages.${stage}`);

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`
                                                            flex items-center justify-center
                                                            w-28 h-28 rounded-full px-2 border-4 text-center
                                                            font-bold text-xs
                                                            ${completed
                                                                ? "bg-indigo-600 text-white border-indigo-300"
                                                                : isDark
                                                                    ? "bg-[#1E2530] text-gray-200 border-[#2E3745]"
                                                                    : "bg-blue-100 text-blue-900 border-blue-300"
                                                            }
                                                        `}
                                                    >
                                                        {label}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* DESCRIPTION */}
                                        {careerDesc && (
                                            <div className="space-y-3">
                                                <p className={showFullDesc ? "" : "line-clamp-4"}>
                                                    {careerDesc}
                                                </p>

                                                <button
                                                    onClick={() => setShowFullDesc(!showFullDesc)}
                                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                                >
                                                    {showFullDesc ? "Thu gọn" : "Xem đầy đủ nội dung"}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* RIGHT INFO BOXES */}
                                    <aside className="space-y-4 lg:col-span-1">

                                        <div
                                            className={`
                                                rounded-xl p-4
                                                ${isDark
                                                    ? "bg-[#1F2937] border border-[#374151]"
                                                    : "bg-white border"
                                                }
                                            `}
                                        >
                                            <div className="text-orange-500 font-bold mb-1">KINH NGHIỆM</div>
                                            <div>{roadmap.overview?.experienceText || "6 tháng - 1 năm"}</div>
                                        </div>

                                        <div
                                            className={`
                                                rounded-xl p-4
                                                ${isDark
                                                    ? "bg-[#1F2937] border border-[#374151]"
                                                    : "bg-white border"
                                                }
                                            `}
                                        >
                                            <div className="text-orange-500 font-bold mb-1">BẰNG CẤP</div>
                                            <div>{roadmap.overview?.degreeText || "Cao đẳng, Đại học"}</div>
                                        </div>

                                    </aside>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* TIMELINE */}
                    {!loading && roadmap && (
                        <div
                            className={`
                                rounded-xl p-6
                                ${isDark
                                    ? "bg-[#1F2937] border border-[#374151]"
                                    : "bg-white shadow border border-gray-200"
                                }
                            `}
                        >
                            <h3 className="text-xl font-semibold mb-6">Learning Path</h3>

                            <RoadmapTimelineComponent
                                milestones={roadmap.milestones}
                                userProgress={roadmap.userProgress}
                                onCompleteMilestone={handleCompleteMilestone}
                                completingMilestone={completingMilestone}
                            />
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default RoadmapPage;
