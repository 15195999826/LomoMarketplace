"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface LoadingProgress {
  loaded: number;
  total: number;
  isLoading: boolean;
}

interface DataContextValue {
  progress: LoadingProgress;
  setProgress: (progress: LoadingProgress) => void;
  triggerRefresh: () => void;
  refreshToken: number; // 变化时触发刷新
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<LoadingProgress>({
    loaded: 0,
    total: 0,
    isLoading: false,
  });
  const [refreshToken, setRefreshToken] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  return (
    <DataContext.Provider
      value={{
        progress,
        setProgress,
        triggerRefresh,
        refreshToken,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useDataProgress() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataProgress must be used within DataProvider");
  }
  return context;
}
