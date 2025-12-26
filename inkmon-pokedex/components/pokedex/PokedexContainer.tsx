"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { InkMonListItem } from "@inkmon/core";
import { useAuth } from "@/hooks/useAuth";
import { useDataProgress } from "@/contexts";
import { SearchFilter } from "./SearchFilter";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { PokedexGrid } from "./PokedexGrid";
import { PokedexList } from "./PokedexList";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import styles from "./PokedexContainer.module.css";

interface PokedexContainerProps {
  initialInkmons: InkMonListItem[];
  total: number;
  pageSize: number;
  hasMore: boolean;
}

export function PokedexContainer({
  initialInkmons,
  total: initialTotal,
  pageSize,
  hasMore: initialHasMore,
}: PokedexContainerProps) {
  const { isAuthenticated } = useAuth();
  const { setProgress, refreshToken } = useDataProgress();
  const [inkmons, setInkmons] = useState(initialInkmons);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    element: "",
    stage: "",
  });

  // 用于跟踪是否正在自动加载
  const isAutoLoading = useRef(false);
  const shouldStopRef = useRef(false);

  // 更新全局进度
  useEffect(() => {
    setProgress({
      loaded: inkmons.length,
      total: totalCount,
      isLoading: hasMore,
    });
  }, [inkmons.length, totalCount, hasMore, setProgress]);

  // 当 initialInkmons 变化时（路由切换回来），重置所有状态
  useEffect(() => {
    shouldStopRef.current = false;
    isAutoLoading.current = false;
    setInkmons(initialInkmons);
    setTotalCount(initialTotal);
    setCurrentPage(1);
    setHasMore(initialHasMore);
  }, [initialInkmons, initialTotal, initialHasMore]);

  // 分批加载剩余数据
  useEffect(() => {
    if (!hasMore) return;

    const loadNextBatch = async () => {
      if (isAutoLoading.current || shouldStopRef.current) return;
      isAutoLoading.current = true;

      const nextPage = currentPage + 1;
      try {
        const res = await fetch(`/api/inkmon?page=${nextPage}&pageSize=${pageSize}`);
        const result = await res.json();

        if (shouldStopRef.current) {
          isAutoLoading.current = false;
          return;
        }

        if (result.data && result.data.length > 0) {
          setInkmons((prev) => [...prev, ...result.data]);
          setTotalCount(result.total);
          setCurrentPage(nextPage);
          setHasMore(result.hasMore);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("加载更多数据失败:", error);
        setHasMore(false);
      } finally {
        isAutoLoading.current = false;
      }
    };

    // 延迟加载下一批，让 UI 有时间渲染
    const timer = setTimeout(loadNextBatch, 50);
    return () => clearTimeout(timer);
  }, [currentPage, hasMore, pageSize]);

  // 响应刷新按钮
  useEffect(() => {
    if (refreshToken === 0) return; // 初始渲染不触发

    const refresh = async () => {
      // 停止当前加载
      shouldStopRef.current = true;
      isAutoLoading.current = false;

      try {
        const res = await fetch(`/api/inkmon?page=1&pageSize=${pageSize}`);
        const result = await res.json();

        setInkmons(result.data);
        setTotalCount(result.total);
        setCurrentPage(1);
        setHasMore(result.hasMore);
        shouldStopRef.current = false;
      } catch (error) {
        console.error("刷新数据失败:", error);
        shouldStopRef.current = false;
      }
    };

    refresh();
  }, [refreshToken, pageSize]);

  // 删除相关状态
  const [deleteTarget, setDeleteTarget] = useState<{
    nameEn: string;
    name: string;
  } | null>(null);

  // 筛选 InkMon
  const filteredInkmons = useMemo(() => {
    let result = inkmons;

    // 搜索过滤
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (inkmon) =>
          inkmon.name.toLowerCase().includes(searchLower) ||
          inkmon.name_en.toLowerCase().includes(searchLower) ||
          String(inkmon.dex_number).includes(filters.search)
      );
    }

    // 属性过滤
    if (filters.element) {
      result = result.filter(
        (inkmon) =>
          inkmon.primary_element === filters.element ||
          inkmon.secondary_element === filters.element
      );
    }

    // 进化阶段过滤
    if (filters.stage) {
      result = result.filter((inkmon) => inkmon.evolution_stage === filters.stage);
    }

    return result;
  }, [inkmons, filters]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (newFilters: { search: string; element: string; stage: string }) => {
      setFilters(newFilters);
    },
    []
  );

  // 处理删除请求
  const handleDeleteRequest = useCallback(
    (nameEn: string) => {
      const inkmon = inkmons.find((i) => i.name_en === nameEn);
      if (inkmon) {
        setDeleteTarget({ nameEn, name: inkmon.name });
      }
    },
    [inkmons]
  );

  // 执行删除
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;

    const response = await fetch(`/api/inkmon/${deleteTarget.nameEn}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "删除失败");
    }

    // 从列表中移除，并更新总数
    setInkmons((prev) => prev.filter((i) => i.name_en !== deleteTarget.nameEn));
    setTotalCount((prev) => prev - 1);
    setDeleteTarget(null);
  }, [deleteTarget]);

  // 显示的数量
  const displayCount = filteredInkmons.length;
  const isFiltering = filters.search || filters.element || filters.stage;

  return (
    <div className={styles.container}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <SearchFilter
          onFilterChange={handleFilterChange}
          resultCount={displayCount}
          totalCount={totalCount}
          isLoading={hasMore}
          isLoadingMore={hasMore && !isFiltering}
        />
        <div className={styles.viewControls}>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        {viewMode === "grid" ? (
          <PokedexGrid
            inkmons={filteredInkmons}
            showDelete={isAuthenticated}
            onDelete={handleDeleteRequest}
          />
        ) : (
          <PokedexList
            inkmons={filteredInkmons}
            showDelete={isAuthenticated}
            onDelete={handleDeleteRequest}
          />
        )}
      </div>

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          inkmonName={deleteTarget.name}
          inkmonNameEn={deleteTarget.nameEn}
        />
      )}
    </div>
  );
}
