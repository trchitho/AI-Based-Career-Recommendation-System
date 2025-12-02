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
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7C59] dark:border-green-600"></div>
          </div>
        )}
        {!loading && item && (
          <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
            <p className="text-gray-700 dark:text-gray-300">{item.description || item.short_desc}</p>
            <div className="pt-4">
              <Link to={`/careers/${item.id}/roadmap`} className="inline-block px-4 py-2 rounded-lg bg-[#4A7C59] dark:bg-green-600 text-white hover:bg-[#3d6449] dark:hover:bg-green-700 transition">View Roadmap</Link>
            </div>
          </div>
        )}
      </div>
      </div>
    </MainLayout>
  );
};

export default CareerDetailPage;

