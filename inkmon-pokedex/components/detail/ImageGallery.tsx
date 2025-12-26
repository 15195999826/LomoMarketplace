"use client";

import { useState, useEffect, useCallback } from "react";
import type { ImageSlot } from "./ImageUploader";
import styles from "./ImageGallery.module.css";

interface ImageGalleryProps {
  images: Partial<Record<ImageSlot, string>>;
  name: string;
  colorPalette: string[];
}

const VIEW_LABELS: Record<ImageSlot, string> = {
  main: "主立绘",
  front: "正面",
  left: "左侧",
  right: "右侧",
  back: "背面",
};

const VIEW_ORDER: ImageSlot[] = ["front", "left", "right", "back"];

export function ImageGallery({ images, name, colorPalette }: ImageGalleryProps) {
  const [activeView, setActiveView] = useState<ImageSlot>("main");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // 生成渐变背景
  const gradientBg =
    colorPalette.length >= 2
      ? `linear-gradient(135deg, ${colorPalette[0]} 0%, ${colorPalette[1]} 100%)`
      : colorPalette[0] || "#ccc";

  // 获取当前显示的图片
  const currentImage = images[activeView] || images.main;

  // 获取所有有图片的 slots
  const availableSlots = (["main", ...VIEW_ORDER] as ImageSlot[]).filter(
    (slot) => images[slot]
  );

  // 灯箱导航
  const navigateLightbox = useCallback(
    (direction: "prev" | "next") => {
      if (availableSlots.length === 0) return;
      const currentIndex = availableSlots.indexOf(activeView);
      let newIndex: number;
      if (direction === "prev") {
        newIndex = currentIndex <= 0 ? availableSlots.length - 1 : currentIndex - 1;
      } else {
        newIndex = currentIndex >= availableSlots.length - 1 ? 0 : currentIndex + 1;
      }
      setActiveView(availableSlots[newIndex]);
    },
    [activeView, availableSlots]
  );

  // 键盘导航
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        navigateLightbox("prev");
      } else if (e.key === "ArrowRight") {
        navigateLightbox("next");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, navigateLightbox]);

  // 阻止滚动
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  return (
    <div className={styles.galleryContainer}>
      {/* 主图区域 */}
      <div
        className={styles.mainImage}
        onClick={() => currentImage && setLightboxOpen(true)}
        style={{ cursor: currentImage ? "zoom-in" : "default" }}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={`${name} - ${VIEW_LABELS[activeView]}`}
            className={styles.mainImageInner}
          />
        ) : (
          <div className={styles.mainPlaceholder} style={{ background: gradientBg }}>
            {name.charAt(0)}
          </div>
        )}
      </div>

      {/* 缩略图区域 */}
      <div className={styles.thumbnails}>
        {VIEW_ORDER.map((view) => (
          <div
            key={view}
            className={`${styles.thumbnail} ${activeView === view ? styles.active : ""}`}
            onClick={() => setActiveView(view)}
          >
            {images[view] ? (
              <img
                src={images[view]}
                alt={`${name} - ${VIEW_LABELS[view]}`}
                className={styles.thumbnailImage}
              />
            ) : (
              <div className={styles.thumbnailPlaceholder}>
                {VIEW_LABELS[view]}
              </div>
            )}
            <span className={styles.viewLabel}>{VIEW_LABELS[view]}</span>
          </div>
        ))}
      </div>

      {/* 灯箱 */}
      <div
        className={`${styles.lightbox} ${lightboxOpen ? styles.open : ""}`}
        onClick={() => setLightboxOpen(false)}
      >
        <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
          <button
            className={styles.lightboxClose}
            onClick={() => setLightboxOpen(false)}
            aria-label="关闭"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {availableSlots.length > 1 && (
            <>
              <button
                className={`${styles.lightboxNav} ${styles.prev}`}
                onClick={() => navigateLightbox("prev")}
                aria-label="上一张"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className={`${styles.lightboxNav} ${styles.next}`}
                onClick={() => navigateLightbox("next")}
                aria-label="下一张"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          {currentImage && (
            <img
              src={currentImage}
              alt={`${name} - ${VIEW_LABELS[activeView]}`}
              className={styles.lightboxImage}
            />
          )}

          <span className={styles.lightboxLabel}>
            {name} - {VIEW_LABELS[activeView]}
          </span>
        </div>
      </div>
    </div>
  );
}
