/**
 * CDP Controller
 * 通过 Service Worker 发送 CDP 命令控制浏览器
 */

type CDPResponse<T> = {
  success: true;
  result: T;
} | {
  success: false;
  error: string;
};

/**
 * 发送消息到 Service Worker
 */
async function sendToServiceWorker<T>(message: object): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: CDPResponse<T>) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response.success) {
        reject(new Error(response.error));
        return;
      }
      resolve(response.result);
    });
  });
}

/**
 * CDP Controller 类
 * 封装 CDP 命令，通过 Service Worker 执行
 */
export class CDPController {
  private tabId: number;
  private attached = false;

  constructor(tabId: number) {
    this.tabId = tabId;
  }

  /**
   * 连接调试器
   */
  async attach(): Promise<void> {
    if (this.attached) return;

    await sendToServiceWorker({
      type: "ATTACH_DEBUGGER",
      tabId: this.tabId,
    });

    this.attached = true;
  }

  /**
   * 断开调试器
   */
  async detach(): Promise<void> {
    if (!this.attached) return;

    await sendToServiceWorker({
      type: "DETACH_DEBUGGER",
      tabId: this.tabId,
    });

    this.attached = false;
  }

  /**
   * 发送 CDP 命令
   */
  private async sendCommand<T>(method: string, params?: object): Promise<T> {
    if (!this.attached) {
      await this.attach();
    }

    return sendToServiceWorker<T>({
      type: "SEND_CDP_COMMAND",
      tabId: this.tabId,
      method,
      params,
    });
  }

  /**
   * 截图
   */
  async screenshot(): Promise<{ base64: string; width: number; height: number }> {
    // 获取视口信息
    const viewportResult = await this.sendCommand<{ result: { value: { width: number; height: number } } }>(
      "Runtime.evaluate",
      {
        expression: `({
          width: window.innerWidth,
          height: window.innerHeight
        })`,
        returnByValue: true,
      }
    );

    const { width, height } = viewportResult.result.value;

    // 截图
    const screenshotResult = await this.sendCommand<{ data: string }>(
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: false, fromSurface: true }
    );

    return {
      base64: screenshotResult.data,
      width,
      height,
    };
  }

  /**
   * 鼠标事件
   */
  private async dispatchMouseEvent(params: {
    type: "mouseMoved" | "mousePressed" | "mouseReleased" | "mouseWheel";
    x: number;
    y: number;
    button?: "none" | "left" | "right" | "middle";
    buttons?: number;
    clickCount?: number;
    modifiers?: number;
    deltaX?: number;
    deltaY?: number;
  }): Promise<void> {
    await this.sendCommand("Input.dispatchMouseEvent", {
      type: params.type,
      x: Math.round(params.x),
      y: Math.round(params.y),
      button: params.button || "none",
      buttons: params.buttons ?? 0,
      clickCount: params.clickCount,
      modifiers: params.modifiers || 0,
      deltaX: params.deltaX,
      deltaY: params.deltaY,
    });
  }

  /**
   * 点击
   */
  async click(
    x: number,
    y: number,
    button: "left" | "right" | "middle" = "left",
    clickCount: 1 | 2 | 3 = 1
  ): Promise<void> {
    const buttonMap = { left: 1, right: 2, middle: 4 };
    const buttons = buttonMap[button];

    // 移动鼠标
    await this.dispatchMouseEvent({
      type: "mouseMoved",
      x,
      y,
      button: "none",
      buttons: 0,
    });

    await this.sleep(100);

    // 点击
    for (let i = 1; i <= clickCount; i++) {
      await this.dispatchMouseEvent({
        type: "mousePressed",
        x,
        y,
        button,
        buttons,
        clickCount: i,
      });

      await this.sleep(12);

      await this.dispatchMouseEvent({
        type: "mouseReleased",
        x,
        y,
        button,
        buttons: 0,
        clickCount: i,
      });

      if (i < clickCount) {
        await this.sleep(100);
      }
    }
  }

  /**
   * 输入文本
   */
  async type(text: string): Promise<void> {
    await this.sendCommand("Input.insertText", { text });
  }

  /**
   * 按键
   */
  async key(key: string, modifiers = 0): Promise<void> {
    const keyDef = this.getKeyDefinition(key);
    if (!keyDef) {
      throw new Error(`Unknown key: ${key}`);
    }

    // keyDown
    await this.sendCommand("Input.dispatchKeyEvent", {
      type: keyDef.text ? "keyDown" : "rawKeyDown",
      key: keyDef.key,
      code: keyDef.code,
      windowsVirtualKeyCode: keyDef.keyCode,
      modifiers,
      text: keyDef.text || "",
    });

    // keyUp
    await this.sendCommand("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: keyDef.key,
      code: keyDef.code,
      windowsVirtualKeyCode: keyDef.keyCode,
      modifiers,
    });
  }

  /**
   * 滚动
   */
  async scroll(
    direction: "up" | "down" | "left" | "right",
    amount = 3
  ): Promise<void> {
    const delta = amount * 100;
    const deltaX = direction === "left" ? -delta : direction === "right" ? delta : 0;
    const deltaY = direction === "up" ? -delta : direction === "down" ? delta : 0;

    // 在页面中心滚动
    const centerX = 400; // 默认值
    const centerY = 300;

    await this.dispatchMouseEvent({
      type: "mouseWheel",
      x: centerX,
      y: centerY,
      deltaX,
      deltaY,
    });
  }

  /**
   * 导航到 URL
   */
  async navigate(url: string): Promise<void> {
    await this.sendCommand("Page.navigate", { url });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getKeyDefinition(key: string): {
    key: string;
    code: string;
    keyCode: number;
    text?: string;
  } | null {
    const definitions: Record<string, { key: string; code: string; keyCode: number; text?: string }> = {
      enter: { key: "Enter", code: "Enter", keyCode: 13, text: "\r" },
      tab: { key: "Tab", code: "Tab", keyCode: 9 },
      backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
      escape: { key: "Escape", code: "Escape", keyCode: 27 },
      space: { key: " ", code: "Space", keyCode: 32, text: " " },
      arrowup: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
      arrowdown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
      arrowleft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
      arrowright: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
      delete: { key: "Delete", code: "Delete", keyCode: 46 },
      home: { key: "Home", code: "Home", keyCode: 36 },
      end: { key: "End", code: "End", keyCode: 35 },
      pageup: { key: "PageUp", code: "PageUp", keyCode: 33 },
      pagedown: { key: "PageDown", code: "PageDown", keyCode: 34 },
    };

    return definitions[key.toLowerCase()] || null;
  }
}

// 导出供其他模块使用
export default CDPController;
