import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { careerService, CareerItem } from '../services/careerService';

const CareerDetailPage = () => {
  const { idOrSlug } = useParams();
  const [item, setItem] = useState<CareerItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        if (!idOrSlug) return;
        const data = await careerService.get(idOrSlug);
        setItem(data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [idOrSlug]);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && <div>Loading...</div>}
        {!loading && item && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
            <p className="text-gray-700 dark:text-gray-300">{item.description || item.short_desc}</p>
            <div className="pt-4">
              <Link to={`/careers/${item.id}/roadmap`} className="inline-block px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">View Roadmap</Link>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CareerDetailPage;

