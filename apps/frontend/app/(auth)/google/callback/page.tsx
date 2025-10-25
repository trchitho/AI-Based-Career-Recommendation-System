"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false); // chặn gọi lần 2 trong dev/StrictMode

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) {
      setError("Thiếu mã xác thực Google");
      return;
    }

    (async () => {
      try {
        const res = await api.get("/auth/google/callback", { params: { code } });
        const { token } = res.data as { token: string };
        localStorage.setItem("token", token);
        router.replace("/user");
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Xử lý Google callback thất bại");
      }
    })();
  }, [router]);

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Đang đăng nhập Google...</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
