"use client";

import { useState, useEffect } from "react";
import type { InkMon } from "@inkmon/core";
import { useAuth } from "@/hooks/useAuth";
import { ImageGallery } from "./ImageGallery";
import { ImageUploader, type ImageSlot } from "./ImageUploader";
import styles from "./DetailContent.module.css";

interface DetailContentProps {
  inkmon: InkMon;
}

export function DetailContent({ inkmon }: DetailContentProps) {
  const { isAuthenticated } = useAuth();
  const [images, setImages] = useState<Partial<Record<ImageSlot, string>>>({});
  const [loading, setLoading] = useState(true);

  // 加载现有图片
  useEffect(() => {
    async function loadImages() {
      try {
        const response = await fetch(`/api/inkmon/${inkmon.name_en}/images`);
        if (response.ok) {
          const data = await response.json();
          setImages(data.images || {});
        }
      } catch (error) {
        console.error("Failed to load images:", error);
      } finally {
        setLoading(false);
      }
    }
    loadImages();
  }, [inkmon.name_en]);

  // 处理上传完成
  const handleUploadComplete = (slot: ImageSlot, url: string) => {
    setImages((prev) => ({ ...prev, [slot]: url }));
  };

  // 处理删除完成
  const handleDeleteComplete = (slot: ImageSlot) => {
    setImages((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  return (
    <div className={styles.container}>
      {/* 图片展示区 */}
      <div className={styles.imageSection}>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <ImageGallery
            images={images}
            name={inkmon.name}
            colorPalette={inkmon.design.color_palette}
          />
        )}

        {/* 认证后显示上传区域 */}
        {isAuthenticated && !loading && (
          <ImageUploader
            nameEn={inkmon.name_en}
            existingImages={images}
            onUploadComplete={handleUploadComplete}
            onDeleteComplete={handleDeleteComplete}
          />
        )}
      </div>

      {/* InkMon 信息区 */}
      <div className={styles.infoSection}>
        <div className={styles.header}>
          <span className={styles.dexNumber}>
            #{String(inkmon.dex_number).padStart(3, "0")}
          </span>
          <h1 className={styles.name}>{inkmon.name}</h1>
          <p className={styles.nameEn}>{inkmon.name_en}</p>
        </div>

        <p className={styles.description}>{inkmon.description}</p>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>进化阶段</span>
            <span className={styles.metaValue}>{inkmon.evolution.stage}</span>
          </div>
          {inkmon.evolution.evolves_from && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>进化自</span>
              <span className={styles.metaValue}>{inkmon.evolution.evolves_from}</span>
            </div>
          )}
          {inkmon.evolution.evolves_to.length > 0 && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>可进化为</span>
              <span className={styles.metaValue}>
                {inkmon.evolution.evolves_to.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
