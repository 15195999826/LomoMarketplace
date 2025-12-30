import { useState, useCallback, useMemo } from "react";
import Terminal from "./components/Terminal";
import { useWebSocket } from "./hooks/useWebSocket";
import { DEFAULT_WS_PORT } from "@lomo/browser-bridge";

function App() {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  // 稳定的回调函数，避免 useWebSocket 重复连接
  const wsOptions = useMemo(() => ({
    onOpen: () => setStatus("connected"),
    onClose: () => setStatus("disconnected"),
    onError: () => setStatus("disconnected"),
  }), []);

  const { sendMessage, lastMessage, connectionStatus } = useWebSocket(
    `ws://localhost:${DEFAULT_WS_PORT}`,
    wsOptions
  );

  const handleTerminalInput = useCallback(
    (data: string) => {
      sendMessage({
        type: "terminal_input",
        data,
      });
    },
    [sendMessage]
  );

  const handleTerminalResize = useCallback(
    (cols: number, rows: number) => {
      sendMessage({
        type: "terminal_resize",
        cols,
        rows,
      });
    },
    [sendMessage]
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e1e",
      }}
    >
      {/* 状态栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          backgroundColor: "#252526",
          borderBottom: "1px solid #3c3c3c",
          fontSize: "12px",
          color: "#cccccc",
        }}
      >
        <span>Claude Code</span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor:
                connectionStatus === "connected"
                  ? "#4caf50"
                  : connectionStatus === "connecting"
                  ? "#ff9800"
                  : "#f44336",
            }}
          />
          {connectionStatus === "connected"
            ? "Connected"
            : connectionStatus === "connecting"
            ? "Connecting..."
            : "Disconnected"}
        </span>
      </div>

      {/* 终端 */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Terminal
          onInput={handleTerminalInput}
          onResize={handleTerminalResize}
          outputData={lastMessage}
        />
      </div>

      {/* 底部提示 */}
      {connectionStatus === "disconnected" && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "#5a1d1d",
            color: "#f48771",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          Bridge Server not running. Start with: <code>pnpm --filter @lomo/browser-control-server start</code>
        </div>
      )}
    </div>
  );
}

export default App;
