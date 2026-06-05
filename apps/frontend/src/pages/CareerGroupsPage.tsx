import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { careerGroupService, CareerGroup } from '../services/careerGroupService';
import { useApiCallTracker } from '../hooks/useApiCallTracker';
import ONetAttribution from '../components/common/ONetAttribution';

const CareerGroupsPage = () => {
    const [groups, setGroups] = useState<CareerGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(6);
    const [total, setTotal] = useState(0);

    const { trackCall } = useApiCallTracker('CareerGroupsPage');

    // Icons và ảnh cho từng nhóm nghề
    const getGroupAssets = (slug: string) => {
        const assets: Record<string, { icon: JSX.Element; image: string }> = {
            'sales': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                ),
                image: '/images/sales.jpg'
            },
            'building-maintenance': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                ),
                image: '/images/building-maintenance.jpg'
            },
            'personal-care': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                ),
                image: '/images/personal-care.jpg'
            },
            'computer-math': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                ),
                image: '/images/computer-math.jpg'
            },
            'food-service': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                ),
                image: '/images/food-service.jpg'
            },
            'protective-service': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                ),
                image: '/images/protective-service.jpg'
            },
            'community-social': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                ),
                image: '/images/community-social.jpg'
            },
            'education': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                ),
                image: '/images/education.jpg'
            },
            'office-admin': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
                image: '/images/office-admin.jpg'
            },
            'healthcare-support': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                ),
                image: '/images/healthcare-support.jpg'
            },
            'life-science': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                ),
                image: '/images/life-science.jpg'
            },
            'architecture-engineering': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                ),
                image: '/images/architecture-engineering.jpg'
            },
            'business-finance': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
                image: '/images/business-finance.jpg'
            },
            'installation-repair': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ),
                image: '/images/installation-repair.jpg'
            },
            'arts-media': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 12l2 2 4-4" />
                    </svg>
                ),
                image: '/images/arts-media.jpg'
            },
            'farming-forestry': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                ),
                image: '/images/farming-forestry.jpg'
            },
            'legal': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                ),
                image: '/images/legal.jpg'
            },
            'management': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                ),
                image: '/images/management.jpg'
            },
            'production': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                ),
                image: '/images/production.jpg'
            },
            'transportation': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                ),
                image: '/images/transportation.jpg'
            },
            'construction': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                ),
                image: '/images/construction.jpg'
            },
            'healthcare-practitioners': {
                icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                ),
                image: '/images/healthcare-practitioners.jpg'
            }
        };

        return assets[slug] || {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            image: '/images/default.jpg'
        };
    };

    const fetchGroups = useCallback(async () => {
        console.log(`🔄 [CareerGroupsPage] Loading career groups (page: ${page})...`);

        setLoading(true);
        try {
            trackCall(`/api/career-system/groups?page=${page}`);
            const resp = await careerGroupService.listGroups({ page, pageSize });

            // Ensure resp.items exists and is an array
            if (resp && Array.isArray(resp.items)) {
                setGroups(resp.items);
                setTotal(resp.total || 0);
            } else {
                console.error('❌ [CareerGroupsPage] Invalid API response:', resp);
                setGroups([]);
                setTotal(0);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });

            console.log(`✅ [CareerGroupsPage] Loaded ${resp?.items?.length || 0} groups (total: ${resp?.total || 0})`);
        } catch (err) {
            console.error('❌ [CareerGroupsPage] Error loading career groups:', err);
            setGroups([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]); // Remove trackCall from dependencies

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Gradient backgrounds for group cards
    const gradients = [
        'from-blue-500 to-indigo-600',
        'from-green-500 to-teal-600',
        'from-purple-500 to-violet-600',
        'from-orange-400 to-pink-500',
        'from-emerald-400 to-cyan-500',
        'from-rose-400 to-red-500',
    ];

    return (
        <MainLayout>
            <div className="min-h-screen bg-surface-primary dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-hidden pb-20">

                {/* CSS Injection */}
                <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern {
            background-image: radial-gradient(#D1D5DB 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(#374151 1px, transparent 1px);
          }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

                {/* Background Layers */}
                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-40"></div>
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

                    {/* Header */}
                    <div className="text-center mb-16 animate-fade-in-up">
                        <span className="inline-block py-1.5 px-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 border border-blue-200 dark:border-blue-800">
                            Danh Mục Nghề Nghiệp
                        </span>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
                            Khám Phá <span className="text-blue-600 dark:text-blue-500">Lĩnh Vực Nghề Nghiệp</span>
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
                            Khám phá cơ hội nghề nghiệp trong 22 nhóm ngành lớn. Tìm lĩnh vực phù hợp nhất với sở thích và kỹ năng của bạn.
                        </p>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-blue-600 mb-4 animate-spin"></div>
                            <p className="text-gray-500 font-medium">Đang tải lĩnh vực nghề nghiệp...</p>
                        </div>
                    ) : (groups && groups.length > 0) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in-up">
                            {groups.map((group, index) => {
                                const bgGradient = gradients[index % gradients.length];
                                const assets = getGroupAssets(group.slug);

                                return (
                                    <Link
                                        key={group.id}
                                        to={`/careers/${group.slug}`}
                                        className="group bg-white dark:bg-gray-800 rounded-card-hero border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-2 transition-all duration-slow flex flex-col overflow-hidden h-full"
                                    >
                                        {/* Image Header */}
                                        <div className="h-48 relative overflow-hidden">
                                            <img
                                                src={assets.image}
                                                alt={group.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => {
                                                    // Fallback to gradient if image fails to load
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    target.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                            {/* Fallback gradient */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} hidden`}></div>

                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-500"></div>

                                            {/* Icon */}
                                            <div className="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 text-gray-700 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                {assets.icon}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 flex-grow flex flex-col">
                                            <div className="mb-4">
                                                <h3 className="text-xl font-bold mb-2 line-clamp-2 h-14 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {group.name}
                                                </h3>
                                                <div className="w-12 h-1 bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-500 rounded-full transition-colors"></div>
                                            </div>

                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 flex-grow mb-6 leading-relaxed">
                                                {group.description || `Khám phá cơ hội nghề nghiệp trong lĩnh vực ${group.name.toLowerCase()}. Tìm kiếm vai trò phù hợp với kỹ năng và sở thích của bạn.`}
                                            </p>

                                            {/* Stats */}
                                            <div className="flex items-center justify-between mb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                            {group.career_count || 0}
                                                        </div>
                                                        <div className="text-xs text-gray-400 uppercase tracking-wider">
                                                            Nghề nghiệp
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                            {group.level_count || 0}
                                                        </div>
                                                        <div className="text-xs text-gray-400 uppercase tracking-wider">
                                                            Cấp độ
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CTA */}
                                            <div className="flex items-center justify-between mt-auto">
                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                    Khám Phá Lĩnh Vực
                                                </span>
                                                <div className="flex items-center text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                                                    Xem Nghề Nghiệp
                                                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32 animate-fade-in-up">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy lĩnh vực nghề nghiệp</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">Không thể tải lĩnh vực nghề nghiệp. Vui lòng thử lại sau.</p>
                            <button
                                onClick={fetchGroups}
                                className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && total > pageSize && (
                        <div className="mt-16 flex items-center justify-center gap-4 animate-fade-in-up">
                            <button
                                className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                disabled={page <= 1}
                                onClick={() => {
                                    setPage((p) => Math.max(1, p - 1));
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <div className="px-6 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                    Trang <span className="text-gray-900 dark:text-white">{page}</span> / {totalPages}
                                </span>
                            </div>

                            <button
                                className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                disabled={page >= totalPages}
                                onClick={() => {
                                    setPage((p) => p + 1);
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}

                </div>
            </div>
            <ONetAttribution />
        </MainLayout>
    );
};

export default CareerGroupsPage;