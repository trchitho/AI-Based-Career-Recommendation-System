import { useState, useEffect } from "react";
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
  "Highly Relevant": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Relevant: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
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
    <div className="p-6 bg-[#F8F9FA] dark:bg-gray-900 min-h-screen space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Recommendations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            AI-matched courses for your missing skills
          </p>
        </div>
      </div>

      {/* Skill input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Enter skills you want to learn (comma-separated)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={inputSkills}
            onChange={(e) => setInputSkills(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
            placeholder="e.g. Python, Machine Learning, SQL"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => fetchRecommendations()}
            disabled={loading || !inputSkills.trim()}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            Find Courses
          </button>
        </div>

        {/* Quick skill chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {["Python", "Machine Learning", "SQL", "React", "Docker", "AWS"].map((s) => (
            <button
              key={s}
              onClick={() => {
                const current = inputSkills ? inputSkills.split(",").map(x => x.trim()).filter(Boolean) : [];
                if (!current.includes(s)) {
                  const next = [...current, s].join(", ");
                  setInputSkills(next);
                }
              }}
              className="px-2.5 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-900/20 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {data && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.source === 'online_search'
                ? <>Tìm thấy <span className="font-semibold text-indigo-700">{data.total}</span> link tìm kiếm trực tuyến cho {data.missing_skills.length} kỹ năng</>
                : <>Found <span className="font-semibold text-gray-900 dark:text-white">{data.total}</span> courses for <span className="font-semibold text-gray-900 dark:text-white">{data.missing_skills.length}</span> skills</>
              }
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${data.source === 'online_search' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                {data.source === 'online_search' ? '🌐 Online Search' : `via ${data.source}`}
              </span>
            </p>
          </div>

          {/* Skill filter tabs */}
          {uniqueSkills.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveSkill(null)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  activeSkill === null
                    ? "bg-green-600 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                All Skills
              </button>
              {uniqueSkills.map((skill) => (
                <button
                  key={skill}
                  onClick={() => setActiveSkill(skill === activeSkill ? null : skill)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    activeSkill === skill
                      ? "bg-green-600 text-white"
                      : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          )}

          {/* Course cards grid */}
          {displayed.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-10 text-center text-gray-400 text-sm">
              No courses found for the selected skill.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayed.map((rec, i) => (
                <CourseCard key={`${rec.course.external_id}-${i}`} rec={rec} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Enter skills above to discover personalized course recommendations
          </p>
        </div>
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      {course.thumbnail ? (
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-36 object-cover rounded-t-xl"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className={`w-full h-36 rounded-t-xl flex flex-col items-center justify-center gap-2 ${
          course.external_id?.startsWith('online_')
            ? 'bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30'
            : 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20'
        }`}>
          {course.external_id?.startsWith('online_') ? (
            <>
              <span className="text-3xl">
                {course.platform === 'youtube' ? '▶️' : course.platform === 'coursera' ? '🎓' : '🎯'}
              </span>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                {course.platform === 'youtube' ? 'YouTube Tutorial' : course.platform === 'coursera' ? 'Coursera' : 'Udemy'}
              </span>
            </>
          ) : (
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )}
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
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
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-1">
          {course.title}
        </h3>

        {/* Instructor */}
        {course.instructor && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {course.instructor}
          </p>
        )}

        {/* Skill tag */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          For skill:{" "}
          <span className="font-medium text-green-600 dark:text-green-400">{rec.skill_name}</span>
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
          <span className={course.is_free ? "text-green-600 font-medium" : "text-gray-500"}>
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
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-green-500"
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
              className={`block w-full text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                course.external_id?.startsWith('online_')
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {course.external_id?.startsWith('online_') ? '🔍 Tìm kiếm ngay →' : 'View Course →'}
            </a>
          ) : (
            <button disabled className="block w-full text-center py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-lg text-sm">
              No link available
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseRecommendationPage;
