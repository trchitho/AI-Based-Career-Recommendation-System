// Gọi endpoint /bff/assessment/submit
import { api } from "@/services/api";
export const postAssessment = (data: any) =>
  api.post("/bff/assessment/submit", data).then((r) => r.data);
