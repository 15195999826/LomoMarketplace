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
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay
const BATCH_DELAY = 50; // delay between batch loads

interface InkMonsContextValue {
  inkmons: InkMonListItem[];
  total: number;
  isLoading: boolean;
  isLoaded: boolean; // 是否已完成全部加载
  error: string | null;
  refreshInkmons: () => void;
  removeInkmon: (nameEn: string) => void;
  retry: () => void;
}

const InkMonsContext = createContext<InkMonsContextValue | null>(null);

export function InkMonsProvider({ children }: { children: ReactNode }) {
  const { refreshToken } = useDataProgress();
  const [inkmons, setInkmons] = useState<InkMonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [shouldLoadNext, setShouldLoadNext] = useState(true); // 控制是否继续加载

  const currentPage = useRef(0);
  const isLoadingRef = useRef(false);

  // 加载下一批数据
  const loadNextBatch = useCallback(async () => {
    if (isLoadingRef.current || isLoaded) return;
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
        setRetryCount(0); // 成功后重置重试计数

        if (!result.hasMore) {
          setIsLoaded(true);
          setIsLoading(false);
          setShouldLoadNext(false);
        } else {
          // 触发下一批加载
          setShouldLoadNext(true);
        }
      } else {
        setIsLoaded(true);
        setIsLoading(false);
        setShouldLoadNext(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
      setShouldLoadNext(false);
      console.error("Failed to load inkmons:", err);
    } finally {
      isLoadingRef.current = false;
    }
  }, [isLoaded]);

  // 控制加载循环 - 更明确的触发条件
  useEffect(() => {
    if (isLoaded || error || !shouldLoadNext) return;
    if (isLoadingRef.current) return;

    const timer = setTimeout(() => {
      setShouldLoadNext(false); // 重置标志，等待下次触发
      loadNextBatch();
    }, BATCH_DELAY);

    return () => clearTimeout(timer);
  }, [shouldLoadNext, isLoaded, error, loadNextBatch]);

  // 首次加载触发
  useEffect(() => {
    if (inkmons.length === 0 && !isLoaded && !error && !isLoadingRef.current) {
      setShouldLoadNext(true);
    }
  }, [inkmons.length, isLoaded, error]);

  // 自动重试机制
  useEffect(() => {
    if (error && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount); // 指数退避
      const timer = setTimeout(() => {
        console.log(`Retrying inkmons load (${retryCount + 1}/${MAX_RETRIES})...`);
        setRetryCount((c) => c + 1);
        setError(null);
        isLoadingRef.current = false;
        setShouldLoadNext(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  // 刷新数据
  const refreshInkmons = useCallback(() => {
    setInkmons([]);
    setTotal(0);
    setIsLoaded(false);
    setIsLoading(false);
    setError(null);
    setRetryCount(0);
    currentPage.current = 0;
    isLoadingRef.current = false;
    setShouldLoadNext(true);
  }, []);

  // 手动重试
  const retry = useCallback(() => {
    setError(null);
    setRetryCount(0);
    isLoadingRef.current = false;
    setShouldLoadNext(true);
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
        retry,
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
