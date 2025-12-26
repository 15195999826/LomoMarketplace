"use client";

import { useState, useCallback } from "react";
import { Modal, modalStyles } from "../common/Modal";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  inkmonName: string;
  inkmonNameEn: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  inkmonName,
  inkmonNameEn,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败，请重试");
    } finally {
      setIsDeleting(false);
    }
  }, [onConfirm, onClose]);

  const handleClose = useCallback(() => {
    if (!isDeleting) {
      setError("");
      onClose();
    }
  }, [isDeleting, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="确认删除"
      titleIcon={
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      }
      footer={
        <>
          <button
            type="button"
            className={modalStyles.button + " " + modalStyles.buttonSecondary}
            onClick={handleClose}
            disabled={isDeleting}
          >
            取消
          </button>
          <button
            type="button"
            className={modalStyles.button + " " + modalStyles.buttonDanger}
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "删除中..." : "确认删除"}
          </button>
        </>
      }
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ marginBottom: "var(--spacing-sm)" }}>
          确定要删除 <strong>{inkmonName}</strong> ({inkmonNameEn}) 吗？
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--accent)",
            margin: 0,
          }}
        >
          此操作不可撤销
        </p>
        {error && (
          <p
            style={{
              marginTop: "var(--spacing-md)",
              color: "#dc2626",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
