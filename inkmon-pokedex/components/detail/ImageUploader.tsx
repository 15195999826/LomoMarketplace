"use client";

import { useState, useCallback, useRef } from "react";
import styles from "./ImageUploader.module.css";

export type ImageSlot = "main" | "front" | "left" | "right" | "back";

interface ImageUploaderProps {
  nameEn: string;
  existingImages?: Partial<Record<ImageSlot, string>>;
  onUploadComplete?: (slot: ImageSlot, url: string) => void;
  onDeleteComplete?: (slot: ImageSlot) => void;
}

const SLOT_LABELS: Record<ImageSlot, string> = {
  main: "主立绘 (3/4)",
  front: "正面",
  left: "左侧",
  right: "右侧",
  back: "背面",
};

export function ImageUploader({
  nameEn,
  existingImages = {},
  onUploadComplete,
  onDeleteComplete,
}: ImageUploaderProps) {
  const [images, setImages] = useState<Partial<Record<ImageSlot, string>>>(existingImages);
  const [uploading, setUploading] = useState<ImageSlot | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [dragOver, setDragOver] = useState<ImageSlot | null>(null);

  const fileInputRefs = useRef<Partial<Record<ImageSlot, HTMLInputElement | null>>>({});

  // 处理文件上传
  const handleUpload = useCallback(
    async (slot: ImageSlot, file: File) => {
      if (!file.type.startsWith("image/")) {
        setStatus({ type: "error", message: "请选择图片文件" });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setStatus({ type: "error", message: "图片大小不能超过 2MB" });
        return;
      }

      setUploading(slot);
      setProgress(0);
      setStatus(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("slot", slot);

      try {
        // 模拟上传进度
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90));
        }, 100);

        const response = await fetch(`/api/inkmon/${nameEn}/images`, {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setProgress(100);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "上传失败");
        }

        const data = await response.json();
        setImages((prev) => ({ ...prev, [slot]: data.url }));
        setStatus({ type: "success", message: `${SLOT_LABELS[slot]} 上传成功` });
        onUploadComplete?.(slot, data.url);
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "上传失败",
        });
      } finally {
        setUploading(null);
        setProgress(0);
      }
    },
    [nameEn, onUploadComplete]
  );

  // 处理删除
  const handleDelete = useCallback(
    async (slot: ImageSlot) => {
      try {
        const response = await fetch(`/api/inkmon/${nameEn}/images?slot=${slot}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "删除失败");
        }

        setImages((prev) => {
          const next = { ...prev };
          delete next[slot];
          return next;
        });
        setStatus({ type: "success", message: `${SLOT_LABELS[slot]} 已删除` });
        onDeleteComplete?.(slot);
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "删除失败",
        });
      }
    },
    [nameEn, onDeleteComplete]
  );

  // 处理文件选择
  const handleFileChange = useCallback(
    (slot: ImageSlot, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(slot, file);
      }
      // 重置 input 以便重复选择同一文件
      e.target.value = "";
    },
    [handleUpload]
  );

  // 处理拖放
  const handleDragOver = useCallback((slot: ImageSlot, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(slot);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback(
    (slot: ImageSlot, e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(slot, file);
      }
    },
    [handleUpload]
  );

  // 渲染单个上传区域
  const renderUploadZone = (slot: ImageSlot, isMain: boolean = false) => {
    const hasImage = !!images[slot];
    const isUploading = uploading === slot;
    const isDragOver = dragOver === slot;

    return (
      <div
        key={slot}
        className={`
          ${styles.uploadZone}
          ${isMain ? styles.uploadZoneMain : styles.uploadZoneView}
          ${hasImage ? styles.hasImage : ""}
          ${isDragOver ? styles.dragOver : ""}
        `}
        onClick={() => !hasImage && fileInputRefs.current[slot]?.click()}
        onDragOver={(e) => handleDragOver(slot, e)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(slot, e)}
      >
        <input
          ref={(el) => {fileInputRefs.current[slot] = el}}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className={styles.fileInput}
          onChange={(e) => handleFileChange(slot, e)}
        />

        {hasImage ? (
          <>
            <div className={styles.imagePreview}>
              <img
                src={images[slot]}
                alt={SLOT_LABELS[slot]}
                className={styles.previewImage}
              />
            </div>
            <div className={styles.imageActions}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRefs.current[slot]?.click();
                }}
                title="更换图片"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(slot);
                }}
                title="删除图片"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className={styles.uploadPlaceholder}>
            <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className={styles.uploadLabel}>{SLOT_LABELS[slot]}</span>
            <span className={styles.uploadHint}>
              {isMain ? "拖拽或点击上传" : "点击上传"}
            </span>
          </div>
        )}

        {isUploading && (
          <div className={styles.uploadProgress}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.uploaderContainer}>
      <h4 className={styles.uploaderTitle}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        图片管理
      </h4>

      <div className={styles.uploadGrid}>
        {/* 主立绘 */}
        <div className={styles.mainUpload}>
          {renderUploadZone("main", true)}
        </div>

        {/* 四视角图 */}
        <div className={styles.viewUploads}>
          {renderUploadZone("front")}
          {renderUploadZone("left")}
          {renderUploadZone("right")}
          {renderUploadZone("back")}
        </div>
      </div>

      {status && (
        <div className={`${styles.uploadStatus} ${styles[status.type]}`}>
          {status.type === "success" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {status.message}
        </div>
      )}

      <div className={styles.formatHint}>
        <strong>支持格式：</strong>PNG, JPG, WebP &nbsp;|&nbsp;
        <strong>最大尺寸：</strong>2MB
      </div>
    </div>
  );
}
