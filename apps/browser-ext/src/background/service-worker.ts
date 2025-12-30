/**
 * Service Worker
 * Chrome Extension 后台脚本
 */

// 监听扩展图标点击，打开 Side Panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// 设置 Side Panel 行为
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// 监听来自 content script 或 side panel 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Service Worker] Received message:", message);

  // 处理不同类型的消息
  switch (message.type) {
    case "GET_TAB_ID":
      // 返回当前活动标签页 ID
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ tabId: tabs[0]?.id });
      });
      return true; // 异步响应

    case "ATTACH_DEBUGGER":
      // 连接调试器
      handleAttachDebugger(message.tabId, sendResponse);
      return true;

    case "DETACH_DEBUGGER":
      // 断开调试器
      handleDetachDebugger(message.tabId, sendResponse);
      return true;

    case "SEND_CDP_COMMAND":
      // 发送 CDP 命令
      handleCDPCommand(message.tabId, message.method, message.params, sendResponse);
      return true;

    default:
      sendResponse({ error: "Unknown message type" });
  }
});

/**
 * 连接调试器到标签页
 */
async function handleAttachDebugger(
  tabId: number,
  sendResponse: (response: unknown) => void
) {
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    console.log(`[Service Worker] Debugger attached to tab ${tabId}`);
    sendResponse({ success: true });
  } catch (error) {
    console.error("[Service Worker] Failed to attach debugger:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 断开调试器
 */
async function handleDetachDebugger(
  tabId: number,
  sendResponse: (response: unknown) => void
) {
  try {
    await chrome.debugger.detach({ tabId });
    console.log(`[Service Worker] Debugger detached from tab ${tabId}`);
    sendResponse({ success: true });
  } catch (error) {
    console.error("[Service Worker] Failed to detach debugger:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 发送 CDP 命令
 */
async function handleCDPCommand(
  tabId: number,
  method: string,
  params: object | undefined,
  sendResponse: (response: unknown) => void
) {
  try {
    const result = await chrome.debugger.sendCommand({ tabId }, method, params);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error(`[Service Worker] CDP command failed (${method}):`, error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// 监听调试器断开连接事件
chrome.debugger.onDetach.addListener((source, reason) => {
  console.log(`[Service Worker] Debugger detached from tab ${source.tabId}: ${reason}`);
});

console.log("[Service Worker] Browser Control Extension loaded");
