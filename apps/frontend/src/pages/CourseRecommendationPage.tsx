import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, Sparkles, ExternalLink, PlayCircle, Award, Video } from "lucide-react";
import courseService, {
  CourseRecommendation,
  CourseRecommendationsResponse,
} from "../services/courseService";

// Platform badge colors
const PLATFORM_COLORS: Record<string, string> = {
  coursera: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  udemy: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  edx: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  youtube: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const RELEVANCE_COLORS: Record<string, string> = {
  "Highly Relevant": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Relevant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Related: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const LEVEL_ICONS: Record<string, string> = {
  beginner: "🟢",
  intermediate: "🟡",
  advanced: "🔴",
};

interface Props {
  missingSkills?: string[];   // pass from SkillGapPage
}

const CourseRecommendationPage = ({ missingSkills: propSkills }: Props) => {
  const [data, setData] = useState<CourseRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputSkills, setInputSkills] = useState<string>(
    propSkills?.join(", ") ?? ""
  );
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch if skills are passed as props
  useEffect(() => {
    if (propSkills && propSkills.length > 0) {
      setInputSkills(propSkills.join(", "));
      fetchRecommendations(propSkills);
    }
  }, []);

  const fetchRecommendations = async (skills?: string[]) => {
    const parsed =
      skills ??
      inputSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (!parsed.length) return;

    try {
      setLoading(true);
      setError(null);
      const result = await courseService.getRecommendations(parsed, 3);
      setData(result);
      setActiveSkill(null);
    } catch (e: any) {
      // On any error, build online search links as fallback
      const onlineRecs = parsed.flatMap(skill => [
        { platform: 'coursera', name: 'Coursera', urlTpl: `https://www.coursera.org/search?query=${encodeURIComponent(skill + ' course')}`, free: false },
        { platform: 'udemy',    name: 'Udemy',    urlTpl: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}`, free: false },
        { platform: 'youtube',  name: 'YouTube',  urlTpl: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`, free: true },
      ].slice(0, 3).map(p => ({
        course: { id: 0, external_id: `online_${p.platform}_${skill}`, title: `${skill} — Tìm trên ${p.name}`, url: p.urlTpl, platform: p.platform, rating: 4.5, num_reviews: 0, price: 0, is_free: p.free, language: 'vi', tags: [skill] },
        skill_name: skill, similarity_score: 0.85, relevance_label: 'Highly Relevant',
      })));
      setData({ missing_skills: parsed, recommendations: onlineRecs as any, total: onlineRecs.length, source: 'online_search' });
      setActiveSkill(null);
    } finally {
      setLoading(false);
    }
  };

  // Filter by active skill tab
  const displayed: CourseRecommendation[] = data
    ? activeSkill
      ? data.recommendations.filter((r) => r.skill_name === activeSkill)
      : data.recommendations
    : [];

  const uniqueSkills = data
    ? [...new Set(data.recommendations.map((r) => r.skill_name))]
    : [];

  return (
    <div className="p-4 sm:p-6 bg-transparent min-h-screen space-y-6 relative">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-4"
      >
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-inner">
          <BookOpen className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Course Recommendations</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            AI-matched courses for your missing skills
          </p>
        </div>
      </motion.div>

      {/* Skill input */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass bg-white/70 dark:bg-gray-800/50 rounded-3xl border border-gray-200/50 dark:border-white/10 shadow-xl p-6 sm:p-8"
      >
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          Enter skills you want to learn (comma-separated)
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={inputSkills}
              onChange={(e) => setInputSkills(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
              placeholder="e.g. Python, Machine Learning, SQL"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none bg-white dark:bg-gray-900 shadow-inner text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fetchRecommendations()}
            disabled={loading || !inputSkills.trim()}
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Find Courses
          </motion.button>
        </div>

        {/* Quick skill chips */}
        <div className="flex flex-wrap gap-2.5 mt-5">
          {["Python", "Machine Learning", "SQL", "React", "Docker", "AWS"].map((s) => (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={s}
              onClick={() => {
                const current = inputSkills ? inputSkills.split(",").map(x => x.trim()).filter(Boolean) : [];
                if (!current.includes(s)) {
                  const next = [...current, s].join(", ");
                  setInputSkills(next);
                }
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-full border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              + {s}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-sm font-medium text-red-700 dark:text-red-300 shadow-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Results */}
      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-6">
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 glass bg-white/50 dark:bg-gray-800/30 p-4 rounded-2xl border border-gray-200/50 dark:border-white/5">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
              {data.source === 'online_search'
                ? <><Sparkles className="w-4 h-4 text-indigo-500" /> Tìm thấy <span className="font-bold text-indigo-600 dark:text-indigo-400">{data.total}</span> link tìm kiếm trực tuyến cho {data.missing_skills.length} kỹ năng</>
                : <><Award className="w-4 h-4 text-indigo-500" /> Found <span className="font-bold text-indigo-600 dark:text-indigo-400">{data.total}</span> courses for <span className="font-bold text-gray-900 dark:text-white">{data.missing_skills.length}</span> skills</>
              }
              <span className={`ml-2 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full ${data.source === 'online_search' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {data.source === 'online_search' ? 'Online Search' : `via ${data.source}`}
              </span>
            </p>

            {/* Skill filter tabs */}
            {uniqueSkills.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveSkill(null)}
                  className={`px-4 py-2 text-xs rounded-xl font-bold transition-all ${
                    activeSkill === null
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  All Skills
                </button>
                {uniqueSkills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => setActiveSkill(skill === activeSkill ? null : skill)}
                    className={`px-4 py-2 text-xs rounded-xl font-bold transition-all ${
                      activeSkill === skill
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Course cards grid */}
          {displayed.length === 0 ? (
            <div className="glass bg-white/50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center text-gray-500 font-medium">
              No courses found for the selected skill.
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {displayed.map((rec, i) => (
                <CourseCard key={`${rec.course.external_id}-${i}`} rec={rec} />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass bg-white/40 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-16 text-center"
        >
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-300 dark:text-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <BookOpen className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to learn?</h3>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto">
            Enter skills above to discover personalized course recommendations tailored for your career path.
          </p>
        </motion.div>
      )}
    </div>
  );
};


// ── Course Card ────────────────────────────────────────────────────
const CourseCard = ({ rec }: { rec: CourseRecommendation }) => {
  const { course } = rec;
  const platformColor =
    PLATFORM_COLORS[course.platform?.toLowerCase()] ??
    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";

  return (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -5 }}
      className="glass bg-white/70 dark:bg-gray-800/60 rounded-3xl border border-gray-200/50 dark:border-white/10 shadow-lg flex flex-col overflow-hidden transition-all"
    >
      {/* Thumbnail */}
      {course.thumbnail ? (
        <div className="relative">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-40 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
        </div>
      ) : (
        <div className={`w-full h-40 flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
          course.external_id?.startsWith('online_')
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
        }`}>
          {/* subtle pattern overlay */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          
          <div className="relative z-10 p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl text-white">
            {course.external_id?.startsWith('online_') ? (
              course.platform === 'youtube' ? <Video className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />
            ) : (
              <BookOpen className="w-8 h-8" />
            )}
          </div>
          <span className="relative z-10 text-[10px] font-black text-white/90 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full">
            {course.external_id?.startsWith('online_') && course.platform === 'youtube' ? 'YouTube Tutorial' : 
             course.external_id?.startsWith('online_') && course.platform === 'coursera' ? 'Coursera Search' : 
             course.platform ? course.platform : 'Course Platform'}
          </span>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${platformColor}`}>
            {course.platform}
          </span>
          {course.level && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {LEVEL_ICONS[course.level] ?? ""} {course.level}
            </span>
          )}
          <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${
            RELEVANCE_COLORS[rec.relevance_label] ?? RELEVANCE_COLORS["Related"]
          }`}>
            {rec.relevance_label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-1">
          {course.title}
        </h3>

        {/* Instructor */}
        {course.instructor && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {course.instructor}
          </p>
        )}

        {/* Skill tag */}
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4 bg-gray-100 dark:bg-gray-800/50 inline-block px-2.5 py-1 rounded-lg self-start">
          For skill: <span className="font-bold text-indigo-600 dark:text-indigo-400">{rec.skill_name}</span>
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
          {course.rating > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {course.rating.toFixed(1)}
            </span>
          )}
          {course.duration_hrs && (
            <span>{course.duration_hrs}h</span>
          )}
          <span className={course.is_free ? "text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md" : "text-gray-600 dark:text-gray-400 font-medium"}>
            {course.is_free ? "Free" : `$${course.price}`}
          </span>
        </div>

        {/* Similarity bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Match score</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {(rec.similarity_score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden border border-gray-300/30 dark:border-gray-600/30">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              style={{ width: `${Math.min(rec.similarity_score * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          {course.url ? (
            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg ${
                course.external_id?.startsWith('online_')
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                  : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
              }`}
            >
              {course.external_id?.startsWith('online_') ? <><Search className="w-4 h-4"/> Tìm kiếm ngay</> : <><ExternalLink className="w-4 h-4"/> View Course</>}
            </a>
          ) : (
            <button disabled className="block w-full text-center py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 font-bold rounded-xl text-sm">
              No link available
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CourseRecommendationPage;
