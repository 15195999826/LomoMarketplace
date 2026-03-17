/**
 * Lovart.ai WebSocket Chat Client
 * 发送消息 + 接收流式响应
 */

import { computeSignature, generateUuid } from "./signature.js";

const WS_URL = "wss://socket.lovart.ai/ws";

export interface SendMessageOptions {
  text: string;
  threadId: string;
  projectId: string;
  /** 图片 URL 列表（可选） */
  images?: string[];
  /** 线程类型，默认 0 (DEFAULT)；5 = PLANNER（指定工具时自动设置） */
  threadIdType?: number;
  /** 偏好的图片生成工具名，第一个会以 [@tool:name] 前缀注入 prompt 触发 image_sub_agent */
  preferImageTools?: string[];
  /** 宽高比，如 "16:9"、"1:1" 等 */
  aspectRatio?: string;
  /** 超时毫秒数，默认 180000 (3min) */
  timeoutMs?: number;
}

export interface WsEvent {
  type: string;
  event?: string;
  data?: any;
  [key: string]: unknown;
}

export type EventCallback = (event: WsEvent) => void;

export class LovartWsClient {
  private token: string;
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(token: string) {
    this.token = token;
  }

  /** 建立 WebSocket 连接 */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${WS_URL}?bizType=16&token=${this.token}`;
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.startHeartbeat();
        resolve();
      };
      this.ws.onerror = (e) => reject(new Error(`WebSocket error: ${e}`));
      this.ws.onclose = () => this.stopHeartbeat();
    });
  }

  /** 发送消息并收集所有响应事件直到 thread_end */
  async sendAndCollect(opts: SendMessageOptions): Promise<WsEvent[]> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const events: WsEvent[] = [];
    const reqUuid = generateUuid();
    const sendTimestamp = Date.now().toString();

    const signature = computeSignature(
      sendTimestamp,
      reqUuid,
      opts.threadId,
      opts.projectId
    );

    // Agent mode: AI reasons about prompt then generates
    const DIRECT_TOOLS = new Set([
      "generate_image_nano_banana_pro",
      "generate_image_nano_banana_2",
    ]);
    let text = opts.text;
    const toolName = opts.preferImageTools?.[0];
    if (toolName && !DIRECT_TOOLS.has(toolName)) {
      text = `[@tool:${toolName}] ${opts.text}`;
    }

    const contents: any[] = [
      { type: "text", text, text_source: "input" },
    ];
    if (opts.aspectRatio) {
      contents.push({ type: "generation_config", aspect_ratio: opts.aspectRatio });
    }
    if (opts.images) {
      for (const url of opts.images) {
        contents.push({ type: "image", image_url: url });
      }
    }

    const message = {
      role: "client",
      type: "chat",
      send_timestamp: sendTimestamp,
      req_uuid: reqUuid,
      signature,
      data: {
        version: 1,
        event: "start",
        thread_id: opts.threadId,
        project_id: opts.projectId,
        messages: [{ role: "user", contents }],
        tool_config: {
          prefer_tool_categories: {
            IMAGE: opts.preferImageTools ?? ["generate_image_nano_banana_2"],
          },
        },
        thread_id_type: (toolName && !DIRECT_TOOLS.has(toolName)) ? 5 : (opts.threadIdType ?? 0),
      },
    };

    return new Promise((resolve, reject) => {
      const timeoutMs = opts.timeoutMs ?? 180_000;
      const timeout = setTimeout(() => {
        cleanup();
        resolve(events);
      }, timeoutMs);

      const onMessage = (e: MessageEvent) => {
        try {
          const data =
            typeof e.data === "string"
              ? e.data
              : new TextDecoder().decode(e.data);
          const parsed = JSON.parse(data) as WsEvent;
          events.push(parsed);

          const eventType = parsed.data?.type ?? parsed.event;

          if (eventType === "thread_start" && parsed.data?.msg_id) {
            this.sendAck(opts.threadId, opts.projectId, parsed.data.msg_id);
          }

          if (eventType === "thread_end") {
            if (parsed.data?.msg_id) {
              this.sendAck(opts.threadId, opts.projectId, parsed.data.msg_id);
            }
            cleanup();
            resolve(events);
          }
        } catch {
          // 忽略非 JSON 消息（心跳 pong 等）
        }
      };

      const onError = (_e: Event) => {
        cleanup();
        reject(new Error(`WebSocket error during chat`));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        if (this.ws) {
          this.ws.removeEventListener("message", onMessage as any);
          this.ws.removeEventListener("error", onError);
        }
      };

      this.ws!.addEventListener("message", onMessage as any);
      this.ws!.addEventListener("error", onError);
      this.ws!.send(JSON.stringify(message));
    });
  }

  /** 发送 ack 消息 */
  private sendAck(
    threadId: string,
    projectId: string,
    msgId: string
  ): void {
    const reqUuid = generateUuid();
    const sendTimestamp = Date.now().toString();
    const signature = computeSignature(
      sendTimestamp,
      reqUuid,
      threadId,
      projectId
    );

    const ack = {
      role: "client",
      type: "chat",
      send_timestamp: sendTimestamp,
      req_uuid: reqUuid,
      signature,
      data: {
        version: 1,
        event: "ack",
        thread_id: threadId,
        project_id: projectId,
        msg_id: msgId,
      },
    };

    this.ws?.send(JSON.stringify(ack));
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        console.error("[ws] connection lost, readyState:", this.ws.readyState);
        this.stopHeartbeat();
      }
    }, 30_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** 关闭连接 */
  close() {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }
}
