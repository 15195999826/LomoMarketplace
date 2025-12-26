"use client";

import { useState, useEffect, useCallback } from "react";

const AUTH_KEY = "inkmon_admin_auth";
const AUTH_PASSWORD = "Wq@@19931122";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查 localStorage
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // 验证密码
  const authenticate = useCallback((password: string): boolean => {
    if (password === AUTH_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, "true");
      return true;
    }
    return false;
  }, []);

  // 退出登录
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    authenticate,
    logout,
  };
}
