"use client";

import { useState, useCallback, useMemo } from "react";
import type { Item, ItemCategory, ItemRarity } from "@/data/mock-items";
import { useAuth } from "@/hooks/useAuth";
import { ItemSearchFilter, type ItemFilters } from "./ItemSearchFilter";
import { ViewToggle, type ViewMode } from "@/components/pokedex/ViewToggle";
import { ItemGrid } from "./ItemGrid";
import { ItemList } from "./ItemList";
import { DeleteConfirmModal } from "@/components/pokedex/DeleteConfirmModal";
import styles from "./ItemContainer.module.css";

interface ItemContainerProps {
  initialItems: Item[];
}

export function ItemContainer({ initialItems }: ItemContainerProps) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<ItemFilters>({
    search: "",
    category: "",
    rarity: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; nameEn: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 筛选物品
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 搜索过滤
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          item.name_cn.toLowerCase().includes(searchLower) ||
          item.name_en.toLowerCase().includes(searchLower) ||
          item.id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // 分类过滤
      if (filters.category && item.category !== filters.category) {
        return false;
      }

      // 稀有度过滤
      if (filters.rarity && item.rarity !== filters.rarity) {
        return false;
      }

      return true;
    });
  }, [items, filters]);

  // 处理筛选变化
  const handleFilterChange = useCallback((newFilters: ItemFilters) => {
    setFilters(newFilters);
  }, []);

  // 处理删除点击
  const handleDeleteClick = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setDeleteTarget({ id, name: item.name_cn, nameEn: item.name_en });
    }
  }, [items]);

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      // 模拟 API 调用 (实际物品系统暂未实现后端)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 从本地列表移除
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("删除失败:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

  // 关闭删除弹窗
  const handleCloseDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setDeleteTarget(null);
    }
  }, [isDeleting]);

  return (
    <div className={styles.container}>
      <ItemSearchFilter
        onFilterChange={handleFilterChange}
        resultCount={filteredItems.length}
      />

      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {viewMode === "grid" ? (
        <ItemGrid
          items={filteredItems}
          showDelete={isAuthenticated}
          onDelete={handleDeleteClick}
        />
      ) : (
        <ItemList
          items={filteredItems}
          showDelete={isAuthenticated}
          onDelete={handleDeleteClick}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        inkmonName={deleteTarget?.name || ""}
        inkmonNameEn={deleteTarget?.nameEn || ""}
      />
    </div>
  );
}
