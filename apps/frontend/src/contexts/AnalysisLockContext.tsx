import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Context khóa toàn cục khi đang phân tích CV.
 * - Khi `isLocked = true`:
 *   - MainLayout sẽ ẩn header + sidebar
 *   - Trang sẽ bị chặn scroll / keyboard / mouse
 *   - Khi user cố rời trang sẽ hiện modal xác nhận
 */
interface AnalysisLockContextValue {
  isLocked: boolean;
  /** Bật / tắt khóa */
  setLocked: (locked: boolean) => void;
}

const AnalysisLockContext = createContext<AnalysisLockContextValue | undefined>(undefined);

export const AnalysisLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);

  const setLocked = useCallback((locked: boolean) => {
    setIsLocked(locked);
  }, []);

  const value = useMemo(() => ({ isLocked, setLocked }), [isLocked, setLocked]);

  return (
    <AnalysisLockContext.Provider value={value}>{children}</AnalysisLockContext.Provider>
  );
};

export const useAnalysisLock = (): AnalysisLockContextValue => {
  const ctx = useContext(AnalysisLockContext);
  if (!ctx) {
    // Trả về no-op để tránh crash khi component được render ngoài provider
    return { isLocked: false, setLocked: () => { } };
  }
  return ctx;
};

export default AnalysisLockContext;
