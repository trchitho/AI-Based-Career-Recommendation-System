"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import type { UserPublic } from "@/types/auth";

export default function UserProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const res = await api.get<UserPublic>("/auth/me");
        setUser(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Không lấy được thông tin người dùng");
        router.replace("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const logout = () => {
    localStorage.removeItem("token");
    router.replace("/");
  };

  if (loading) return <div style={{ maxWidth: 600, margin: "40px auto" }}>Đang tải thông tin...</div>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", display: "grid", gap: 12 }}>
      <h1>Thông tin người dùng</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {user && (
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <div><strong>ID:</strong> {user.id}</div>
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>Họ tên:</strong> {user.full_name || "(chưa có)"}</div>
          <div><strong>Vai trò:</strong> {user.role || "user"}</div>
          {user.avatar_url && (
            <div>
              <strong>Avatar:</strong>
              <div><img src={user.avatar_url} alt="avatar" style={{ maxWidth: 120, borderRadius: 6 }} /></div>
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => router.push("/")}>Trang gộp đăng nhập/đăng ký</button>
        <button onClick={logout}>Đăng xuất</button>
      </div>
    </div>
  );
}

