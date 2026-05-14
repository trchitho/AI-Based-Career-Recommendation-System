import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  Search,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import courseService, {
  CourseRecommendation,
  CourseRecommendationsResponse,
} from "../services/courseService";
import { translateSkillName } from "../utils/skillTranslation";

type PriorityGroup = "critical" | "important" | "nice_to_have";

interface SkillGroups {
  critical?: string[];
  important?: string[];
  nice_to_have?: string[];
}

interface Props {
  analysisId?: number;
  missingSkills?: string[];
  skillGroups?: SkillGroups;
  ownedSkills?: string[];
  careerName?: string;
}

const GROUP_META: Record<PriorityGroup, {
  label: string;
  caption: string;
  badge: string;
  border: string;
  dot: string;
}> = {
  critical: {
    label: "Thiếu nghiêm trọng",
    caption: "Ưu tiên học trước để đạt yêu cầu cốt lõi của nghề.",
    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/25 dark:text-red-200 dark:border-red-800",
    border: "border-red-200 dark:border-red-900/60",
    dot: "bg-red-500",
  },
  important: {
    label: "Quan trọng",
    caption: "Bổ sung để tăng độ cạnh tranh và chất lượng hồ sơ.",
    badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/25 dark:text-orange-200 dark:border-orange-800",
    border: "border-orange-200 dark:border-orange-900/60",
    dot: "bg-orange-500",
  },
  nice_to_have: {
    label: "Nên có",
    caption: "Học sau để mở rộng năng lực và điểm cộng khi phỏng vấn.",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-800",
    border: "border-amber-200 dark:border-amber-900/60",
    dot: "bg-amber-500",
  },
};

const PLATFORM_COLORS: Record<string, string> = {
  coursera: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  edx: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  udemy: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  freecodecamp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "linkedin learning": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
};

const SOURCE_LABELS: Record<string, string> = {
  cache: "Đã lưu từ lần tìm trước",
  gemini: "Gemini AI kiểm duyệt nguồn",
  fallback_db_search: "Fallback DB/Search",
  online_search: "Link tìm kiếm",
  neo4j: "Neo4j",
  postgresql: "Database",
  fallback: "Embedding fallback",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

const normalizeSkill = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const unique = (items: string[] = [], owned = new Set<string>()) => {
  const seen = new Set<string>();
  return items
    .map((s) => String(s || "").trim())
    .filter((s) => {
      const key = normalizeSkill(s);
      if (!s || seen.has(key) || owned.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const inferGroup = (rec: CourseRecommendation): PriorityGroup =>
  (rec.priority_group as PriorityGroup) || "important";

const buildSafeUrl = (rec: CourseRecommendation) => {
  const url = rec.course.url;
  if (url?.startsWith("http")) return url;
  const q = encodeURIComponent(`${rec.course.title} ${rec.skill_name} course`);
  return `https://www.coursera.org/search?query=${q}`;
};

const CourseRecommendationPage = ({
  analysisId,
  missingSkills: propSkills,
  skillGroups,
  ownedSkills,
  careerName,
}: Props) => {
  const ownedSet = useMemo(
    () => new Set((ownedSkills || []).map(normalizeSkill)),
    [ownedSkills]
  );
  const initialGroups = useMemo<Required<SkillGroups>>(() => {
    if (skillGroups) {
      return {
        critical: unique(skillGroups.critical, ownedSet),
        important: unique(skillGroups.important, ownedSet),
        nice_to_have: unique(skillGroups.nice_to_have, ownedSet),
      };
    }
    return {
      critical: [],
      important: unique(propSkills || [], ownedSet),
      nice_to_have: [],
    };
  }, [skillGroups, propSkills, ownedSet]);

  const [data, setData] = useState<CourseRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<PriorityGroup | "all">("all");
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [manualSkills, setManualSkills] = useState("");

  const allInitialSkills = useMemo(
    () => [...initialGroups.critical, ...initialGroups.important, ...initialGroups.nice_to_have],
    [initialGroups]
  );

  useEffect(() => {
    if (allInitialSkills.length > 0) {
      fetchRecommendations(initialGroups);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, JSON.stringify(initialGroups)]);

  const fetchRecommendations = async (groups?: Required<SkillGroups>) => {
    const targetGroups = groups || {
      critical: [],
      important: unique(manualSkills.split(","), ownedSet),
      nice_to_have: [],
    };
    const totalSkills = targetGroups.critical.length + targetGroups.important.length + targetGroups.nice_to_have.length;
    if (!totalSkills) return;

    try {
      setLoading(true);
      setError(null);
      const result = groups || skillGroups
        ? await courseService.getSkillGapRecommendations({
          analysis_id: analysisId,
          critical: targetGroups.critical,
          important: targetGroups.important,
          nice_to_have: targetGroups.nice_to_have,
          owned_skills: ownedSkills || [],
          career_name: careerName,
          topK: 3,
        })
        : await courseService.getRecommendations(targetGroups.important, 3);
      setData(result);
      setActiveGroup("all");
      setActiveSkill(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Không tải được gợi ý khóa học");
    } finally {
      setLoading(false);
    }
  };

  const groupedRecommendations = useMemo(() => {
    const base: Record<PriorityGroup, CourseRecommendation[]> = {
      critical: [],
      important: [],
      nice_to_have: [],
    };
    (data?.recommendations || []).forEach((rec) => {
      base[inferGroup(rec)].push(rec);
    });
    return base;
  }, [data]);

  const visibleGroups = (["critical", "important", "nice_to_have"] as PriorityGroup[])
    .filter((group) => activeGroup === "all" || activeGroup === group);

  const skillChips = useMemo(() => {
    const fromData = data?.recommendations
      ?.filter((rec) => activeGroup === "all" || inferGroup(rec) === activeGroup)
      .map((r) => r.skill_name);
    const fromInitial = activeGroup === "all"
      ? allInitialSkills
      : initialGroups[activeGroup];
    const source = fromData?.length ? fromData : fromInitial;
    return unique(source);
  }, [data, activeGroup, allInitialSkills, initialGroups]);

  const filteredBySkill = (items: CourseRecommendation[]) =>
    activeSkill ? items.filter((r) => normalizeSkill(r.skill_name) === normalizeSkill(activeSkill)) : items;

  const allVisibleRecommendations = useMemo(
    () => visibleGroups.flatMap((group) => filteredBySkill(groupedRecommendations[group])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleGroups.join("|"), activeSkill, groupedRecommendations]
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-2xl shadow-inner">
          <BookOpen className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-950 dark:text-white tracking-tight">Gợi ý khóa học</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            Khóa học được gợi ý theo các kỹ năng nghề còn thiếu
          </p>
        </div>
      </div>

      <div className="bg-white/85 dark:bg-gray-900/70 rounded-3xl border border-gray-200/70 dark:border-white/10 shadow-xl p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Kỹ năng còn thiếu dùng để tìm khóa học
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={manualSkills}
                onChange={(e) => setManualSkills(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
                placeholder="Ví dụ: Python, Machine Learning, SQL"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>
          <button
            onClick={() => fetchRecommendations()}
            disabled={loading || !manualSkills.trim()}
            className="px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
            Tìm khóa học
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["critical", "important", "nice_to_have"] as PriorityGroup[]).map((group) => (
            <button
              key={group}
              onClick={() => {
                setActiveGroup(activeGroup === group ? "all" : group);
                setActiveSkill(null);
              }}
              className={`text-left rounded-2xl border p-4 transition-all ${GROUP_META[group].border} ${activeGroup === group ? "ring-2 ring-indigo-500 bg-indigo-50/60 dark:bg-indigo-900/20" : "bg-gray-50/70 dark:bg-gray-950/30 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-black border ${GROUP_META[group].badge}`}>
                  <span className={`w-2 h-2 rounded-full ${GROUP_META[group].dot}`} />
                  {GROUP_META[group].label}
                </span>
                <span className="text-lg font-black text-gray-900 dark:text-white">
                  {initialGroups[group].length}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{GROUP_META[group].caption}</p>
            </button>
          ))}
        </div>

        {skillChips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSkill(null)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border ${!activeSkill ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}
            >
              Tất cả kỹ năng
            </button>
            {skillChips.map((skill) => (
              <button
                key={skill}
                onClick={() => setActiveSkill(activeSkill === skill ? null : skill)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border ${activeSkill === skill ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}
              >
                {translateSkillName(skill)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white/80 dark:bg-gray-900/60 rounded-2xl border border-gray-200/70 dark:border-white/10 p-4">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <Award className="w-4 h-4 text-indigo-500" />
            <span>Có <b className="text-indigo-600 dark:text-indigo-300">{data.total}</b> khóa học cho <b>{data.missing_skills.length}</b> kỹ năng còn thiếu</span>
            <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {SOURCE_LABELS[data.source] || data.source}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            Chỉ dùng 5 nguồn: Coursera, edX, Udemy, freeCodeCamp, LinkedIn Learning
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white/80 dark:bg-gray-900/60 rounded-3xl border border-gray-200/70 dark:border-white/10 p-10 text-center">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-gray-900 dark:text-white">Đang dùng AI tìm khóa học phù hợp...</p>
        </div>
      )}

      {!loading && data && activeGroup === "all" && allVisibleRecommendations.length > 0 && (
        <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white/85 dark:bg-gray-900/70 shadow-lg overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-white/10 flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/25 dark:text-indigo-200 dark:border-indigo-800">
                Tất cả khóa học
              </span>
              <h2 className="mt-3 text-xl font-black text-gray-950 dark:text-white">Khóa học phù hợp</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tổng hợp theo toàn bộ kỹ năng còn thiếu.</p>
            </div>
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{allVisibleRecommendations.length} khóa học</span>
          </div>
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {allVisibleRecommendations.map((rec, i) => <CourseCard key={`all-${rec.course.external_id}-${i}`} rec={rec} />)}
          </div>
        </section>
      )}

      {!loading && data && activeGroup !== "all" && visibleGroups.map((group) => {
        const items = filteredBySkill(groupedRecommendations[group]);
        if (items.length === 0) return null;
        return (
          <section key={group} className={`rounded-3xl border ${GROUP_META[group].border} bg-white/85 dark:bg-gray-900/70 shadow-lg overflow-hidden`}>
            <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-white/10 flex items-start justify-between gap-4">
              <div>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border ${GROUP_META[group].badge}`}>
                  <span className={`w-2 h-2 rounded-full ${GROUP_META[group].dot}`} />
                  {GROUP_META[group].label}
                </span>
                <h2 className="mt-3 text-xl font-black text-gray-950 dark:text-white">
                  {GROUP_META[group].label === "Thiếu nghiêm trọng" ? "Học trước" : GROUP_META[group].label}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{GROUP_META[group].caption}</p>
              </div>
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{items.length} khóa học</span>
            </div>
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((rec, i) => <CourseCard key={`${group}-${rec.course.external_id}-${i}`} rec={rec} />)}
            </div>
          </section>
        );
      })}

      {!loading && !data && (
        <div className="bg-white/70 dark:bg-gray-900/60 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-14 text-center">
          <GraduationCap className="w-14 h-14 mx-auto text-indigo-300 mb-4" />
          <h3 className="text-xl font-black text-gray-950 dark:text-white">Sẵn sàng tìm khóa học theo skill gap</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Nhập kỹ năng hoặc mở từ phân tích CV để nhận gợi ý theo 3 mức ưu tiên.</p>
        </div>
      )}
    </section>
  );
};

const CourseCard = ({ rec }: { rec: CourseRecommendation }) => {
  const { course } = rec;
  const platformColor = PLATFORM_COLORS[course.platform?.toLowerCase()] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const group = inferGroup(rec);
  const safeUrl = buildSafeUrl(rec);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col"
    >
      <div className="h-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 p-4 flex items-start justify-between">
        <div className="p-3 bg-white/20 text-white rounded-2xl border border-white/25">
          <BookOpen className="w-6 h-6" />
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${GROUP_META[group].badge}`}>
          {GROUP_META[group].label}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${platformColor}`}>{course.platform}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{LEVEL_LABELS[course.level || ""] || course.level || "Không rõ cấp độ"}</span>
        </div>

        <h3 className="text-base font-black text-gray-950 dark:text-white leading-snug line-clamp-2">{course.title}</h3>
        {course.instructor && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{course.instructor}</p>}

        <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 rounded-lg px-2.5 py-1 self-start">
          Kỹ năng: <span className="text-indigo-600 dark:text-indigo-300">{translateSkillName(rec.skill_name)}</span>
        </p>

        {rec.reason && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{rec.reason}</p>}

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Metric icon={<Star className="w-3.5 h-3.5 text-yellow-400" />} label={course.rating ? course.rating.toFixed(1) : "N/A"} />
          <Metric icon={<Clock className="w-3.5 h-3.5 text-indigo-400" />} label={course.duration_hrs ? `${course.duration_hrs}h` : "N/A"} />
          <Metric icon={<Wallet className="w-3.5 h-3.5 text-emerald-500" />} label={course.is_free ? "Miễn phí" : course.price ? `$${course.price}` : "Có phí"} />
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Độ phù hợp</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{Math.round(rec.similarity_score * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${Math.min(100, rec.similarity_score * 100)}%` }} />
          </div>
        </div>

        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-sm font-black hover:opacity-90 transition-opacity"
        >
          Mở nguồn học <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </motion.article>
  );
};

const Metric = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-2 py-2 flex items-center justify-center gap-1 font-bold text-gray-700 dark:text-gray-300">
    {icon}
    <span>{label}</span>
  </div>
);

export default CourseRecommendationPage;
