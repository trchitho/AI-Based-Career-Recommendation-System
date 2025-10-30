import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { profileService } from "../services/profileService";
import { assessmentService } from "../services/assessmentService";

const ChatSummaryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await profileService.getProfileData();
        const profile = data.profile;
        const latest = data.assessmentHistory?.[0];
        let results: any = null;
        if (latest?.id) {
          try {
            results = await assessmentService.getResults(latest.id);
          } catch (_) {}
        }

        const lines: string[] = [];
        lines.push(`# User Context`);
        lines.push(
          `Name: ${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
        );
        lines.push(`Email: ${profile.email}`);
        if (profile.date_of_birth) lines.push(`DOB: ${profile.date_of_birth}`);
        lines.push("");
        if (latest?.id) {
          lines.push(`# Latest Assessment`);
          lines.push(`Assessment ID: ${latest.id}`);
        }
        if (results?.scores) {
          lines.push("");
          lines.push(`# Scores`);
          if (results.scores.RIASEC) {
            lines.push(`RIASEC: ${JSON.stringify(results.scores.RIASEC)}`);
          }
          if (results.scores.BIG_FIVE || results.scores.BigFive) {
            lines.push(
              `BigFive: ${JSON.stringify(results.scores.BIG_FIVE || results.scores.BigFive)}`,
            );
          }
        }
        if (results?.career_recommendations?.length) {
          lines.push("");
          lines.push(`# Recommended Careers`);
          lines.push(`${results.career_recommendations.join(", ")}`);
        }
        setSummary(lines.join("\n"));
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Failed to build summary",
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const proceed = () => {
    navigate("/chat", { state: { summary } });
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Chat Summary</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-700">{error}</div>}
        {!loading && !error && (
          <>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              This is the context that will be sent to the Career Assistant.
            </p>
            <textarea
              className="w-full border rounded px-3 py-2 h-64 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={proceed}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Start Chat
              </button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ChatSummaryPage;
