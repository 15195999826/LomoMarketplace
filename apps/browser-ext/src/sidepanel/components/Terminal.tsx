import { useEffect, useRef, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  outputData: string | null;
}

function Terminal({ onInput, onResize, outputData }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#aeafad",
        cursorAccent: "#1e1e1e",
        selectionBackground: "#264f78",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    // 监听输入
    xterm.onData((data) => {
      onInput(data);
    });

    // 通知初始尺寸
    onResize(xterm.cols, xterm.rows);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 显示欢迎信息
    xterm.writeln("\x1b[1;36m╔════════════════════════════════════════╗\x1b[0m");
    xterm.writeln("\x1b[1;36m║  Claude Code Browser                    ║\x1b[0m");
    xterm.writeln("\x1b[1;36m╚════════════════════════════════════════╝\x1b[0m");
    xterm.writeln("");
    xterm.writeln("\x1b[33mConnecting to Bridge Server...\x1b[0m");
    xterm.writeln("");

    return () => {
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [onInput, onResize]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        onResize(xtermRef.current.cols, xtermRef.current.rows);
      }
    };

    window.addEventListener("resize", handleResize);

    // ResizeObserver 用于检测容器大小变化
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [onResize]);

  // 写入输出数据
  useEffect(() => {
    if (outputData && xtermRef.current) {
      xtermRef.current.write(outputData);
    }
  }, [outputData]);

  // 聚焦终端
  const focusTerminal = useCallback(() => {
    xtermRef.current?.focus();
  }, []);

  return (
    <div
      ref={terminalRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#1e1e1e",
      }}
      onClick={focusTerminal}
    />
  );
}

export default Terminal;
