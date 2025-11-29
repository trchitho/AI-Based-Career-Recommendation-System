import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { profileService } from '../services/profileService';
import { assessmentService } from '../services/assessmentService';

const ChatSummaryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true); setError(null);
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
        lines.push(`Name: ${profile.first_name || ''} ${profile.last_name || ''}`.trim());
        lines.push(`Email: ${profile.email}`);
        if (profile.date_of_birth) lines.push(`DOB: ${profile.date_of_birth}`);
        lines.push('');
        if (latest?.id) {
          lines.push(`# Latest Assessment`);
          lines.push(`Assessment ID: ${latest.id}`);
        }
        if (results?.scores) {
          lines.push('');
          lines.push(`# Scores`);
          if (results.scores.RIASEC) {
            lines.push(`RIASEC: ${JSON.stringify(results.scores.RIASEC)}`);
          }
          if (results.scores.BIG_FIVE || results.scores.BigFive) {
            lines.push(`BigFive: ${JSON.stringify(results.scores.BIG_FIVE || results.scores.BigFive)}`);
          }
        }
        if (results?.career_recommendations?.length) {
          lines.push('');
          lines.push(`# Recommended Careers`);
          lines.push(`${results.career_recommendations.join(', ')}`);
        }
        setSummary(lines.join('\n'));
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || 'Failed to build summary');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const proceed = () => {
    navigate('/chat', { state: { summary } });
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Chat Summary</h1>
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7C59] dark:border-green-600"></div>
          </div>
        )}
        {error && <div className="text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border border-red-300 dark:border-red-700">{error}</div>}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-300 mb-2">This is the context that will be sent to the Career Assistant.</p>
            <textarea className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 h-64 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200" value={summary} onChange={(e)=>setSummary(e.target.value)} />
            <div className="mt-4 flex justify-end">
              <button onClick={proceed} className="px-4 py-2 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg hover:bg-[#3d6449] dark:hover:bg-green-700 transition">Start Chat</button>
            </div>
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  );
};

export default ChatSummaryPage;

