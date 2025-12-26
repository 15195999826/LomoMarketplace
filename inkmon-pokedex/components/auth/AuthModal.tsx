"use client";

import { useState, useCallback } from "react";
import { Modal, modalStyles } from "../common/Modal";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (password: string) => boolean;
}

export function AuthModal({ isOpen, onClose, onAuthenticate }: AuthModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError("");

      // 模拟验证延迟
      setTimeout(() => {
        const success = onAuthenticate(password);
        if (success) {
          setPassword("");
          onClose();
        } else {
          setError("密码错误，请重试");
        }
        setIsSubmitting(false);
      }, 300);
    },
    [password, onAuthenticate, onClose]
  );

  const handleClose = useCallback(() => {
    setPassword("");
    setError("");
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="管理员认证"
      titleIcon={
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      }
      footer={
        <>
          <button
            type="button"
            className={modalStyles.button + " " + modalStyles.buttonSecondary}
            onClick={handleClose}
          >
            取消
          </button>
          <button
            type="submit"
            form="auth-form"
            className={modalStyles.button + " " + modalStyles.buttonPrimary}
            disabled={isSubmitting || !password}
          >
            {isSubmitting ? "验证中..." : "确认"}
          </button>
        </>
      }
    >
      <form id="auth-form" className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label htmlFor="auth-password" className={styles.label}>
            请输入管理员密码
          </label>
          <input
            id="auth-password"
            type="password"
            className={`${styles.input} ${error ? styles.inputError : ""}`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="输入密码..."
            autoFocus
            autoComplete="current-password"
          />
          {error && (
            <span className={styles.errorMessage}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </span>
          )}
        </div>
      </form>
    </Modal>
  );
}
