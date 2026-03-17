/**
 * Lovart 生成 tools — lovart_generate, lovart_models
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LovartClient, type Artifact } from '../clients/lovart/client.js';
import { LovartWsClient } from '../clients/lovart/ws-client.js';
import { generateUuid } from '../clients/lovart/signature.js';

// --- Config from env ---
const TOKEN = process.env.LOVART_TOKEN ?? "";
const DEFAULT_PROJECT = process.env.LOVART_PROJECT ?? "c51d5d46a06c4f7bb1b876168fcf8400";

// --- Model registry ---
const MODEL_MAP: Record<string, { tool: string; display: string; type: string }> = {
  "nano-banana-pro":  { tool: "generate_image_nano_banana_pro", display: "Nano Banana Pro", type: "image" },
  "nano-banana-2":    { tool: "generate_image_nano_banana_2", display: "Nano Banana 2", type: "image" },
  "nano-banana":      { tool: "generate_image_nano_banana", display: "Nano Banana", type: "image" },
  "imagen-4":         { tool: "generate_image_imagen_v4", display: "Gemini Imagen 4", type: "image" },
  "gpt-image-1.5":    { tool: "generate_image_gpt_image_1_5", display: "GPT Image 1.5", type: "image" },
  "flux-2-pro":       { tool: "generate_image_flux_2_pro", display: "Flux 2 Pro", type: "image" },
  "flux-2-max":       { tool: "generate_image_flux_2_max", display: "Flux 2 Max", type: "image" },
  "seedream-5":       { tool: "generate_image_seedream_v5", display: "Seedream 5.0 Lite", type: "image" },
  "seedream-4.5":     { tool: "generate_image_seedream_v4_5", display: "Seedream 4.5", type: "image" },
  "seedream-4":       { tool: "generate_image_seedream_v4", display: "Seedream 4", type: "image" },
  "midjourney":       { tool: "generate_image_midjourney", display: "Midjourney", type: "image" },
  "kling-3.0":        { tool: "generate_video_kling_v3", display: "Kling 3.0", type: "video" },
  "kling-3.0-omni":   { tool: "generate_video_kling_v3_omni", display: "Kling 3.0 Omni", type: "video" },
  "kling-2.6":        { tool: "generate_video_kling_v2_6", display: "Kling 2.6", type: "video" },
  "kling-o1":         { tool: "generate_video_kling_omni_v1", display: "Kling O1", type: "video" },
  "sora-2":           { tool: "generate_video_sora_v2", display: "Sora 2", type: "video" },
  "sora-2-pro":       { tool: "generate_video_sora_v2_pro", display: "Sora 2 Pro", type: "video" },
  "veo-3.1":          { tool: "generate_video_veo3_1", display: "Veo 3.1", type: "video" },
  "veo-3.1-fast":     { tool: "generate_video_veo3_1_fast", display: "Veo 3.1 Fast", type: "video" },
  "veo-3":            { tool: "generate_video_veo3", display: "Veo 3", type: "video" },
  "seedance-1.5-pro": { tool: "generate_video_seedance_pro_v1_5", display: "Seedance Pro 1.5", type: "video" },
  "wan-2.6":          { tool: "generate_video_wan_v2_6", display: "Wan 2.6", type: "video" },
  "hailuo-2.3":       { tool: "generate_video_hailuo_v2_3", display: "Hailuo 2.3", type: "video" },
};

function resolveModel(model: string): { tool: string; display: string; type: string } | null {
  const entry = MODEL_MAP[model.toLowerCase()];
  if (entry) return entry;
  if (model.startsWith("generate_image_") || model.startsWith("generate_video_")) {
    const type = model.startsWith("generate_image_") ? "image" : "video";
    return { tool: model, display: model, type };
  }
  return null;
}

// --- Shared instances ---
const client = new LovartClient({ token: TOKEN });
let wsClient: LovartWsClient | null = null;

function getWsClient(): LovartWsClient {
  if (!wsClient) wsClient = new LovartWsClient(TOKEN);
  return wsClient;
}

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

export function registerLovartGenerateTools(server: McpServer): void {
  // Tool: lovart_generate
  server.tool(
    "lovart_generate",
    `Generate images on Lovart.ai using a text prompt. Sends the prompt via WebSocket, waits for generation to complete, and optionally downloads the result.

Available models (pass as 'model' parameter):
  Image: nano-banana-pro, nano-banana-2 (default), nano-banana, imagen-4, gpt-image-1.5, flux-2-pro, flux-2-max, seedream-5, seedream-4.5, seedream-4, midjourney
  Video: kling-3.0, kling-3.0-omni, sora-2, sora-2-pro, veo-3.1, veo-3.1-fast, seedance-1.5-pro, wan-2.6, hailuo-2.3

Aspect ratio hint: pass aspect_ratio (e.g. "16:9") — the AI agent may or may not follow it.`,
    {
      prompt: z.string().describe("The text prompt for image generation"),
      model: z.string().optional().describe("Model alias or raw tool name. Default: nano-banana-2"),
      aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "5:4", "4:5"]).optional().describe("Aspect ratio"),
      project_id: z.string().optional().describe("Lovart project ID"),
      thread_id: z.string().optional().describe("Lovart thread ID"),
      download_dir: z.string().optional().describe("Directory to save generated images"),
    },
    async ({ prompt, model, aspect_ratio, project_id, thread_id, download_dir }) => {
      const err = tokenGuard();
      if (err) return { content: [{ type: "text" as const, text: err }], isError: true };

      const projectId = project_id ?? DEFAULT_PROJECT;
      const threadId = thread_id ?? generateUuid();
      const dir = download_dir ?? "./lovart-output";

      let preferImageTools: string[] | undefined;
      if (model) {
        const resolved = resolveModel(model);
        if (!resolved) {
          const available = Object.keys(MODEL_MAP).filter(k => MODEL_MAP[k].type === "image").join(", ");
          return { content: [{ type: "text" as const, text: `Unknown model "${model}". Available: ${available}` }], isError: true };
        }
        preferImageTools = [resolved.tool];
      }

      try {
        const ws = getWsClient();
        const events = await ws.sendAndCollect({
          text: prompt,
          threadId,
          projectId,
          preferImageTools,
          aspectRatio: aspect_ratio,
        });

        let artifacts = client.extractArtifacts(events as any[]);

        if (artifacts.length === 0) {
          await new Promise((r) => setTimeout(r, 3000));
          const msgs = await client.getChatHistory(threadId);
          const all = client.extractArtifacts(msgs);
          artifacts = all.slice(-1);
        }

        if (artifacts.length === 0) {
          const summary = events.map((e) => `[${e.event ?? e.type ?? "?"}] ${JSON.stringify(e).slice(0, 150)}`).join("\n");
          return { content: [{ type: "text" as const, text: `Generation completed but no artifacts found.\n\nReceived ${events.length} events:\n${summary}` }] };
        }

        const results: string[] = [`Generated ${artifacts.length} image(s):\n`];
        for (const a of artifacts) {
          try {
            const path = await client.downloadArtifact(a, dir);
            results.push(formatArtifact(a, path));
          } catch (e: any) {
            results.push(formatArtifact(a) + `\n  Download error: ${e.message}`);
          }
        }

        return { content: [{ type: "text" as const, text: results.join("\n") }] };
      } catch (e: any) {
        wsClient?.close();
        wsClient = null;
        return { content: [{ type: "text" as const, text: `Generation failed: ${e.message}` }], isError: true };
      }
    }
  );

  // Tool: lovart_models
  server.tool(
    "lovart_models",
    "List all available image and video generation models on Lovart.ai.",
    {},
    async () => {
      const imageModels = Object.entries(MODEL_MAP)
        .filter(([, v]) => v.type === "image")
        .map(([alias, v]) => `  ${alias.padEnd(20)} ${v.display.padEnd(22)} tool: ${v.tool}`)
        .join("\n");
      const videoModels = Object.entries(MODEL_MAP)
        .filter(([, v]) => v.type === "video")
        .map(([alias, v]) => `  ${alias.padEnd(20)} ${v.display.padEnd(22)} tool: ${v.tool}`)
        .join("\n");

      return {
        content: [{
          type: "text" as const,
          text: `Image Models:\n${imageModels}\n\nVideo Models:\n${videoModels}\n\nUse the alias (first column) as the 'model' parameter in lovart_generate.`,
        }],
      };
    }
  );
}
