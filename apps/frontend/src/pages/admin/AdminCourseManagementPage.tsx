import { useState, useEffect, useCallback } from "react";
import courseService from "../../services/courseService";

interface PipelineStatus {
  total_courses: number;
  embedded_courses: number;
  total_mappings: number;
  neo4j_synced: boolean;
  platforms?: Record<string, number>;
}

interface CrawlLog {
  id: number;
  time: string;
  message: string;
  type: "info" | "success" | "error";
}

const DEFAULT_KEYWORDS = [
  "Python", "Machine Learning", "Data Science", "SQL", "React",
  "Docker", "AWS", "JavaScript", "Java", "Deep Learning",
];

const AdminCourseManagementPage = () => {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Pipeline actions
  const [running, setRunning] = useState<string | null>(null);

  // Crawl form
  const [crawlKeywords, setCrawlKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [platforms, setPlatforms] = useState<{ udemy: boolean; coursera: boolean; linkedin: boolean }>({
    udemy: true,
    coursera: true,
    linkedin: true,
  });
  const [pageSize, setPageSize] = useState(10);

  // Logs
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const logId = { current: 0 };

  const addLog = useCallback((message: string, type: CrawlLog["type"] = "info") => {
    const now = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { id: ++logId.current, time: now, message, type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await courseService.getPipelineStatus();
      setStatus(data);
    } catch {
      // silently ignore
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleAction = async (label: string, fn: () => Promise<unknown>) => {
    setRunning(label);
    addLog(`Starting: ${label}...`);
    try {
      const res = await fn();
      addLog(`Done: ${label} — ${JSON.stringify(res)}`, "success");
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${label} — ${msg}`, "error");
    } finally {
      setRunning(null);
    }
  };

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (kw && !crawlKeywords.includes(kw)) {
      setCrawlKeywords((prev) => [...prev, kw]);
    }
    setKwInput("");
  };

  const removeKeyword = (kw: string) =>
    setCrawlKeywords((prev) => prev.filter((k) => k !== kw));

  const toggleDefaultKeyword = (kw: string) => {
    setCrawlKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const handleCrawl = () => {
    const selectedPlatforms = Object.entries(platforms)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (selectedPlatforms.length === 0) {
      addLog("Please select at least one platform.", "error");
      return;
    }

    handleAction("Real-time Crawl", () =>
      courseService.crawlCourses({
        keywords: crawlKeywords.length > 0 ? crawlKeywords : undefined,
        platforms: selectedPlatforms,
        page_size: pageSize,
      })
    );
  };

  const statCards = status
    ? [
        {
          label: "Total Courses",
          value: status.total_courses,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
          label: "Embedded",
          value: status.embedded_courses,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          ),
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-50 dark:bg-purple-900/20",
        },
        {
          label: "Skill Mappings",
          value: status.total_mappings,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          ),
          color: "text-green-600 dark:text-green-400",
          bg: "bg-green-50 dark:bg-green-900/20",
        },
        {
          label: "Neo4j Synced",
          value: status.neo4j_synced ? "Yes" : "No",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: status.neo4j_synced
            ? "text-green-600 dark:text-green-400"
            : "text-orange-600 dark:text-orange-400",
          bg: status.neo4j_synced
            ? "bg-green-50 dark:bg-green-900/20"
            : "bg-orange-50 dark:bg-orange-900/20",
        },
      ]
    : [];

  return (
    <div className="p-6 bg-[#F8F9FA] dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Course Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage course catalog, embeddings, and real-time crawling</p>
        </div>
        <button
          onClick={fetchStatus}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
        >
          <svg className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Status Cards */}
      {loadingStatus ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-green-100 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0 ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Platform breakdown */}
      {status && status.platforms && Object.keys(status.platforms).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Courses by Platform</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(status.platforms).map(([platform, count]) => (
              <div key={platform} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className={`w-2 h-2 rounded-full ${platform === "udemy" ? "bg-purple-500" : platform === "coursera" ? "bg-blue-500" : platform === "linkedin" ? "bg-sky-600" : "bg-green-500"}`} />
                <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{platform}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Pipeline Actions
          </h2>

          <div className="space-y-2">
            {[
              {
                key: "seed",
                label: "1. Seed Static Courses",
                desc: "Load built-in course dataset (idempotent)",
                fn: () => courseService.seedCourses(),
              },
              {
                key: "embed",
                label: "2. Run Embeddings",
                desc: "Generate SBERT vectors for un-embedded courses",
                fn: () => courseService.embedCourses(),
              },
              {
                key: "map",
                label: "3. Build Skill Map",
                desc: "Compute cosine similarity between skills and courses",
                fn: () => courseService.buildSkillMap(),
              },
              {
                key: "neo4j",
                label: "4. Sync Neo4j",
                desc: "Push course-skill relationships to graph DB",
                fn: () => courseService.syncNeo4j(),
              },
              {
                key: "all",
                label: "Run Full Pipeline",
                desc: "Steps 1–4 in sequence",
                fn: () => courseService.runFullPipeline(),
                primary: true,
              },
            ].map((action) => (
              <button
                key={action.key}
                onClick={() => handleAction(action.label, action.fn)}
                disabled={running !== null}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.primary
                    ? "bg-green-600 hover:bg-green-700 border-green-600 text-white"
                    : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className={`text-xs mt-0.5 ${action.primary ? "text-green-100" : "text-gray-500 dark:text-gray-400"}`}>{action.desc}</p>
                </div>
                {running === action.label ? (
                  <div className={`w-4 h-4 border-2 ${action.primary ? "border-green-200 border-t-white" : "border-gray-300 border-t-green-600"} rounded-full animate-spin flex-shrink-0`} />
                ) : (
                  <svg className={`w-4 h-4 flex-shrink-0 ${action.primary ? "text-green-100" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Crawl */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Real-time Crawl
          </h2>

          {/* Platforms */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Platforms</p>
            <div className="flex gap-3">
              {(["udemy", "coursera", "linkedin"] as const).map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platforms[p]}
                    onChange={(e) => setPlatforms((prev) => ({ ...prev, [p]: e.target.checked }))}
                    className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{p}</span>
                  {p === "linkedin" && (
                    <span className="text-xs text-gray-400">(needs li_at cookie)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Keywords</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                placeholder="Add keyword..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={addKeyword}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
            {/* Default keywords */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DEFAULT_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  onClick={() => toggleDefaultKeyword(kw)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    crawlKeywords.includes(kw)
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>
            {/* Custom keywords */}
            {crawlKeywords.filter((k) => !DEFAULT_KEYWORDS.includes(k)).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {crawlKeywords
                  .filter((k) => !DEFAULT_KEYWORDS.includes(k))
                  .map((kw) => (
                    <span key={kw} className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-blue-900 dark:hover:text-blue-100">×</button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Page size */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Results per keyword</p>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n} courses</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCrawl}
            disabled={running !== null}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {running === "Real-time Crawl" ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-300 border-t-white rounded-full animate-spin" />
                Crawling...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Start Crawl
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
            Leave keywords empty to use all defaults. Results auto-embedded after crawl.
          </p>
        </div>
      </div>

      {/* Activity Log */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Activity Log
          </h2>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            Actions will be logged here.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap pt-0.5">{log.time}</span>
                <span
                  className={`flex-1 ${
                    log.type === "success"
                      ? "text-green-600 dark:text-green-400"
                      : log.type === "error"
                      ? "text-red-500 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourseManagementPage;
