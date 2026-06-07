import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CheckCircle, AlertTriangle, Clock, BookOpen,
  DollarSign, Monitor, Globe, Mail, Sparkles, Target, Zap, Briefcase,
  Award, Calendar, FileText, TrendingUp,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import personalizedRoadmapService, { PersonalizationConfig, GenerateRoadmapPayload } from '../services/personalizedRoadmapService';
import RoadmapGeneratingOverlay from '../components/learning/RoadmapGeneratingOverlay';

const CreatePersonalizedRoadmapPage = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();

  const [config, setConfig] = useState<PersonalizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Step 1
  const [levelSlug, setLevelSlug] = useState('');
  const [durationMonths, setDurationMonths] = useState(3);
  const [dailyHours, setDailyHours] = useState(2);
  const [studyTime, setStudyTime] = useState('');
  const [weeklyPattern, setWeeklyPattern] = useState<'daily' | 'weekdays' | 'weekends' | 'flexible'>('flexible');

  // Step 2
  const [priorExperience, setPriorExperience] = useState<string>('intermediate');
  const [learningGoal, setLearningGoal] = useState<string>('skill_upgrade');
  const [targetCompanyType, setTargetCompanyType] = useState<string>('any');
  const [currentPosition, setCurrentPosition] = useState('');
  const [targetSalaryRange, setTargetSalaryRange] = useState('');

  // Step 3
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [budgetType, setBudgetType] = useState<'free' | 'paid' | 'mixed'>('mixed');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [learningStyle, setLearningStyle] = useState<'video' | 'reading' | 'practice' | 'mixed'>('mixed');
  const [projectIntensity, setProjectIntensity] = useState<string>('balanced');
  const [aiDifficultyLevel, setAiDifficultyLevel] = useState<string>('standard');
  const [preferredLanguage, setPreferredLanguage] = useState<'vi' | 'en'>('vi');
  const [certificationPriority, setCertificationPriority] = useState(false);
  const [emailReminder, setEmailReminder] = useState(false);
  const [userNotes, setUserNotes] = useState('');

  const [currentStep, setCurrentStep] = useState(1);
  const [activeSkillGroup, setActiveSkillGroup] = useState<'critical' | 'important' | 'existing'>('critical');

  useEffect(() => {
    if (!analysisId) return;
    personalizedRoadmapService.getConfig(parseInt(analysisId))
      .then((data) => {
        setConfig(data);
        setSelectedSources(data.trusted_sources.map(s => s.id));
        if (data.career_levels.length > 0) setLevelSlug(data.career_levels[0].slug);
      })
      .catch((err) => setError(err?.response?.data?.detail || 'Không thể tải cấu hình.'))
      .finally(() => setLoading(false));
  }, [analysisId]);

  const currentRules = config?.duration_rules?.[String(durationMonths)];

  const skillGroups = useMemo(() => {
    if (!config) return [];
    return [
      { key: 'critical' as const, color: 'orange' as const, value: config.total_critical, label: 'Quan trọng', skills: config.critical_skills },
      { key: 'important' as const, color: 'amber' as const, value: config.total_important, label: 'Nên có', skills: config.important_skills },
      { key: 'existing' as const, color: 'emerald' as const, value: config.total_existing, label: 'Đã có', skills: config.existing_skills },
    ];
  }, [config]);

  const activeGroup = skillGroups.find(group => group.key === activeSkillGroup) || skillGroups[0];

  // Tính các tick marks cho slider giờ học
  const sliderTicks = useMemo(() => {
    if (!currentRules) return [];
    const min = currentRules.min_hours;
    const max = currentRules.max_hours;
    const step = 0.5;
    const ticks: number[] = [];
    for (let v = min; v <= max + 0.001; v += step) {
      ticks.push(Math.round(v * 2) / 2);
    }
    return ticks;
  }, [currentRules]);

  const isStep1Valid = !!levelSlug && durationMonths >= 1 && dailyHours >= (currentRules?.min_hours || 1);

  const handleSourceToggle = (sourceId: string) => {
    setSelectedSources(prev => prev.includes(sourceId) ? prev.filter(s => s !== sourceId) : [...prev, sourceId]);
  };

  const goToStep = (n: number) => {
    setStepError(null);
    if (n === 2 && !isStep1Valid) {
      setStepError('Vui lòng chọn cấp bậc và thời gian học trước khi tiếp tục.');
      return;
    }
    setCurrentStep(n);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  const handleGenerate = async () => {
    if (!config) return;
    setGenError(null);

    if (!levelSlug) { setGenError('Vui lòng chọn cấp bậc nghề nghiệp.'); setCurrentStep(1); return; }
    if (selectedSources.length < 3) { setGenError('Vui lòng chọn ít nhất 3 nguồn khóa học.'); setCurrentStep(3); return; }
    if (currentRules && dailyHours < currentRules.min_hours) {
      setGenError(`Với ${durationMonths} tháng, cần tối thiểu ${currentRules.min_hours} giờ/ngày.`);
      setCurrentStep(1); return;
    }
    // Mixed budget yêu cầu min 300k
    if (budgetType === 'mixed' && maxBudget) {
      const v = parseFloat(maxBudget);
      if (!isNaN(v) && v > 0 && v < 300000) {
        setGenError('Khi chọn "Kết hợp" và đặt ngân sách, tối thiểu là 300,000đ.');
        setCurrentStep(3); return;
      }
    }
    // Email reminder yêu cầu giờ học cố định
    if (emailReminder && !studyTime) {
      setGenError('Để bật nhắc nhở qua email, bạn cần đặt "Giờ học cố định" ở Bước 1.');
      setCurrentStep(1); return;
    }

    setGenerating(true);
    try {
      const payload: GenerateRoadmapPayload = {
        analysis_id: config.analysis_id,
        level_slug: levelSlug,
        duration_months: durationMonths,
        daily_hours: dailyHours,
        study_time: studyTime || null,
        preferred_sources: selectedSources,
        budget_type: budgetType === 'mixed' && maxBudget ? 'budget' : budgetType,
        max_budget: budgetType === 'mixed' && maxBudget ? parseFloat(maxBudget) : null,
        learning_style: learningStyle,
        preferred_language: preferredLanguage,
        email_reminder: emailReminder,
        weekly_pattern: weeklyPattern,
        project_intensity: projectIntensity as any,
        prior_experience: priorExperience as any,
        learning_goal: learningGoal as any,
        target_company_type: targetCompanyType as any,
        ai_difficulty_level: aiDifficultyLevel as any,
        certification_priority: certificationPriority,
        current_position: currentPosition.trim() || undefined,
        target_salary_range: targetSalaryRange.trim() || undefined,
        user_notes: userNotes.trim() || undefined,
      };
      const result = await personalizedRoadmapService.generate(payload);
      if (result.status === 'ready') {
        navigate(`/learning-path/view/${result.id}`);
      } else if (result.status === 'failed') {
        setGenError(result.error || 'Tạo lộ trình thất bại.');
      }
    } catch (err: any) {
      setGenError(err?.response?.data?.detail || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-slate-600 font-medium">Đang tải...</span>
        </div>
      </MainLayout>
    );
  }

  if (error || !config) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-slate-700 font-semibold mb-4">{error || 'Không tải được dữ liệu.'}</p>
          <button onClick={() => navigate('/learning-path')} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">Quay lại</button>
        </div>
      </MainLayout>
    );
  }

  const opts = config.personalization_options;

  return (
    <MainLayout>
      {/* Overlay nhẹ khi đang tạo lộ trình - chỉ hỏi xác nhận khi user muốn thoát */}
      <RoadmapGeneratingOverlay
        visible={generating}
        onConfirmExit={() => {
          // User xác nhận thoát: huỷ generate và quay về
          setGenerating(false);
          navigate('/learning-path');
        }}
      />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
        {/* Header - màu tím nhẹ */}
        <div className="bg-gradient-to-br from-indigo-100 via-violet-100 to-purple-100 dark:from-indigo-950/40 dark:via-violet-950/40 dark:to-purple-950/40 border-b border-indigo-200/50 dark:border-indigo-900/50 py-8 px-6">
          <div className="max-w-5xl mx-auto">
            <button onClick={() => navigate('/learning-path')} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 mb-3 text-sm font-medium">
              <ArrowLeft size={16} /> Quay lại Lộ trình học tập
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">Tạo lộ trình cá nhân hóa</h1>
            {/* Tên nghề LỚN */}
            <h2 className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 leading-tight">
              {config.career_title}
            </h2>
            {config.match_percentage != null && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Phù hợp {Math.round(config.match_percentage)}%</p>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 mt-6">
          {/* Skills Map */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 mb-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Target size={16} className="text-indigo-500" /> Bản đồ kỹ năng
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {skillGroups.map(group => (
                <StatBox
                  key={group.key}
                  color={group.color}
                  value={group.value}
                  label={group.label}
                  active={activeSkillGroup === group.key}
                  onClick={() => setActiveSkillGroup(group.key)}
                />
              ))}
            </div>
            {activeGroup && (
              <SkillTagList
                label={`${activeGroup.label}:`}
                skills={activeGroup.skills}
                colorClass={activeGroup.color === 'orange'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : activeGroup.color === 'amber'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
              />
            )}
          </div>

          {/* Step indicator - to hơn, không che số */}
          <div className="flex items-center justify-center gap-3 mb-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <button
                  onClick={() => goToStep(s)}
                  className={`w-12 h-12 rounded-full font-bold text-base transition-all flex items-center justify-center ${
                    currentStep === s ? 'bg-indigo-500 text-white shadow-lg ring-4 ring-indigo-100 dark:ring-indigo-900/30' :
                    currentStep > s ? 'bg-indigo-400 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {currentStep > s ? <CheckCircle size={20} /> : s}
                </button>
                {s < 3 && <div className={`w-16 h-1 mx-1 rounded ${currentStep > s ? 'bg-indigo-400' : 'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
            {currentStep === 1 && 'Bước 1: Cấp bậc & Thời gian'}
            {currentStep === 2 && 'Bước 2: Bối cảnh cá nhân'}
            {currentStep === 3 && 'Bước 3: Phong cách học tập'}
          </p>

          {stepError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">{stepError}</p>
            </div>
          )}

          {/* ═══ STEP 1 ═══ */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <SectionCard icon={<BookOpen size={16} />} title="Cấp bậc nghề nghiệp">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {config.career_levels.map((lv) => (
                    <SelectButton key={lv.id} active={levelSlug === lv.slug} onClick={() => setLevelSlug(lv.slug)}>
                      <div className="font-semibold text-sm">{lv.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{lv.min_exp}-{lv.max_exp || '10+'} năm KN</div>
                    </SelectButton>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={<Clock size={16} />} title="Thời gian học">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Tổng thời gian (tháng)</label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                        const isActive = durationMonths === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setDurationMonths(m);
                              const r = config.duration_rules[String(m)];
                              if (r) {
                                if (dailyHours < r.min_hours) setDailyHours(r.min_hours);
                                else if (dailyHours > r.max_hours) setDailyHours(r.max_hours);
                              }
                            }}
                            style={{
                              width: '100%',
                              height: 40,
                              borderRadius: 8,
                              fontSize: 14,
                              fontWeight: 700,
                              border: isActive ? '2px solid #6366f1' : '2px solid #e2e8f0',
                              background: isActive ? '#eef2ff' : '#ffffff',
                              color: isActive ? '#3730a3' : '#64748b',
                              cursor: 'pointer',
                              transition: 'border-color 0.15s, background 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor = '#a5b4fc';
                                e.currentTarget.style.background = '#f8fafc';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.background = '#ffffff';
                              }
                            }}
                          >{m}</button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {currentRules ? `${currentRules.desc} · ${currentRules.min_hours}-${currentRules.max_hours}h/ngày` : ''}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">
                      Giờ học/ngày: <strong className="text-indigo-600">{dailyHours}h</strong>
                    </label>
                    <input
                      type="range"
                      min={currentRules?.min_hours || 1}
                      max={currentRules?.max_hours || 8}
                      step={0.5}
                      value={dailyHours}
                      onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                      list="hour-ticks"
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    {/* Tick marks - chia đều theo step 0.5h */}
                    <datalist id="hour-ticks">
                      {sliderTicks.map(t => <option key={t} value={t} label={`${t}h`} />)}
                    </datalist>
                    <div className="relative mt-1.5 h-5">
                      {sliderTicks.map((t, i) => {
                        const min = currentRules?.min_hours || 1;
                        const max = currentRules?.max_hours || 8;
                        const pct = ((t - min) / (max - min)) * 100;
                        // Chỉ hiện label ở các điểm chính
                        const showLabel = i === 0 || i === sliderTicks.length - 1 || i === Math.floor(sliderTicks.length / 2);
                        return (
                          <div key={t} className="absolute top-0 -translate-x-1/2" style={{ left: `${pct}%` }}>
                            <div style={{ width: 2, height: 8, background: '#64748b', margin: '0 auto', borderRadius: 1 }} />
                            {showLabel && (
                              <div style={{ fontSize: 11, color: '#334155', marginTop: 2, fontWeight: 700, whiteSpace: 'nowrap' }}>{t}h</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Pattern học theo tuần</label>
                    <div className="grid grid-cols-2 gap-2">
                      {opts.weekly_patterns.map((p) => (
                        <SelectButton key={p.value} active={weeklyPattern === p.value} onClick={() => setWeeklyPattern(p.value as any)} small>
                          <div className="font-semibold text-xs">{p.label}</div>
                          <div className="text-[10px] text-slate-500">{p.desc}</div>
                        </SelectButton>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Giờ học cố định (tùy chọn)</label>
                    <input
                      type="time"
                      value={studyTime}
                      onChange={(e) => setStudyTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      ⏰ Định dạng 24h. <strong>SA</strong> (sáng): 06:00-11:59 · <strong>CH</strong> (chiều): 12:00-17:59 · <strong>Tối</strong>: 18:00-23:00
                    </p>
                    <p className="text-[11px] text-slate-500">Hệ thống sẽ nhắc qua email khi tới giờ</p>
                  </div>
                </div>
              </SectionCard>

              <NavButtons disabled={!isStep1Valid} onNext={() => goToStep(2)} />
            </div>
          )}

          {/* ═══ STEP 2 ═══ */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <SectionCard icon={<TrendingUp size={16} />} title="Mục tiêu học">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {opts.learning_goals.map((g) => (
                    <SelectButton key={g.value} active={learningGoal === g.value} onClick={() => setLearningGoal(g.value)}>
                      <div className="font-semibold text-sm">{g.label}</div>
                    </SelectButton>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={<Award size={16} />} title="Kinh nghiệm hiện tại">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {opts.prior_experiences.map((e) => (
                    <SelectButton key={e.value} active={priorExperience === e.value} onClick={() => setPriorExperience(e.value)}>
                      <div className="font-semibold text-sm">{e.label}</div>
                    </SelectButton>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={<Briefcase size={16} />} title="Loại công ty mục tiêu">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  {opts.target_company_types.map((c) => (
                    <SelectButton key={c.value} active={targetCompanyType === c.value} onClick={() => setTargetCompanyType(c.value)}>
                      <div className="font-semibold text-sm">{c.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{c.desc}</div>
                    </SelectButton>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={<FileText size={16} />} title="Bối cảnh cá nhân (tùy chọn)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Vị trí hiện tại</label>
                    <input type="text" maxLength={200} value={currentPosition} onChange={(e) => setCurrentPosition(e.target.value)}
                      placeholder="VD: Junior Frontend Dev tại XYZ"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mức lương mong muốn</label>
                    <input type="text" maxLength={100} value={targetSalaryRange} onChange={(e) => setTargetSalaryRange(e.target.value)}
                      placeholder="VD: 20-30 triệu/tháng"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú thêm cho AI</label>
                  <textarea maxLength={1000} value={userNotes} onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="VD: Tôi đã học React 6 tháng nhưng yếu về testing. Muốn đi sâu vào TypeScript..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
                  <p className="text-[11px] text-slate-500 mt-1">{userNotes.length}/1000 — AI dùng để cá nhân hóa sâu hơn</p>
                </div>
              </SectionCard>

              <NavButtons onPrev={() => goToStep(1)} onNext={() => goToStep(3)} />
            </div>
          )}

          {/* ═══ STEP 3 ═══ */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <SectionCard icon={<Globe size={16} />} title="Nguồn khóa học (chọn ít nhất 3)">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {config.trusted_sources.map((src) => (
                    <SelectButton key={src.id} active={selectedSources.includes(src.id)} onClick={() => handleSourceToggle(src.id)}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-semibold text-sm">{src.name}</div>
                        {selectedSources.includes(src.id) && <CheckCircle size={12} className="text-indigo-500 flex-shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{src.strength}</div>
                    </SelectButton>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Đã chọn: {selectedSources.length}/6 (tối thiểu 3)</p>
              </SectionCard>

              <SectionCard icon={<DollarSign size={16} />} title="Ngân sách">
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  <SelectButton active={budgetType === 'free'} onClick={() => setBudgetType('free')}>
                    <div className="font-semibold text-sm">Miễn phí</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Chỉ khóa học free</div>
                  </SelectButton>
                  <SelectButton active={budgetType === 'mixed'} onClick={() => setBudgetType('mixed')}>
                    <div className="font-semibold text-sm">Kết hợp</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Free + có thể đặt giới hạn</div>
                  </SelectButton>
                  <SelectButton active={budgetType === 'paid'} onClick={() => setBudgetType('paid')}>
                    <div className="font-semibold text-sm">Trả phí</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Ưu tiên chất lượng cao</div>
                  </SelectButton>
                </div>
                {budgetType === 'mixed' && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Đặt ngân sách tối đa (tùy chọn, tối thiểu 300,000đ)
                    </label>
                    <input
                      type="number"
                      min={300000}
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                      placeholder="VD: 1500000 (để trống = không giới hạn)"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      💡 Để trống nếu không muốn giới hạn. Có giới hạn → AI sẽ ưu tiên free + cân đối paid để vừa ngân sách.
                    </p>
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={<Monitor size={16} />} title="Phong cách học">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {([
                    { value: 'video', label: 'Video', desc: 'Bài giảng' },
                    { value: 'reading', label: 'Đọc', desc: 'Sách, tài liệu' },
                    { value: 'practice', label: 'Thực hành', desc: 'Code lab' },
                    { value: 'mixed', label: 'Kết hợp', desc: 'Đa dạng' },
                  ] as const).map((o) => (
                    <SelectButton key={o.value} active={learningStyle === o.value} onClick={() => setLearningStyle(o.value)}>
                      <div className="font-semibold text-sm">{o.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{o.desc}</div>
                    </SelectButton>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={<Target size={16} />} title="Cường độ dự án thực hành">
                <div className="grid grid-cols-3 gap-2.5">
                  {opts.project_intensities.map((p) => (
                    <SelectButton key={p.value} active={projectIntensity === p.value} onClick={() => setProjectIntensity(p.value)}>
                      <div className="font-semibold text-sm">{p.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                    </SelectButton>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={<Zap size={16} />} title="Mức độ khó AI điều chỉnh">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {opts.ai_difficulty_levels.map((l) => (
                    <SelectButton key={l.value} active={aiDifficultyLevel === l.value} onClick={() => setAiDifficultyLevel(l.value)}>
                      <div className="font-semibold text-sm">{l.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{l.desc}</div>
                    </SelectButton>
                  ))}
                </div>
              </SectionCard>

              <SectionCard icon={<Calendar size={16} />} title="Tùy chọn khác">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ngôn ngữ khóa học</label>
                    <div className="grid grid-cols-2 gap-2">
                      <SelectButton active={preferredLanguage === 'vi'} onClick={() => setPreferredLanguage('vi')} small>
                        <div className="font-semibold text-sm">Tiếng Việt</div>
                      </SelectButton>
                      <SelectButton active={preferredLanguage === 'en'} onClick={() => setPreferredLanguage('en')} small>
                        <div className="font-semibold text-sm">Tiếng Anh</div>
                      </SelectButton>
                    </div>
                  </div>
                  <CheckboxOption
                    checked={certificationPriority}
                    onChange={setCertificationPriority}
                    icon={<Award size={14} />}
                    title="Ưu tiên có chứng chỉ"
                    desc="Mỗi tháng có ít nhất 1 khóa cấp cert"
                  />
                </div>
                <CheckboxOption
                  checked={emailReminder}
                  onChange={setEmailReminder}
                  icon={<Mail size={14} />}
                  title="Nhắc nhở qua email"
                  desc="Gửi email khi đến giờ học cố định"
                />
              </SectionCard>

              {genError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{genError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => goToStep(2)} disabled={generating}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl">
                  ← Quay lại
                </button>
                <button onClick={handleGenerate} disabled={generating}
                  className="flex-1 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2">
                  {generating ? (
                    <><Loader2 size={18} className="animate-spin" /> AI đang tạo lộ trình... (30-60 giây)</>
                  ) : (
                    <><Sparkles size={18} /> Tạo lộ trình cá nhân hóa</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

// ─── Reusable components ────────────────────────────────────────────

const SectionCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
      <span className="text-indigo-500">{icon}</span> {title}
    </h3>
    {children}
  </div>
);

const SelectButton = ({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: small ? '10px' : '12px',
      borderRadius: 12,
      border: active ? '2px solid #6366f1' : '2px solid #e2e8f0',
      background: active ? '#eef2ff' : '#ffffff',
      color: active ? '#3730a3' : '#475569',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'border-color 0.15s, background 0.15s',
      width: '100%',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.borderColor = '#a5b4fc';
        e.currentTarget.style.background = '#f8fafc';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.background = '#ffffff';
      }
    }}
  >
    {children}
  </button>
);

const NavButtons = ({ onPrev, onNext, disabled }: { onPrev?: () => void; onNext: () => void; disabled?: boolean }) => (
  <div className="flex gap-3">
    {onPrev && (
      <button onClick={onPrev} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl">
        ← Quay lại
      </button>
    )}
    <button
      onClick={onNext}
      disabled={disabled}
      className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl"
    >
      Tiếp theo →
    </button>
  </div>
);

const StatBox = ({ color, value, label, active, onClick }: {
  color: 'orange' | 'amber' | 'emerald';
  value: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) => {
  const styles = {
    orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles[color]} rounded-xl p-3 text-center border transition-all ${active ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:shadow-sm'}`}
    >
      <div className="text-xl font-black">{value}</div>
      <div className="text-[11px] font-semibold mt-0.5">{label}</div>
    </button>
  );
};

const SkillTagList = ({ label, skills, colorClass }: { label: string; skills: string[]; colorClass: string }) => (
  <div className="mb-2">
    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {skills.slice(0, 12).map((s, i) => (
        <span key={i} className={`px-2 py-0.5 ${colorClass} text-xs rounded font-medium border`}>{s}</span>
      ))}
      {skills.length > 12 && <span className="text-xs text-slate-500">+{skills.length - 12}</span>}
    </div>
  </div>
);

const CheckboxOption = ({ checked, onChange, icon, title, desc }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <label className="flex items-start gap-3 cursor-pointer p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg hover:border-indigo-300 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 mt-0.5 text-indigo-500 rounded border-slate-300 focus:ring-indigo-500 flex-shrink-0"
    />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">{icon} {title}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
    </div>
  </label>
);

export default CreatePersonalizedRoadmapPage;
