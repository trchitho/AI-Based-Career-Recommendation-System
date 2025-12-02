import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

export interface AppSettings {
  id: number;
  logo_url: string | null;
  app_title: string | null;
  app_name: string | null;
  footer_html: string | null;

  // 🔥 Thêm theme
  theme: "light" | "dark";
}

const defaultSettings: AppSettings = {
  id: 1,
  logo_url: null,
  app_title: "CareerBridge AI",
  app_name: "CareerBridge",
  footer_html: "© 2025 CareerBridge AI",
  theme: "light",
};

const AppSettingsContext = createContext<AppSettings>(defaultSettings);
export const useAppSettings = () => useContext(AppSettingsContext);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // 👇 NEW — auto detect theme from <html>
  const detectTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    return isDark ? "dark" : "light";
  };

  useEffect(() => {
    // 1) Load settings from API
    const fetchSettings = async () => {
      try {
        const resp = await api.get("/api/app/settings");
        const serverSettings = resp.data || {};

        setSettings((prev) => ({
          ...prev,
          ...serverSettings,
          theme: detectTheme(), // 🔥 sync theme on load
        }));
      } catch {
        // keep defaults
        setSettings((prev) => ({
          ...prev,
          theme: detectTheme(),
        }));
      }
    };

    fetchSettings();

    // 2) Observer — listen to <html class="dark">
    const observer = new MutationObserver(() => {
      setSettings((prev) => ({
        ...prev,
        theme: detectTheme(),
      }));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
};
