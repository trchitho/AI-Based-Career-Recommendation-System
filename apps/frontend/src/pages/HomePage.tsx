import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

// --- TYPES ---
interface PublicStats {
    totalAssessments: number;
    totalCareerPaths: number;
    totalCareerInfo: number;
    satisfactionRate: number;
}

// --- SUB-COMPONENTS & HOOKS ---

// Hook để chạy số nhảy (Counter Animation)
const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);
    const countRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry && entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (countRef.current) observer.observe(countRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;
        let start = 0;
        const increment = end / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [end, duration, isVisible]);

    return { count, countRef };
};

const CounterItem = ({ value, label, suffix = '' }: { value: string, label: string, suffix?: string }) => {
    const parseValue = (val: string) => {
        if (val.includes('k')) return { num: parseFloat(val) * 1000, suf: 'k+' };
        if (val.includes('M')) return { num: parseFloat(val) * 1000000, suf: 'M+' };
        if (val.includes('%')) return { num: parseFloat(val), suf: '%' };
        if (val.includes('<')) return { num: 2, suf: 'min' };
        return { num: parseFloat(val), suf: suffix };
    };

    const { num, suf } = parseValue(value);
    if (isNaN(num)) return (
        <div className="text-white">
            <div className="text-4xl md:text-5xl font-extrabold mb-2 font-mono">{value}</div>
            <div className="text-green-100 font-medium">{label}</div>
        </div>
    );

    const { count, countRef } = useCounter(num);

    return (
        <div ref={countRef} className="text-white group hover:-translate-y-1 transition-transform duration-300">
            <div className="text-4xl md:text-5xl font-extrabold mb-2 font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-50">
                {value.includes('<') ? '< ' : ''}{count.toLocaleString()}{suf}
            </div>
            <div className="text-green-100 font-medium group-hover:text-white transition-colors">{label}</div>
        </div>
    );
};

const AccordionItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-200 dark:border-gray-800 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between py-5 text-left text-lg font-semibold text-gray-900 dark:text-white hover:text-indigo-700 transition-colors group"
            >
                <span className="group-hover:translate-x-1 transition-transform">{question}</span>
                <span className={`transform transition-transform duration-300 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-indigo-50 dark:group-hover:bg-green-900/30 text-gray-500 group-hover:text-indigo-800 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 mb-5' : 'max-h-0 opacity-0'}`}>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed pr-12">{answer}</p>
            </div>
        </div>
    );
};

const HomePage = () => {
    const { t } = useTranslation();

    const [stats, setStats] = useState<PublicStats | null>(null);
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [contactLoading, setContactLoading] = useState(false);
    const [contactResult, setContactResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/api/app/stats');
                setStats(response.data);
            } catch {
                setStats({ totalAssessments: 150, totalCareerPaths: 50, totalCareerInfo: 20000, satisfactionRate: 98 });
            }
        };
        fetchStats();
    }, []);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactLoading(true);
        setContactResult(null);
        if (!contactForm.name.trim() || contactForm.name.trim().length < 2) {
            setContactResult({ success: false, message: 'Please enter your name (at least 2 characters).' });
            setContactLoading(false); return;
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(contactForm.email.trim())) {
            setContactResult({ success: false, message: 'Please enter a valid email address.' });
            setContactLoading(false); return;
        }
        if (!contactForm.message.trim() || contactForm.message.trim().length < 10) {
            setContactResult({ success: false, message: 'Message must be at least 10 characters.' });
            setContactLoading(false); return;
        }
        try {
            const response = await api.post('/api/app/contact', contactForm);
            setContactResult(response.data);
            if (response.data.success) {
                setContactForm({ name: '', email: '', phone: '', message: '' });
                setTimeout(() => { setShowContactForm(false); setContactResult(null); }, 3000);
            }
        } catch {
            setContactResult({ success: false, message: 'Failed to send. Please email careersystemai@gmail.com' });
        } finally {
            setContactLoading(false);
        }
    };

    const testimonials = [
        { name: 'Sarah Nguyen', role: 'Software Engineer', text: "The insights were incredibly accurate. I finally understand why certain careers appeal to me.", initial: 'S', color: 'bg-indigo-500' },
        { name: 'Michael Chen', role: 'Product Manager', text: "A game-changer for my career planning. The roadmap gave me clear direction.", initial: 'M', color: 'bg-indigo-700' },
        { name: 'Emily Patel', role: 'UX Designer', text: "Highly recommended for anyone feeling stuck in their current role.", initial: 'E', color: 'bg-purple-500' },
        { name: 'David Kim', role: 'Data Scientist', text: "The AI analysis is spot on. It helped me pivot my career successfully.", initial: 'D', color: 'bg-blue-500' },
        { name: 'Lisa Wang', role: 'Marketing Lead', text: "Simple, intuitive, and effective. Best career tool I've used.", initial: 'L', color: 'bg-pink-500' },
    ];
    const row1 = [...testimonials, ...testimonials];
    const row2 = [...testimonials].reverse().concat([...testimonials].reverse());

    const faqs = [
        { q: t('home.faq.q1'), a: t('home.faq.a1') },
        { q: t('home.faq.q2'), a: t('home.faq.a2') },
        { q: t('home.faq.q3'), a: t('home.faq.a3') },
        { q: t('home.faq.q4'), a: t('home.faq.a4') },
    ];

    return (
        <div className="selection:bg-indigo-50 selection:text-indigo-900 overflow-x-hidden">

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

                @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                @keyframes scroll-reverse { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
                @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .animate-scroll { animation: scroll 40s linear infinite; }
                .animate-scroll-reverse { animation: scroll-reverse 40s linear infinite; }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }

                .animate-shimmer {
                    background: linear-gradient(90deg, rgba(34,197,94,0) 0%, rgba(34,197,94,0.1) 50%, rgba(34,197,94,0) 100%);
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite linear;
                }

                .text-shimmer {
                    background: linear-gradient(to right, 166534 20%, 4ade80 40%, 4ade80 60%, 166534 80%);
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: shimmer 5s linear infinite;
                }
                .dark .text-shimmer {
                    background: linear-gradient(to right, 4ade80 20%, ffffff 40%, ffffff 60%, 4ade80 80%);
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                }

                .bg-grid-pattern {
                    background-image:
                        linear-gradient(to right, rgba(34, 197, 94, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(34, 197, 94, 0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                    mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
                }
                .dark .glass-card {
                    background: rgba(17, 24, 39, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
                }
            `}</style>

            <main>
                {/* --- HERO SECTION --- */}
                <section className="relative pt-16 pb-20 overflow-hidden" style={{ background: 'var(--neu-bg)' }}>
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                        <div className="bg-grid-pattern absolute w-full h-full opacity-[0.6]"></div>
                        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob"></div>
                        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-green-300 dark:bg-indigo-950 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

                            {/* LEFT — text */}
                            <div className="flex-1 animate-fade-in-up">
                                <span className="relative px-4 py-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 border border-indigo-200 dark:border-indigo-800 backdrop-blur-sm text-sm font-bold inline-block mb-6 shadow-sm hover:scale-105 transition-transform cursor-default">
                                    <span className="text-shimmer">{t('home.badge')}</span>
                                </span>

                                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]">
                                    {t('home.hero.title')}{' '}
                                    <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
                                        {t('home.hero.titleHighlight')}
                                    </em>{' '}
                                    {t('home.hero.titleSuffix', 'trajectory with precision.')}
                                </h1>

                                <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 leading-relaxed max-w-xl font-medium">
                                    {t('home.hero.subtitle')}
                                </p>

                                <div className="flex flex-col sm:flex-row items-start gap-4">
                                    <Link to="/assessment" className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 relative overflow-hidden group uppercase tracking-wide">
                                        {t('home.hero.cta')}
                                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </Link>
                                    <Link to="/careers" className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm uppercase tracking-wide">
                                        {t('home.hero.exploreBtn')}
                                    </Link>
                                </div>
                            </div>

                            {/* RIGHT — dashboard mockup */}
                            <div className="flex-1 w-full max-w-lg lg:max-w-none animate-fade-in-up relative" style={{ animationDelay: '0.2s' }}>
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg,0f172a 0%,1e2d4a 100%)' }}>
                                    <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 opacity-80"></span>
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 opacity-80"></span>
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 opacity-80"></span>
                                        <span className="ml-3 text-xs text-white/40 font-mono tracking-widest">• CAREER AI</span>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-end justify-between h-36 gap-1.5 mb-4">
                                            {[35,55,42,70,58,85,65,90,72,80,60,95].map((h, i) => (
                                                <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i >= 9 ? 'rgba(56,189,248,0.9)' : `rgba(56,189,248,${0.25 + i * 0.04})` }}></div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-xs text-white/30 font-mono">
                                            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                                                <span key={m}>{m.slice(0,1)}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute -bottom-5 -right-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700 min-w-[180px]">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <svg className="w-3.5 h-3.5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Market Pulse</span>
                                    </div>
                                    <div className="text-2xl font-extrabold text-gray-900 dark:text-white">+12.4%</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Demand for AI Ethics roles</div>
                                </div>
                            </div>
                        </div>

                        {/* 3 feature mini-cards */}
                        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                                    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                                    title: t('home.features.assessment.title'),
                                    desc: t('home.features.assessment.shortDesc', 'Deep-dive cognitive and technical evaluation to uncover your hidden competitive edges.'),
                                },
                                {
                                    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                                    color: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-400',
                                    title: t('home.features.skillGap.title'),
                                    desc: t('home.features.skillGap.shortDesc', 'Real-time data scraping from global sectors to identify emerging talent vacuums.'),
                                },
                                {
                                    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
                                    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                                    title: 'Mentor Network',
                                    desc: t('home.features.mentor.shortDesc', 'Direct access to industry architects who have already navigated the paths you seek.'),
                                },
                            ].map((card, i) => (
                                <div key={i} className="glass-card rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.color} group-hover:scale-110 transition-transform`}>
                                        {card.icon}
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{card.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- FEATURE CLOUD --- */}
                <div className="border-y border-gray-200 dark:border-gray-700/50 py-10 overflow-hidden relative" style={{ background: 'var(--neu-bg)' }}>
                    <div className="absolute inset-y-0 left-0 w-32 z-10" style={{ background: 'linear-gradient(to right, var(--neu-bg), transparent)' }}></div>
                    <div className="absolute inset-y-0 right-0 w-32 z-10" style={{ background: 'linear-gradient(to left, var(--neu-bg), transparent)' }}></div>
                    <div className="flex w-max animate-scroll">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex gap-20 px-12 items-center">
                                {['RIASEC Assessment','Big Five Analysis','AI Career Matching','Learning Roadmaps','900+ Careers','Skill Gap Analysis','AI Assistant','PDF Reports'].map((text, idx) => (
                                    <span key={idx} className="text-xl font-bold tracking-wide text-gray-400 hover:text-indigo-800 dark:text-gray-500 dark:hover:text-indigo-400 select-none transition-colors duration-300 whitespace-nowrap uppercase">
                                        {text}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- BENTO GRID FEATURES --- */}
                <section className="py-24 bg-gray-50 dark:bg-gray-800/50 relative overflow-hidden">
                    <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-green-200/20 dark:bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                                {t('home.features.sectionTitle')} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-emerald-700">{t('home.features.sectionHighlight')}</span>
                            </h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400">{t('home.features.sectionSubtitle')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-6 grid-rows-2 gap-6 h-auto md:h-[650px]">
                            {/* Feature 1: Large */}
                            <div className="md:col-span-4 md:row-span-2 bg-white dark:bg-gray-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-700/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-indigo-700/20 transition-colors duration-500"></div>
                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-800 dark:group-hover:text-indigo-400 transition-colors">{t('home.features.assessment.title')}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">{t('home.features.assessment.desc')}</p>

                                    <div className="mt-auto relative w-full h-64 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-inner transform group-hover:scale-[1.02] transition-transform duration-500 flex flex-col gap-4 overflow-hidden">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">R</div>
                                            <div className="flex flex-col gap-2">
                                                <div className="w-32 h-3 bg-green-300 dark:bg-indigo-800 rounded-full"></div>
                                                <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                            </div>
                                            <div className="ml-auto w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                                                <div className="w-4 h-4 bg-indigo-700 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                                        <div className="space-y-2">
                                            {[{ l: 'Realistic', w: '75%', c: 'bg-red-400' }, { l: 'Investigative', w: '85%', c: 'bg-yellow-400' }, { l: 'Artistic', w: '60%', c: 'bg-indigo-400' }, { l: 'Social', w: '90%', c: 'bg-blue-400' }].map((item, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 w-20">{item.l}</span>
                                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div className={`h-full ${item.c} rounded-full`} style={{ width: item.w }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="absolute bottom-6 right-6 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 flex items-center gap-2 animate-bounce">
                                            <span className="w-2 h-2 bg-indigo-700 rounded-full"></span>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Match: 95%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
                                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:rotate-12 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('home.features.skillGap.title')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('home.features.skillGap.desc')}</p>
                                <div className="flex items-end justify-between h-24 px-2 pb-2">
                                    {[40, 70, 50, 90, 60].map((h, i) => (
                                        <div key={i} className="w-1/6 bg-gray-100 dark:bg-gray-700 rounded-t-md relative overflow-hidden group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors" style={{ height: `${h}%` }}></div>
                                    ))}
                                </div>
                            </div>

                            {/* Feature 3 */}
                            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
                                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:-rotate-12 transition-transform">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('home.features.roadmap.title')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('home.features.roadmap.desc')}</p>
                                <div className="relative w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div key={step} className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full ${step <= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'} flex items-center justify-center text-xs font-bold`}>{step}</div>
                                                {step < 4 && <div className={`w-6 h-1 ${step < 2 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- HOW IT WORKS --- */}
                <section className="py-24 relative" style={{ background: 'var(--neu-bg)' }}>
                    <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-50 dark:from-gray-800/50 to-transparent"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-20 text-center">
                            <span className="text-indigo-700 font-bold tracking-wider uppercase text-sm bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full">{t('home.howItWorks.label')}</span>
                            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mt-4">{t('home.howItWorks.title')}</h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-4 max-w-2xl mx-auto">{t('home.howItWorks.subtitle')}</p>
                        </div>

                        <div className="relative">
                            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800 -translate-x-1/2"></div>
                            {[
                                { title: t('home.howItWorks.step1.title'), desc: t('home.howItWorks.step1.desc'), icon: "1", align: "left" },
                                { title: t('home.howItWorks.step2.title'), desc: t('home.howItWorks.step2.desc'), icon: "2", align: "right" },
                                { title: t('home.howItWorks.step3.title'), desc: t('home.howItWorks.step3.desc'), icon: "3", align: "left" },
                                { title: t('home.howItWorks.step4.title'), desc: t('home.howItWorks.step4.desc'), icon: "4", align: "right" }
                            ].map((step, idx) => (
                                <div key={idx} className={`relative flex items-center justify-between mb-16 ${step.align === 'right' ? 'flex-row-reverse' : ''} group`}>
                                    <div className="hidden md:block w-5/12"></div>
                                    <div className="absolute left-0 md:left-1/2 top-0 md:-translate-x-1/2 w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center text-white font-bold border-4 border-white dark:border-gray-900 z-10 shadow-lg group-hover:scale-110 group-hover:bg-indigo-400 transition-all duration-300">
                                        {step.icon}
                                    </div>
                                    <div className={`w-full md:w-5/12 pl-16 md:pl-0 ${step.align === 'left' ? 'md:pr-10 md:text-right' : 'md:pl-10'}`}>
                                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                                            <div className={`absolute top-0 w-1 h-full bg-indigo-700 ${step.align === 'left' ? 'right-0' : 'left-0'} transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom`}></div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                                            <p className="text-gray-500 dark:text-gray-400">{step.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- STATISTICS --- */}
                <section className="py-20 bg-indigo-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-white opacity-10 rounded-full blur-[100px]"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-10 rounded-full blur-[100px]"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                            <CounterItem value={`${stats?.totalAssessments ?? 0}+`} label={t('home.stats.assessments')} />
                            <CounterItem value={`${stats?.totalCareerPaths ?? 0}+`} label={t('home.stats.careerPaths')} />
                            <CounterItem value={`${Math.round((stats?.totalCareerInfo ?? 20000) / 1000)}K+`} label={t('home.stats.careerData')} />
                        </div>
                    </div>
                </section>

                {/* --- TESTIMONIALS --- */}
                <section className="py-24 overflow-hidden" style={{ background: 'var(--neu-bg)' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{t('home.testimonials.title')}</h2>
                    </div>
                    <div className="relative">
                        <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
                        <div className="flex w-max animate-scroll gap-6 mb-6">
                            {row1.map((item, idx) => (
                                <div key={`r1-${idx}`} className="w-[380px] bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 flex-shrink-0 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center mb-4">
                                        <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold shadow-md`}>{item.initial}</div>
                                        <div className="ml-3">
                                            <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </div>
                                        <div className="ml-auto flex gap-0.5 text-yellow-400 text-xs">{[...Array(5)].map((_, i) => <span key={i}></span>)}</div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic text-sm leading-relaxed">"{item.text}"</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex w-max animate-scroll-reverse gap-6">
                            {row2.map((item, idx) => (
                                <div key={`r2-${idx}`} className="w-[380px] bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 flex-shrink-0 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center mb-4">
                                        <div className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold shadow-md`}>{item.initial}</div>
                                        <div className="ml-3">
                                            <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </div>
                                        <div className="ml-auto flex gap-0.5 text-yellow-400 text-xs">{[...Array(5)].map((_, i) => <span key={i}></span>)}</div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 italic text-sm leading-relaxed">"{item.text}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- FAQ --- */}
                <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">{t('home.faq.title')}</h2>
                            <p className="text-gray-500 dark:text-gray-400">{t('home.faq.subtitle')}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <div className="space-y-2">
                                {faqs.map((faq, idx) => (
                                    <AccordionItem key={idx} question={faq.q} answer={faq.a} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- CTA & CONTACT --- */}
                <section className="py-24 relative overflow-hidden">
                    <div className="absolute inset-0" style={{ background: 'var(--neu-bg)' }}></div>
                    <div className="max-w-5xl mx-auto px-4 relative z-10">
                        {/* CTA Card */}
                        <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 rounded-[2.5rem] p-12 md:p-20 shadow-2xl relative overflow-hidden group mb-16">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black opacity-20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10 text-center">{t('home.cta.title')}</h2>
                            <p className="text-green-100 text-lg mb-10 max-w-2xl mx-auto relative z-10 text-center">{t('home.cta.subtitle')}</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                                <Link to="/assessment" className="px-8 py-4 bg-white text-indigo-900 rounded-full font-bold hover:bg-gray-100 hover:scale-105 transition-all shadow-lg text-center">
                                    {t('home.cta.btn')}
                                </Link>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 md:p-12 shadow-xl border border-gray-100 dark:border-gray-700">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">{t('home.contact.title')}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{t('home.contact.subtitle')}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    {[
                                        { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />, bg: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800', label: 'Email', val: 'careersystemai@gmail.com', href: 'mailto:careersystemai@gmail.com' },
                                        { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />, bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600', label: t('home.contact.responseTime'), val: t('home.contact.responseTimeValue') },
                                        { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />, bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600', label: t('home.contact.support'), val: t('home.contact.supportValue') },
                                    ].map((r, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <div className={`w-12 h-12 ${r.bg} rounded-full flex items-center justify-center`}>
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{r.icon}</svg>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{r.label}</p>
                                                {r.href ? <a href={r.href} className="text-gray-900 dark:text-white font-semibold hover:text-indigo-800 transition-colors">{r.val}</a> : <p className="text-gray-900 dark:text-white font-semibold">{r.val}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-100 dark:border-indigo-800">
                                    {!showContactForm ? (
                                        <div className="flex flex-col justify-center items-center h-full">
                                            <div className="text-6xl mb-4"></div>
                                            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('home.contact.sendTitle')}</h4>
                                            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">{t('home.contact.sendDesc')}</p>
                                            <button onClick={() => setShowContactForm(true)} className="px-8 py-4 bg-gradient-to-r from-indigo-800 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg">
                                                {t('home.contact.btn')}
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleContactSubmit} className="space-y-4">
                                            {[
                                                { label: t('home.contact.nameLabel'), key: 'name', type: 'text', ph: t('home.contact.namePlaceholder') },
                                                { label: t('home.contact.emailLabel'), key: 'email', type: 'email', ph: t('home.contact.emailPlaceholder') },
                                                { label: t('home.contact.phoneLabel'), key: 'phone', type: 'tel', ph: t('home.contact.phonePlaceholder') },
                                            ].map(f => (
                                                <div key={f.key}>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                                                    <input type={f.type} value={(contactForm as any)[f.key]} onChange={e => setContactForm({ ...contactForm, [f.key]: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent" placeholder={f.ph} />
                                                </div>
                                            ))}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('home.contact.messageLabel')}</label>
                                                <textarea required rows={3} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none" placeholder={t('home.contact.messagePlaceholder')} />
                                            </div>
                                            {contactResult && (
                                                <div className={`p-3 rounded-lg text-sm ${contactResult.success ? 'bg-indigo-50 text-indigo-900' : 'bg-red-100 text-red-700'}`}>{contactResult.message}</div>
                                            )}
                                            <div className="flex gap-3">
                                                <button type="button" onClick={() => { setShowContactForm(false); setContactResult(null); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">{t('common.cancel')}</button>
                                                <button type="submit" disabled={contactLoading} className="flex-1 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                                    {contactLoading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{t('home.contact.sending')}</> : t('home.contact.sendBtn')}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default HomePage;
