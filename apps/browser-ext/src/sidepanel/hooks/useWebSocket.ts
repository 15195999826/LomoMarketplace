import { useState, useEffect, useCallback, useRef } from "react";
import {
  type WSMessage,
  type TerminalOutputMessage,
  serialize,
  deserialize,
  isTerminalOutput,
  isConnectionStatus,
  RECONNECT_INTERVAL,
} from "@lomo/browser-bridge";

interface UseWebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
}

interface UseWebSocketReturn {
  sendMessage: (message: WSMessage) => void;
  lastMessage: string | null;
  connectionStatus: "connecting" | "connected" | "disconnected";
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { onOpen, onClose, onError, reconnect = true } = options;

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // 清理重连定时器
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // 连接 WebSocket
  const connect = useCallback(() => {
    // 如果已经连接或正在连接，不重复连接
    if (wsRef.current?.readyState === WebSocket.CONNECTING ||
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus("connecting");

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setConnectionStatus("connected");
        clearReconnectTimer();
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = deserialize(event.data);

          // 处理终端输出
          if (isTerminalOutput(message)) {
            setLastMessage(message.data);
          }

          // 处理连接状态
          if (isConnectionStatus(message)) {
            console.log("[WebSocket] Connection status:", message.status, message.source);
          }
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setConnectionStatus("disconnected");
        wsRef.current = null;
        onClose?.();

        // 自动重连
        if (reconnect) {
          reconnectTimerRef.current = window.setTimeout(() => {
            console.log("[WebSocket] Attempting to reconnect...");
            connect();
          }, RECONNECT_INTERVAL);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Failed to connect:", error);
      setConnectionStatus("disconnected");

      // 自动重连
      if (reconnect) {
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, RECONNECT_INTERVAL);
      }
    }
  }, [url, onOpen, onClose, onError, reconnect, clearReconnectTimer]);

  // 发送消息
  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(serialize(message));
    } else {
      console.warn("[WebSocket] Cannot send message: not connected");
    }
  }, []);

  // 初始化连接
  useEffect(() => {
    connect();

    return () => {
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearReconnectTimer]);

  return {
    sendMessage,
    lastMessage,
    connectionStatus,
  };
}
