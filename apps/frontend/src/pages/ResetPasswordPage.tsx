import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { authTokenService } from "../services/authTokenService";

const useQuery = () => new URLSearchParams(useLocation().search);

const ResetPasswordPage = () => {
  const q = useQuery();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = q.get("token");
    if (t) setToken(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await authTokenService.reset(token, password);
      setDone("Password reset successfully. You may login now.");
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <input
            className="w-full border rounded px-3 py-2"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">
            Reset
          </button>
        </form>
        {done && <div className="mt-4 text-green-700">{done}</div>}
        {error && <div className="mt-4 text-red-700">{error}</div>}
      </div>
    </MainLayout>
  );
};

export default ResetPasswordPage;
