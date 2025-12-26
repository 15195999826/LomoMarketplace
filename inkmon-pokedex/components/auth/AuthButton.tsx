"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";
import styles from "./AuthButton.module.css";

export function AuthButton() {
  const { isAuthenticated, isLoading, authenticate, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <button className={`${styles.authButton} ${styles.loading}`} disabled>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
        加载中
      </button>
    );
  }

  if (isAuthenticated) {
    return (
      <div className={styles.authContainer}>
        <button className={`${styles.authButton} ${styles.authenticated}`} disabled>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          已认证
        </button>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={logout}
          aria-label="退出登录"
          title="退出登录"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.authButton}
        onClick={() => setShowModal(true)}
      >
        <svg
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
        管理
      </button>
      <AuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAuthenticate={authenticate}
      />
    </>
  );
}
