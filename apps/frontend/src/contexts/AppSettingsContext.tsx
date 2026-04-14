import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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

  // Simple version without API calls for now
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: document.documentElement.classList.contains("dark") ? "dark" : "light"
    }));
  }, []);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
};
