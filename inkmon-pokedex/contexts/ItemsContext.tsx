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
import type { Item } from "@/data/mock-items";
import { useDataProgress } from "./DataContext";

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

interface ItemsContextValue {
  items: Item[];
  total: number;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  refreshItems: () => void;
  removeItem: (id: string) => void;
  retry: () => void;
}

const ItemsContext = createContext<ItemsContextValue | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const { refreshToken, setProgress } = useDataProgress();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 使用 ref 避免 useCallback 依赖问题
  const isLoadingRef = useRef(false);

  // 加载物品数据
  const loadItems = useCallback(async () => {
    // 使用 ref 避免重复加载
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/items");
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      const data = await response.json();
      setItems(data.items);
      setTotal(data.total);
      setIsLoaded(true);
      setRetryCount(0); // 成功后重置重试计数
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Failed to load items:", err);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // 刷新物品数据
  const refreshItems = useCallback(() => {
    setItems([]);
    setTotal(0);
    setIsLoaded(false);
    setIsLoading(false);
    setError(null);
    setRetryCount(0);
    isLoadingRef.current = false;
  }, []);

  // 手动重试
  const retry = useCallback(() => {
    setError(null);
    setRetryCount(0);
    isLoadingRef.current = false;
    loadItems();
  }, [loadItems]);

  // 响应 DataContext 的刷新触发
  useEffect(() => {
    if (refreshToken === 0) return; // 初始渲染不触发
    refreshItems();
  }, [refreshToken, refreshItems]);

  // 从缓存中移除物品 (本地状态更新)
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setTotal((prev) => prev - 1);
  }, []);

  // 首次加载时获取数据
  useEffect(() => {
    if (!isLoaded && !isLoadingRef.current && !error) {
      loadItems();
    }
  }, [isLoaded, error, loadItems]);

  // 自动重试机制
  useEffect(() => {
    if (error && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount); // 指数退避
      const timer = setTimeout(() => {
        console.log(`Retrying items load (${retryCount + 1}/${MAX_RETRIES})...`);
        setRetryCount((c) => c + 1);
        isLoadingRef.current = false;
        loadItems();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, loadItems]);

  // 同步进度到 DataContext (使用 items 类型标识)
  useEffect(() => {
    setProgress({
      loaded: items.length,
      total: total,
      isLoading: isLoading,
    });
  }, [items.length, total, isLoading, setProgress]);

  return (
    <ItemsContext.Provider
      value={{
        items,
        total,
        isLoading,
        isLoaded,
        error,
        refreshItems,
        removeItem,
        retry,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const context = useContext(ItemsContext);
  if (!context) {
    throw new Error("useItems must be used within ItemsProvider");
  }
  return context;
}
