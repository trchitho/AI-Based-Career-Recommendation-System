// NCKH/apps/frontend/src/hooks/useBffHealth.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export const useBffHealth = () =>
  useQuery({
    queryKey: ["bff-health"],
    queryFn: async () => (await api.get("/bff/health")).data,
  });
