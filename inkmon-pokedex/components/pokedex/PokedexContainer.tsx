"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInkMons, useDataProgress } from "@/contexts";
import { SearchFilter } from "./SearchFilter";
import { ViewToggle, type ViewMode } from "./ViewToggle";
import { PokedexGrid } from "./PokedexGrid";
import { PokedexList } from "./PokedexList";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import styles from "./PokedexContainer.module.css";

export function PokedexContainer() {
  const { isAuthenticated } = useAuth();
  const { inkmons, total, isLoading, isLoaded, removeInkmon } = useInkMons();
  const { setProgress } = useDataProgress();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState({
    search: "",
    element: "",
    stage: "",
  });

  // 同步进度到 DataContext
  useEffect(() => {
    setProgress({
      loaded: inkmons.length,
      total: total,
      isLoading: isLoading,
    });
  }, [inkmons.length, total, isLoading, setProgress]);

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

    // 从全局缓存中移除
    removeInkmon(deleteTarget.nameEn);
    setDeleteTarget(null);
  }, [deleteTarget, removeInkmon]);

  // 显示的数量
  const displayCount = filteredInkmons.length;
  const isFiltering = filters.search || filters.element || filters.stage;

  // 加载中状态
  if (!isLoaded && inkmons.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <p>Loading InkMon data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <SearchFilter
          onFilterChange={handleFilterChange}
          resultCount={displayCount}
          totalCount={total}
          isLoading={isLoading}
          isLoadingMore={isLoading && !isFiltering}
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
