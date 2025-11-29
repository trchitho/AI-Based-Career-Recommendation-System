import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { authTokenService } from '../services/authTokenService';

const useQuery = () => new URLSearchParams(useLocation().search);

const ResetPasswordPage = () => {
  const q = useQuery();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = q.get('token');
    if (t) setToken(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await authTokenService.reset(token, password);
      setDone('Password reset successfully. You may login now.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed');
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Reset Password</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="Token" value={token} onChange={(e)=>setToken(e.target.value)} />
          <input className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" type="password" placeholder="New password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <button className="w-full px-4 py-2 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg hover:bg-[#3d6449] dark:hover:bg-green-700 transition">Reset</button>
        </form>
        {done && <div className="mt-4 text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 p-3 rounded-lg border border-green-300 dark:border-green-700">{done}</div>}
        {error && <div className="mt-4 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border border-red-300 dark:border-red-700">{error}</div>}
        </div>
      </div>
      </div>
    </MainLayout>
  );
};

export default ResetPasswordPage;

