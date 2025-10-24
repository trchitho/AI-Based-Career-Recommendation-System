"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/signup", {
        email,
        password,
        full_name: fullName || undefined,
      });
      const { token, role } = res.data as { token: string; role?: string };
      localStorage.setItem("token", token);
      const r = (role || "user").toString().toLowerCase();
      router.push(r === "admin" ? "/admin" : "/user");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Đăng ký</h1>
      <form onSubmit={handleSignup} style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="Họ tên (tuỳ chọn)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mật khẩu (>= 6 ký tự)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <div style={{ color: "red" }}>{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>
    </div>
  );
}

