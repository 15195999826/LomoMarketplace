"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { InkMonListItem } from "@inkmon/core";
import { useDataProgress } from "./DataContext";

const PAGE_SIZE = 24;

interface InkMonsContextValue {
  inkmons: InkMonListItem[];
  total: number;
  isLoading: boolean;
  isLoaded: boolean; // 是否已完成全部加载
  error: string | null;
  refreshInkmons: () => void;
  removeInkmon: (nameEn: string) => void;
}

const InkMonsContext = createContext<InkMonsContextValue | null>(null);

export function InkMonsProvider({ children }: { children: ReactNode }) {
  const { refreshToken } = useDataProgress();
  const [inkmons, setInkmons] = useState<InkMonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = useRef(0);
  const isLoadingRef = useRef(false);

  // 加载下一批数据
  const loadNextBatch = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);

    const nextPage = currentPage.current + 1;

    try {
      const res = await fetch(`/api/inkmon?page=${nextPage}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to fetch inkmons");

      const result = await res.json();

      if (result.data && result.data.length > 0) {
        setInkmons((prev) => [...prev, ...result.data]);
        setTotal(result.total);
        currentPage.current = nextPage;

        if (!result.hasMore) {
          setIsLoaded(true);
          setIsLoading(false);
        }
      } else {
        setIsLoaded(true);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
      console.error("Failed to load inkmons:", err);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // 持续加载直到完成
  useEffect(() => {
    if (isLoaded || error) return;

    // 首次加载或继续加载
    const timer = setTimeout(loadNextBatch, 50);
    return () => clearTimeout(timer);
  }, [inkmons.length, isLoaded, error, loadNextBatch]);

  // 刷新数据
  const refreshInkmons = useCallback(() => {
    setInkmons([]);
    setTotal(0);
    setIsLoaded(false);
    setIsLoading(false);
    setError(null);
    currentPage.current = 0;
    isLoadingRef.current = false;
  }, []);

  // 响应 DataContext 的刷新触发
  useEffect(() => {
    if (refreshToken === 0) return; // 初始渲染不触发
    refreshInkmons();
  }, [refreshToken, refreshInkmons]);

  // 从缓存中移除
  const removeInkmon = useCallback((nameEn: string) => {
    setInkmons((prev) => prev.filter((i) => i.name_en !== nameEn));
    setTotal((prev) => prev - 1);
  }, []);

  return (
    <InkMonsContext.Provider
      value={{
        inkmons,
        total,
        isLoading,
        isLoaded,
        error,
        refreshInkmons,
        removeInkmon,
      }}
    >
      {children}
    </InkMonsContext.Provider>
  );
}

export function useInkMons() {
  const context = useContext(InkMonsContext);
  if (!context) {
    throw new Error("useInkMons must be used within InkMonsProvider");
  }
  return context;
}
