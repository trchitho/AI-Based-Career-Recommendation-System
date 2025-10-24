"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/signin", { email, password });
      const { token, role } = res.data as { token: string; role?: string };
      localStorage.setItem("token", token);
      const r = (role || "user").toString().toLowerCase();
      router.push(r === "admin" ? "/admin" : "/user");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const res = await api.get("/auth/google/start");
      const url = res.data?.auth_url as string;
      if (url) window.location.href = url;
    } catch (e) {
      setError("Google OAuth chưa được cấu hình");
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Đăng nhập</h1>
      <form onSubmit={handleSignin} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div style={{ color: "red" }}>{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>
      <hr style={{ margin: "16px 0" }} />
      <button onClick={handleGoogle}>Đăng nhập bằng Google</button>
    </div>
  );
}

