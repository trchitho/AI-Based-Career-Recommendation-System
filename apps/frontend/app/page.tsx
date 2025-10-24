"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function AuthLanding() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleHint, setGoogleHint] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        const res = await api.post("/auth/signin", { email, password });
        const { token, role } = res.data as { token: string; role?: string };
        localStorage.setItem("token", token);
        const r = (role || "user").toString().toLowerCase();
        router.push(r === "admin" ? "/admin" : "/user");
      } else {
        const res = await api.post("/auth/signup", {
          email,
          password,
          full_name: fullName || undefined,
        });
        const { token, role } = res.data as { token: string; role?: string };
        localStorage.setItem("token", token);
        const r = (role || "user").toString().toLowerCase();
        router.push(r === "admin" ? "/admin" : "/user");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Thao tác thất bại");
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
      setGoogleHint("Google OAuth chưa được cấu hình");
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "40px auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button onClick={() => setMode("signin")} style={{ fontWeight: mode === "signin" ? 700 : 400 }}>Đăng nhập</button>
        <button onClick={() => setMode("signup")} style={{ fontWeight: mode === "signup" ? 700 : 400 }}>Đăng ký</button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {mode === "signup" && (
          <input type="text" placeholder="Họ tên (tuỳ chọn)" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        )}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder={mode === "signup" ? "Mật khẩu (>= 6 ký tự)" : "Mật khẩu"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={mode === "signup" ? 6 : undefined}
          required
        />
        {error && <div style={{ color: "red" }}>{error}</div>}
        <button type="submit" disabled={loading}>{loading ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập" : "Đăng ký"}</button>
      </form>

      <hr style={{ margin: "16px 0" }} />
      {googleHint && <div style={{ color: "red", marginBottom: 8 }}>{googleHint}</div>}
      <button onClick={handleGoogle}>Đăng nhập bằng Google</button>
    </main>
  );
}

