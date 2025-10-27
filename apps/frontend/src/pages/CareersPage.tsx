import { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { careerService, CareerItem } from '../services/careerService';
import { Link } from 'react-router-dom';

const CareersPage = () => {
  const [items, setItems] = useState<CareerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await careerService.list();
        setItems(data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Careers</h1>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((c) => (
              <Link key={c.id} to={`/careers/${c.id}`} className="block bg-white dark:bg-gray-800 p-5 rounded-xl shadow hover:shadow-lg transition">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{c.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{c.short_desc || c.description || 'No description'}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CareersPage;

