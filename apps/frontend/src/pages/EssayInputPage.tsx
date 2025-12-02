import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { assessmentService } from '../services/assessmentService';

const EssayInputPage = () => {
  const [text, setText] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setDone(null);
    try {
      await assessmentService.submitEssay({ assessmentId: 'latest', essayText: text });
      setDone('Essay submitted for NLP processing.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed');
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Essay Input</h1>
        <form onSubmit={submit} className="space-y-4">
          <textarea className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 h-48 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="Write about yourself or your goals..." value={text} onChange={(e)=>setText(e.target.value)} />
          <button className="w-full px-4 py-2 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg hover:bg-[#3d6449] dark:hover:bg-green-700 transition">Submit Essay</button>
        </form>
        {done && <div className="mt-4 text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 p-3 rounded-lg border border-green-300 dark:border-green-700">{done}</div>}
        {error && <div className="mt-4 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border border-red-300 dark:border-red-700">{error}</div>}
        </div>
      </div>
      </div>
    </MainLayout>
  );
};

export default EssayInputPage;

