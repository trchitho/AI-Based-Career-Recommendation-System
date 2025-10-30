import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

export interface AppSettings {
  id: number;
  logo_url: string | null;
  app_title: string | null;
  app_name: string | null;
  footer_html: string | null;
  updated_at?: string | null;
  updated_by?: number | null;
}

const defaultSettings: AppSettings = {
  id: 1,
  logo_url: null,
  app_title: "CareerBridge AI",
  app_name: "CareerBridge",
  footer_html: "© 2025 CareerBridge AI",
};

const AppSettingsContext = createContext<AppSettings>(defaultSettings);

export const useAppSettings = () => useContext(AppSettingsContext);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const resp = await api.get("/api/app/settings");
        setSettings({ ...defaultSettings, ...(resp.data || {}) });
      } catch {
        // keep defaults
      }
    };
    fetchSettings();
  }, []);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
};
