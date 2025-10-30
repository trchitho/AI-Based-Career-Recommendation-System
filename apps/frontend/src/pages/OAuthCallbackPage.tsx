import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OAuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");
    if (access) localStorage.setItem("accessToken", access);
    if (refresh) localStorage.setItem("refreshToken", refresh);
    // Go to dashboard after login
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-700">
      Completing sign-in...
    </div>
  );
};

export default OAuthCallbackPage;
