import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { authTokenService } from '../services/authTokenService';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email to receive the reset link.');
      return;
    }
    setLoading(true); setError(null); setSent(null);
    try {
      const resp = await authTokenService.forgot(email);
      setSent('If this email exists, we have sent instructions.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5EFE7] dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Forgot Password</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            placeholder="your@email.com"
            type="email"
            required
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
          <button disabled={loading} className="w-full px-4 py-2 bg-[#4A7C59] dark:bg-green-600 text-white rounded-lg hover:bg-[#3d6449] dark:hover:bg-green-700 disabled:opacity-50 transition">{loading? 'Sending...' : 'Send Instructions'}</button>
        </form>
        {sent && <div className="mt-4 text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 p-3 rounded-lg border border-green-300 dark:border-green-700">{sent}</div>}
        {error && <div className="mt-4 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg border border-red-300 dark:border-red-700">{error}</div>}
        </div>
      </div>
      </div>
    </MainLayout>
  );
};

export default ForgotPasswordPage;

