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

interface ItemsContextValue {
  items: Item[];
  total: number;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  refreshItems: () => void;
  removeItem: (id: string) => void;
}

const ItemsContext = createContext<ItemsContextValue | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const { refreshToken } = useDataProgress();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载物品数据
  const loadItems = useCallback(async () => {
    // 避免重复加载
    if (isLoading) return;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Failed to load items:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // 刷新物品数据
  const refreshItems = useCallback(() => {
    setItems([]);
    setTotal(0);
    setIsLoaded(false);
    setIsLoading(false);
    setError(null);
  }, []);

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
    if (!isLoaded && !isLoading) {
      loadItems();
    }
  }, [isLoaded, isLoading, loadItems]);

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
