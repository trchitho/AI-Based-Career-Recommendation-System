"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/services/api";

export default function GoogleCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      setError("Thiếu mã xác thực Google");
      return;
    }
    (async () => {
      try {
        const res = await api.get("/auth/google/callback", { params: { code } });
        const { token } = res.data as { token: string };
        localStorage.setItem("token", token);
        // Sau khi login Google, luôn chuyển về trang thông tin người dùng
        router.replace("/user");
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Xử lý Google callback thất bại");
      }
    })();
  }, [params, router]);

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Đang đăng nhập Google...</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
