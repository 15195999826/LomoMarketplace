/**
 * Lovart 查询 tools — lovart_threads, lovart_artifacts, lovart_download, lovart_delete_thread
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LovartClient, type Artifact } from '../clients/lovart/client.js';

const TOKEN = process.env.LOVART_TOKEN ?? "";
const DEFAULT_PROJECT = process.env.LOVART_PROJECT ?? "c51d5d46a06c4f7bb1b876168fcf8400";

const client = new LovartClient({ token: TOKEN });

function tokenGuard(): string | null {
  if (!TOKEN) return "LOVART_TOKEN environment variable is not set.";
  return null;
}

function formatArtifact(a: Artifact, localPath?: string): string {
  const lines = [
    `- ID: ${a.artifact_id}`,
    `  Name: ${a.image_name ?? "-"}`,
    `  Size: ${a.width}x${a.height}`,
    `  URL: ${a.image_url}`,
  ];
  if (a.prompt_text) lines.push(`  Prompt: ${a.prompt_text.slice(0, 200)}`);
  if (a.source) lines.push(`  Source: ${a.source}`);
  if (localPath) lines.push(`  Local: ${localPath}`);
  return lines.join("\n");
}

export function registerLovartQueryTools(server: McpServer): void {
  // Tool: lovart_threads
  server.tool(
    "lovart_threads",
    "List conversation threads in a Lovart.ai project.",
    {
      project_id: z.string().optional().describe("Lovart project ID"),
    },
    async ({ project_id }) => {
      const err = tokenGuard();
      if (err) return { content: [{ type: "text" as const, text: err }], isError: true };

      const projectId = project_id ?? DEFAULT_PROJECT;
      try {
        const threads = await client.listThreads(projectId);
        if (threads.length === 0) {
          return { content: [{ type: "text" as const, text: `No threads found in project ${projectId}` }] };
        }
        const lines = threads.map((t) => {
          const preview = (t.text || t.title || "(unnamed)").slice(0, 80);
          return `- ${t.agentThreadId}  ${preview}  ${t.updateTime ?? ""}`;
        });
        return { content: [{ type: "text" as const, text: `${threads.length} threads in project ${projectId}:\n\n${lines.join("\n")}` }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: `Failed: ${e.message}` }], isError: true };
      }
    }
  );

  // Tool: lovart_artifacts
  server.tool(
    "lovart_artifacts",
    "Extract image artifacts from a Lovart.ai thread's chat history.",
    {
      thread_id: z.string().describe("Thread ID to extract artifacts from"),
    },
    async ({ thread_id }) => {
      const err = tokenGuard();
      if (err) return { content: [{ type: "text" as const, text: err }], isError: true };

      try {
        const messages = await client.getChatHistory(thread_id);
        const artifacts = client.extractArtifacts(messages);
        if (artifacts.length === 0) {
          return { content: [{ type: "text" as const, text: `No artifacts found in thread ${thread_id}` }] };
        }
        const lines = artifacts.map((a) => formatArtifact(a));
        return { content: [{ type: "text" as const, text: `${artifacts.length} artifacts in thread ${thread_id}:\n\n${lines.join("\n\n")}` }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: `Failed: ${e.message}` }], isError: true };
      }
    }
  );

  // Tool: lovart_download
  server.tool(
    "lovart_download",
    "Download all image artifacts from a Lovart.ai thread to local disk.",
    {
      thread_id: z.string().describe("Thread ID to download artifacts from"),
      dir: z.string().optional().describe("Output directory (default: ./lovart-output)"),
      resize: z.number().optional().describe("Resize width via OSS processing"),
      format: z.enum(["png", "webp"]).optional().describe("Output format"),
    },
    async ({ thread_id, dir, resize, format }) => {
      const err = tokenGuard();
      if (err) return { content: [{ type: "text" as const, text: err }], isError: true };

      const outDir = dir ?? "./lovart-output";
      try {
        const messages = await client.getChatHistory(thread_id);
        const artifacts = client.extractArtifacts(messages);
        if (artifacts.length === 0) {
          return { content: [{ type: "text" as const, text: `No artifacts found in thread ${thread_id}` }] };
        }

        const results: string[] = [];
        let ok = 0;
        let fail = 0;
        for (const a of artifacts) {
          try {
            const path = await client.downloadArtifact(a, outDir, { resize, format });
            results.push(`OK  ${a.artifact_id} → ${path}`);
            ok++;
          } catch (e: any) {
            results.push(`ERR ${a.artifact_id}: ${e.message}`);
            fail++;
          }
        }

        return { content: [{ type: "text" as const, text: `Downloaded ${ok}/${artifacts.length} artifacts (${fail} errors) to ${outDir}:\n\n${results.join("\n")}` }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: `Failed: ${e.message}` }], isError: true };
      }
    }
  );

  // Tool: lovart_delete_thread
  server.tool(
    "lovart_delete_thread",
    "Delete a conversation thread from a Lovart.ai project.",
    {
      thread_id: z.string().describe("Thread ID (agentThreadId) to delete"),
      project_id: z.string().optional().describe("Project ID"),
    },
    async ({ thread_id, project_id }) => {
      const projectId = project_id || DEFAULT_PROJECT;
      try {
        const resp = await fetch(
          "https://www.lovart.ai/api/canva/agent/deleteAgentThread",
          {
            method: "POST",
            headers: { token: TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ agentThreadId: thread_id, projectId }),
          }
        );
        const data = (await resp.json()) as any;
        if (data.code !== 0) {
          return { content: [{ type: "text" as const, text: `Delete failed: ${data.msg || JSON.stringify(data)}` }], isError: true };
        }
        return { content: [{ type: "text" as const, text: `Thread ${thread_id} deleted successfully.` }] };
      } catch (e: any) {
        return { content: [{ type: "text" as const, text: `Failed: ${e.message}` }], isError: true };
      }
    }
  );
}
