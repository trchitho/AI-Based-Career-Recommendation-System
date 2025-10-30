import api from "../lib/api";

export const authTokenService = {
  async requestVerify(email: string) {
    const res = await api.post("/api/auth/request-verify", { email });
    return res.data;
  },
  async verify(token: string) {
    const res = await api.post("/api/auth/verify", { token });
    return res.data;
  },
  async forgot(email: string) {
    const res = await api.post("/api/auth/forgot", { email });
    return res.data;
  },
  async reset(token: string, newPassword: string) {
    const res = await api.post("/api/auth/reset", {
      token,
      new_password: newPassword,
    });
    return res.data;
  },
};
