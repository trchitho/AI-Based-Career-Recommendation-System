// NCKH/apps/frontend/app/(results)/results/page.tsx
"use client";
import { useBffHealth } from "@/hooks/useBffHealth";

export default function ResultsPage() {
  const { data, isLoading, error } = useBffHealth();
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>API error</p>;
  return <main>Results page — BFF: {data?.status}</main>;
}
