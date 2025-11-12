import { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { recommendationService, RecommendationItem } from '../services/recommendationService';
import { careerService, CareerItem } from '../services/careerService';

const RecommendationsPage = () => {
  const [items, setItems] = useState<(RecommendationItem & { career?: CareerItem })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setError(null);
      try {
        const res = await recommendationService.generate();
        const list = res.recommendations || [];
        const withCareers = await Promise.all(list.map(async (r) => ({ ...r, career: await careerService.get(r.career_id) })));
        setItems(withCareers);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || 'Failed');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300 p-5">Career Recommendations</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-700">{error}</div>}
        {!loading && !error && (
          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.career_id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow flex justify-between items-center">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{it.career?.title || it.career_id}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 max-w-3xl">{it.career?.description || it.career?.short_desc}</div>
                </div>
                <div className="text-purple-600 font-bold">{Math.round(it.score * 100)}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RecommendationsPage;

