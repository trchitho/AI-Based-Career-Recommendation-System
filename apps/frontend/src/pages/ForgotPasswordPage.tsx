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
    setLoading(true); setError(null);
    try {
      const resp = await authTokenService.forgot(email);
      setSent('If this email exists, we have sent instructions.' + (resp?.dev_token ? ` DEV TOKEN: ${resp.dev_token}` : ''));
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full border rounded px-3 py-2" placeholder="your@email.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <button disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">{loading? 'Sending...' : 'Send Instructions'}</button>
        </form>
        {sent && <div className="mt-4 text-green-700">{sent}</div>}
        {error && <div className="mt-4 text-red-700">{error}</div>}
      </div>
    </MainLayout>
  );
};

export default ForgotPasswordPage;

