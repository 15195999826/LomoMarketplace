/**
 * Lovart.ai HTTP API Client
 * 封装读操作：线程列表、聊天历史、图片列表、artifact 下载
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = "https://www.lovart.ai";
const CDN_URL = "https://a.lovart.ai/artifacts/agent";

export interface LovartConfig {
  token: string;
}

export interface AgentThread {
  id: number;
  userId: number;
  projectId: string;
  agentThreadId: string;
  threadIdType: number;
  title: string;
  text: string;
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export interface Artifact {
  artifact_id: string;
  artifact_type: string;
  width: number;
  height: number;
  image_name: string;
  image_url: string;
  prompt_text?: string;
  source?: string;
  task_type?: string;
  thread_id?: string;
  project_id?: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  type: string;
  action_id?: string;
  step_id?: string;
  text?: string;
  content?: unknown;
  name?: string;
  tool_call_id?: string;
  status?: string;
  image_list?: unknown[];
  [key: string]: unknown;
}

export class LovartClient {
  private token: string;

  constructor(config: LovartConfig) {
    this.token = config.token;
  }

  private headers(): Record<string, string> {
    return {
      token: this.token,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST" = "POST",
    body?: unknown
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lovart API ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  /** 获取项目的对话线程列表 */
  async listThreads(projectId: string): Promise<AgentThread[]> {
    const resp = await this.request<any>(
      "/api/canva/agent/agentThreadList",
      "POST",
      { projectId }
    );
    const data = resp?.data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }

  /** 获取聊天历史（含 artifact） */
  async getChatHistory(threadId: string): Promise<ChatMessage[]> {
    const resp = await this.request<any>(
      `/api/canva/agent/chatHistoryV2?threadId=${threadId}`,
      "POST",
      {}
    );
    const data = resp?.data ?? resp;
    if (Array.isArray(data)) return data;
    if (data?.list) return data.list;
    return [];
  }

  /** 获取线程状态 */
  async getThreadStatus(threadId: string): Promise<unknown> {
    const resp = await this.request<any>(
      `/api/canva/agent/threadStatusV2?threadId=${threadId}`,
      "POST",
      {}
    );
    return resp?.data ?? resp;
  }

  /** 获取 Agent 图片列表 */
  async listImages(body: Record<string, unknown> = {}): Promise<unknown> {
    const resp = await this.request<any>(
      "/api/canva/agent/agentImageList",
      "POST",
      body
    );
    return resp?.data ?? resp;
  }

  /** 查询项目详情 */
  async queryProject(projectId: string): Promise<unknown> {
    const resp = await this.request<any>(
      "/api/canva/project/queryProject",
      "POST",
      { projectId }
    );
    return resp?.data ?? resp;
  }

  /** 从聊天历史中提取所有 artifact 图片 */
  extractArtifacts(messages: ChatMessage[]): Artifact[] {
    const artifacts: Artifact[] = [];
    const seen = new Set<string>();
    for (const msg of messages) {
      this.walkForArtifacts(msg, artifacts, seen);
    }
    return artifacts;
  }

  private walkForArtifacts(obj: unknown, out: Artifact[], seen: Set<string>): void {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) this.walkForArtifacts(item, out, seen);
      return;
    }
    const rec = obj as Record<string, unknown>;
    if (rec.artifact_id && rec.artifact_type) {
      const id = rec.artifact_id as string;
      if (!seen.has(id)) {
        seen.add(id);
        const a = { ...rec } as unknown as Artifact;
        if (!a.image_url) {
          a.image_url = `${CDN_URL}/${a.artifact_id}.png`;
        }
        out.push(a);
      }
    }
    for (const v of Object.values(rec)) {
      this.walkForArtifacts(v, out, seen);
    }
  }

  /** 下载 artifact 图片到本地 */
  async downloadArtifact(
    artifact: Artifact,
    dir: string,
    opts?: { resize?: number; format?: "png" | "webp" }
  ): Promise<string> {
    await mkdir(dir, { recursive: true });

    let url = artifact.image_url;
    if (opts?.resize || opts?.format) {
      const parts: string[] = [];
      if (opts.resize) parts.push(`image/resize,w_${opts.resize},m_lfit`);
      if (opts.format) parts.push(`format,${opts.format}`);
      url += `?x-oss-process=${parts.join("/")}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);

    const ext = opts?.format ?? "png";
    const safeName = (artifact.image_name || artifact.artifact_id)
      .replace(/[<>:"/\\|?*]/g, "_")
      .slice(0, 80);
    const filename = `${safeName}_${artifact.artifact_id}.${ext}`;
    const filepath = join(dir, filename);

    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(filepath, buffer);
    return filepath;
  }

  /** 构造 artifact 图片 URL */
  static artifactUrl(
    artifactId: string,
    opts?: { resize?: number; format?: "png" | "webp" }
  ): string {
    let url = `${CDN_URL}/${artifactId}.png`;
    if (opts?.resize || opts?.format) {
      const parts: string[] = [];
      if (opts.resize) parts.push(`image/resize,w_${opts.resize},m_lfit`);
      if (opts.format) parts.push(`format,${opts.format}`);
      url += `?x-oss-process=${parts.join("/")}`;
    }
    return url;
  }
}
