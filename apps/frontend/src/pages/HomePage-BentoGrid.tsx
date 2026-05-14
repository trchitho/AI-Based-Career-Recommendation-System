export const BentoGridSection = () => {
    const riasecBars = [
        {
            label: 'Realistic',
            value: 74,
            style: { background: 'linear-gradient(90deg, #fb7185, #f43f5e)' },
        },
        {
            label: 'Investigative',
            value: 86,
            style: { background: 'linear-gradient(90deg, #facc15, #f59e0b)' },
        },
        {
            label: 'Artistic',
            value: 58,
            style: { background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' },
        },
        {
            label: 'Social',
            value: 81,
            style: { background: 'linear-gradient(90deg, #3b82f6, #2563eb)' },
        },
    ];

    return (
        <section className="relative w-full py-16">
            <div className="mx-auto max-w-[1180px] space-y-5 px-6">
                {/* CARD 1: AI CAREER ASSESSMENT */}
                <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/85 p-9 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)] hover:-translate-y-1 dark:border-slate-700/50 dark:bg-slate-900/75">
                    <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.08),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.07),transparent_32%)]" />

                    <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto]">
                        {/* Left: Content */}
                        <div>
                            <div className="mb-6 flex h-[56px] w-[56px] items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-800">
                                <svg
                                    className="h-7 w-7 text-violet-600 dark:text-violet-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.4}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>

                            <h3 className="mb-4 text-[28px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white">
                                Đánh giá nghề nghiệp bằng AI
                            </h3>

                            <p className="max-w-[520px] text-[16px] leading-[1.75] text-slate-600 dark:text-slate-300">
                                Khám phá con đường nghề nghiệp lý tưởng với bài đánh giá toàn diện RIASEC & Big Five được hỗ trợ bởi phân tích AI tiên tiến.
                            </p>
                        </div>

                        {/* Right: RIASEC Stats */}
                        <div className="flex items-center lg:min-w-[420px]">
                            <div className="group w-full rounded-[1.2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] hover:border-violet-200/60 dark:border-slate-700/60 dark:bg-slate-800/80 dark:hover:border-violet-700/40">
                                <div className="mb-6 flex items-center gap-5 border-b border-slate-200 pb-6 dark:border-slate-700">
                                    <div className="relative flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-[22px] font-bold text-white shadow-[0_10px_28px_rgba(109,40,217,0.28)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_32px_rgba(109,40,217,0.35)]">
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <span className="relative">R</span>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div className="h-2.5 w-[140px] rounded-full bg-gradient-to-r from-violet-300 to-violet-400 dark:from-violet-500 dark:to-violet-600 animate-[shimmer_3s_linear_infinite] bg-[length:200%_100%]" />
                                        <div className="h-2.5 w-[80px] rounded-full bg-slate-200 dark:bg-slate-700 animate-[pulse_2s_ease-in-out_infinite]" />
                                    </div>

                                    <div className="relative h-5 w-5 rounded-full bg-violet-600 shadow-[0_0_18px_rgba(124,58,237,0.5)] animate-[pulse_2s_ease-in-out_infinite]">
                                        <div className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-75" />
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {riasecBars.map((item, index) => (
                                        <div key={item.label} className="group/bar grid grid-cols-[100px_1fr] items-center gap-4">
                                            <span className="text-[15px] font-medium text-slate-600 transition-colors duration-300 group-hover/bar:text-slate-900 dark:text-slate-300 dark:group-hover/bar:text-white">
                                                {item.label}
                                            </span>

                                            <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out group-hover/bar:scale-x-105"
                                                    style={{
                                                        width: `${item.value}%`,
                                                        ...item.style,
                                                        animationDelay: `${index * 0.1}s`,
                                                    }}
                                                />
                                                {/* Shimmer effect */}
                                                <div
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover/bar:opacity-100 transition-opacity duration-500"
                                                    style={{
                                                        animation: 'shimmer 2s linear infinite',
                                                        animationDelay: `${index * 0.15}s`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <div className="flex items-center gap-2.5 text-[18px] font-bold text-slate-950 transition-all duration-300 hover:scale-105 dark:text-white">
                                        <span className="relative h-2.5 w-2.5 rounded-full bg-violet-600">
                                            <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-75" />
                                        </span>
                                        Match: 95%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2 & 3: Two Column Layout */}
                <div className="grid gap-5 lg:grid-cols-2">
                    {/* CARD 2: SKILL GAP ANALYSIS */}
                    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/85 p-9 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)] hover:-translate-y-1 dark:border-slate-700/50 dark:bg-slate-900/75">
                        <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_100%_0%,rgba(168,85,247,0.15),transparent_35%),radial-gradient(circle_at_60%_45%,rgba(139,92,246,0.06),transparent_36%)]" />

                        <div className="relative z-10">
                            <div className="mb-6 flex h-[56px] w-[56px] items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-800">
                                <svg
                                    className="h-7 w-7 text-violet-600 dark:text-violet-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.4}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                            </div>

                            <h3 className="mb-4 text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white">
                                Phân tích khoảng cách kỹ năng
                            </h3>

                            <p className="mb-8 text-[15px] leading-[1.7] text-slate-600 dark:text-slate-300">
                                Xác định các kỹ năng còn thiếu cho nghề nghiệp mơ ước của bạn.
                            </p>

                            {/* ORBIT - ENHANCED WITH PREMIUM EFFECTS */}
                            <div className="relative mx-auto h-[240px] max-w-[380px]">
                                {/* Multi-layer ambient glow background */}
                                <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-violet-400/25 via-purple-400/15 to-transparent blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
                                <div className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-blue-400/20 via-indigo-400/10 to-transparent blur-2xl animate-[pulse_3.5s_ease-in-out_infinite_reverse]" />

                                {/* Rotating dashed rings with enhanced effects */}
                                <div className="absolute left-1/2 top-1/2 h-[255px] w-[255px] -translate-x-1/2 -translate-y-1/2 animate-[spin_42s_linear_infinite] rounded-full border-2 border-dashed border-violet-300/60 opacity-50 blur-[0.8px]" />
                                <div className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 animate-[spin_38s_linear_infinite] rounded-full border border-dashed border-purple-300/50 opacity-40 blur-[0.6px]" />
                                <div className="absolute left-1/2 top-1/2 h-[185px] w-[185px] -translate-x-1/2 -translate-y-1/2 animate-[spin_35s_linear_infinite_reverse] rounded-full border-2 border-dashed border-violet-300/70 opacity-60 blur-[0.4px]" />

                                {/* Soft halo rings with pulse */}
                                <div className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/12 animate-[pulse_3.5s_ease-in-out_infinite]" />
                                <div className="absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/18 animate-[pulse_3s_ease-in-out_infinite_reverse]" />

                                {/* Center orb with enhanced glow, pulse and shimmer */}
                                <div className="absolute left-1/2 top-1/2 h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-400/30 to-purple-500/30 blur-xl animate-[pulse_3s_ease-in-out_infinite]" />
                                <div className="absolute left-1/2 top-1/2 flex h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] shadow-[0_0_70px_rgba(124,58,237,0.5),0_0_110px_rgba(124,58,237,0.25),0_20px_50px_rgba(109,40,217,0.45)] animate-[pulse_3s_ease-in-out_infinite] before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
                                    <svg
                                        className="h-12 w-12 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] animate-[pulse_2.5s_ease-in-out_infinite]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.3}
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </div>

                                {/* Floating icons with enhanced effects and glow */}
                                <div className="absolute left-[30px] top-[15px] group cursor-pointer">
                                    <div className="absolute inset-0 rounded-full bg-violet-500/40 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 animate-[pulse_3s_ease-in-out_infinite]" />
                                    <div className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 shadow-[0_8px_24px_rgba(139,92,246,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_32px_rgba(139,92,246,0.6)] animate-[float_5s_ease-in-out_infinite]">
                                        <svg className="h-7 w-7 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17l6-6 4 4 8-8" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="absolute right-[18px] top-[5px] group cursor-pointer">
                                    <div className="absolute inset-0 rounded-full bg-blue-500/40 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 animate-[pulse_3.2s_ease-in-out_infinite]" />
                                    <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_8px_24px_rgba(59,130,246,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_32px_rgba(59,130,246,0.6)] animate-[float_4.5s_ease-in-out_0.5s_infinite]">
                                        <svg className="h-8 w-8 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="absolute bottom-[12px] left-[30px] group cursor-pointer">
                                    <div className="absolute inset-0 rounded-full bg-pink-500/40 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 animate-[pulse_3.4s_ease-in-out_infinite]" />
                                    <div className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-[0_8px_24px_rgba(236,72,153,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_32px_rgba(236,72,153,0.6)] animate-[float_5.5s_ease-in-out_1s_infinite]">
                                        <svg className="h-7 w-7 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="absolute bottom-[8px] right-[22px] group cursor-pointer">
                                    <div className="absolute inset-0 rounded-full bg-orange-500/40 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300 animate-[pulse_3.6s_ease-in-out_infinite]" />
                                    <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-[0_8px_24px_rgba(251,146,60,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_32px_rgba(251,146,60,0.6)] animate-[float_6s_ease-in-out_1.5s_infinite]">
                                        <svg className="h-8 w-8 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative mt-6 overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50/80 via-purple-50/60 to-violet-50/80 p-4 transition-all duration-300 hover:border-violet-300 hover:shadow-[0_8px_24px_rgba(139,92,246,0.15)] dark:border-violet-800/60 dark:bg-gradient-to-r dark:from-violet-950/40 dark:via-purple-950/30 dark:to-violet-950/40">
                                {/* Animated gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-200/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-[shimmer_2s_linear_infinite]" />

                                <div className="relative flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>

                                    <p className="text-[14px] font-semibold leading-relaxed text-violet-700 transition-colors duration-300 group-hover:text-violet-800 dark:text-violet-200 dark:group-hover:text-violet-100">
                                        Bổ sung đúng kỹ năng – Rút ngắn khoảng cách – Đạt mục tiêu nhanh hơn!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: CAREER ROADMAP */}
                    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/85 p-9 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)] hover:-translate-y-1 dark:border-slate-700/50 dark:bg-slate-900/75">
                        <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_15%_15%,rgba(59,130,246,0.08),transparent_36%)]" />

                        <div className="relative z-10">
                            <div className="mb-6 flex h-[56px] w-[56px] items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-800">
                                <svg
                                    className="h-7 w-7 text-blue-500 dark:text-blue-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                    />
                                </svg>
                            </div>

                            <h3 className="mb-4 text-[24px] font-extrabold tracking-[-0.02em] text-slate-950 dark:text-white">
                                Lộ trình nghề nghiệp
                            </h3>

                            <p className="mb-8 text-[15px] leading-[1.7] text-slate-600 dark:text-slate-300">
                                Lộ trình học tập cá nhân hóa dẫn đến thành công.
                            </p>

                            <div className="rounded-xl bg-blue-50/65 px-8 py-8 dark:bg-slate-800/75">
                                <div className="flex items-center justify-center">
                                    {[1, 2, 3, 4].map((step, index) => (
                                        <div key={step} className="flex items-center">
                                            <div
                                                className={[
                                                    'flex h-12 w-12 items-center justify-center rounded-full text-base font-bold transition-all duration-300',
                                                    step <= 2
                                                        ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] hover:scale-105'
                                                        : 'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                                                    step === 2 ? 'animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_26px_rgba(59,130,246,0.38)]' : '',
                                                ].join(' ')}
                                            >
                                                {step}
                                            </div>

                                            {index < 3 && (
                                                <div className="relative h-1 w-[60px]">
                                                    {/* Base connector line */}
                                                    <div
                                                        className={[
                                                            'absolute inset-0 rounded-full',
                                                            step < 2
                                                                ? 'bg-slate-200 dark:bg-slate-700'
                                                                : 'bg-slate-300 dark:bg-slate-700',
                                                        ].join(' ')}
                                                    />

                                                    {/* Animated loading connector from step 1 to step 2 */}
                                                    {step === 1 && (
                                                        <div
                                                            className="absolute inset-0 animate-[progressFlow_1.8s_linear_infinite] rounded-full"
                                                            style={{
                                                                background: 'linear-gradient(90deg, #3B82F6, #60A5FA, #2563EB, #60A5FA, #3B82F6)',
                                                                backgroundSize: '200% 100%',
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
