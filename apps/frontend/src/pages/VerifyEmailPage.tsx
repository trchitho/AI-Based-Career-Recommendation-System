import { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { authTokenService } from '../services/authTokenService';

const VerifyEmailPage = () => {
  const [token, setToken] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await authTokenService.verify(token);
      setDone('Email verified successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Verify Email</h1>
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full border rounded px-3 py-2" placeholder="Verification token" value={token} onChange={(e)=>setToken(e.target.value)} />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Verify</button>
        </form>
        {done && <div className="mt-4 text-green-700">{done}</div>}
        {error && <div className="mt-4 text-red-700">{error}</div>}
      </div>
    </MainLayout>
  );
};

export default VerifyEmailPage;

