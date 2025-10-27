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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Essay Input</h1>
        <form onSubmit={submit} className="space-y-4">
          <textarea className="w-full border rounded px-3 py-2 h-48" placeholder="Write about yourself or your goals..." value={text} onChange={(e)=>setText(e.target.value)} />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Submit Essay</button>
        </form>
        {done && <div className="mt-4 text-green-700">{done}</div>}
        {error && <div className="mt-4 text-red-700">{error}</div>}
      </div>
    </MainLayout>
  );
};

export default EssayInputPage;

