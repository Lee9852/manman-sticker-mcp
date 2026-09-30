import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import * as z from "zod/v4";

const currentDir = dirname(fileURLToPath(import.meta.url));
const nestedCatalogUrl = new URL("./lib/catalog.mjs", import.meta.url);
const catalogApi = existsSync(fileURLToPath(nestedCatalogUrl))
  ? await import(nestedCatalogUrl.href)
  : buildFlatCatalogApi();
const { getSticker, searchStickers, stickerWithUrl } = catalogApi;
const publicDir = existsSync(join(currentDir, "public", "widget.html"))
  ? join(currentDir, "public")
  : currentDir;
const stickerDir = existsSync(join(publicDir, "stickers", "001.jpg"))
  ? join(publicDir, "stickers")
  : currentDir;
const embeddedWidgetHtml = Buffer.from("PCFkb2N0eXBlIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KICA8aGVhZD4KICAgIDxtZXRhIGNoYXJzZXQ9InV0Zi04IiAvPgogICAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xIiAvPgogICAgPHRpdGxlPua7oea7oeeahOihqOaDheWMhTwvdGl0bGU+CiAgICA8c3R5bGU+CiAgICAgIDpyb290IHsKICAgICAgICBjb2xvci1zY2hlbWU6IGxpZ2h0IGRhcms7CiAgICAgICAgZm9udC1mYW1pbHk6IHVpLXJvdW5kZWQsICJTRiBQcm8gUm91bmRlZCIsICJQaW5nRmFuZyBTQyIsIHN5c3RlbS11aSwgc2Fucy1zZXJpZjsKICAgICAgICAtLWNhcmQ6ICNmZmZkZmE7CiAgICAgICAgLS1mcmFtZTogI2Y3ZWNlNjsKICAgICAgICAtLXRleHQ6ICMyYzI0MjE7CiAgICAgICAgLS1saW5lOiByZ2JhKDc1LCA1MiwgNDQsIC4xMik7CiAgICAgICAgLS10YWc6ICNmNWRmZDU7CiAgICAgIH0KICAgICAgQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykgewogICAgICAgIDpyb290IHsKICAgICAgICAgIC0tY2FyZDogIzIxMWQxYjsKICAgICAgICAgIC0tZnJhbWU6ICMyYjI0MjE7CiAgICAgICAgICAtLXRleHQ6ICNmN2YyZWU7CiAgICAgICAgICAtLWxpbmU6IHJnYmEoMjU1LCAyNTUsIDI1NSwgLjEyKTsKICAgICAgICAgIC0tdGFnOiAjNDkzNjJlOwogICAgICAgIH0KICAgICAgfQogICAgICAqIHsgYm94LXNpemluZzogYm9yZGVyLWJveDsgfQogICAgICBib2R5IHsgbWFyZ2luOiAwOyBwYWRkaW5nOiA2cHg7IG1pbi1oZWlnaHQ6IDI3MnB4OyBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsgY29sb3I6IHZhcigtLXRleHQpOyB9CiAgICAgIC5jYXJkIHsKICAgICAgICB3aWR0aDogbWluKDEwMCUsIDI1OHB4KTsKICAgICAgICBtYXJnaW46IDAgYXV0bzsKICAgICAgICBvdmVyZmxvdzogaGlkZGVuOwogICAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWxpbmUpOwogICAgICAgIGJvcmRlci1yYWRpdXM6IDE4cHg7CiAgICAgICAgYmFja2dyb3VuZDogdmFyKC0tY2FyZCk7CiAgICAgICAgYm94LXNoYWRvdzogMCA4cHggMjRweCByZ2JhKDkwLCA2MiwgNTAsIC4xMCk7CiAgICAgIH0KICAgICAgLmZyYW1lIHsKICAgICAgICBkaXNwbGF5OiBncmlkOwogICAgICAgIG1pbi1oZWlnaHQ6IDIxMHB4OwogICAgICAgIHBsYWNlLWl0ZW1zOiBjZW50ZXI7CiAgICAgICAgcGFkZGluZzogOXB4OwogICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWZyYW1lKTsKICAgICAgfQogICAgICBpbWcgewogICAgICAgIGRpc3BsYXk6IGJsb2NrOwogICAgICAgIHdpZHRoOiBhdXRvOwogICAgICAgIG1heC13aWR0aDogMjIwcHg7CiAgICAgICAgbWF4LWhlaWdodDogMjIwcHg7CiAgICAgICAgb2JqZWN0LWZpdDogY29udGFpbjsKICAgICAgICBib3JkZXItcmFkaXVzOiAxM3B4OwogICAgICB9CiAgICAgIC5pbmZvIHsgcGFkZGluZzogMTFweCAxM3B4IDEzcHg7IH0KICAgICAgaDEgeyBtYXJnaW46IDA7IGZvbnQtc2l6ZTogMTRweDsgbGluZS1oZWlnaHQ6IDEuNDsgfQogICAgICAubGFiZWxzIHsgZGlzcGxheTogZm
const widgetHtml = Buffer.from("PCFkb2N0eXBlIGh0bWw+CjxodG1sIGxhbmc9InpoLUNOIj4KICA8aGVhZD4KICAgIDxtZXRhIGNoYXJzZXQ9InV0Zi04IiAvPgogICAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xIiAvPgogICAgPHRpdGxlPua7oea7oeeahOihqOaDheWMhTwvdGl0bGU+CiAgICA8c3R5bGU+CiAgICAgIDpyb290IHsgY29sb3Itc2NoZW1lOiBsaWdodCBkYXJrOyB9CiAgICAgICogeyBib3gtc2l6aW5nOiBib3JkZXItYm94OyB9CiAgICAgIGh0bWwsIGJvZHkgeyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7IGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyB9CiAgICAgIGJvZHkgeyBtaW4taGVpZ2h0OiAwOyBvdmVyZmxvdzogaGlkZGVuOyB9CiAgICAgIC5jYXJkIHsKICAgICAgICB3aWR0aDogY2xhbXAoMTIwcHgsIDM4dncsIDE3NnB4KTsKICAgICAgICBtYXJnaW46IDA7CiAgICAgICAgb3ZlcmZsb3c6IGhpZGRlbjsKICAgICAgICBib3JkZXItcmFkaXVzOiAxMnB4OwogICAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OwogICAgICB9CiAgICAgIGltZyB7CiAgICAgICAgZGlzcGxheTogYmxvY2s7CiAgICAgICAgd2lkdGg6IDEwMCU7CiAgICAgICAgaGVpZ2h0OiBhdXRvOwogICAgICAgIG9iamVjdC1maXQ6IGNvbnRhaW47CiAgICAgICAgYm9yZGVyLXJhZGl1czogMTJweDsKICAgICAgfQogICAgICAuZW1wdHkgeyB3aWR0aDogMTQwcHg7IHBhZGRpbmc6IDE4cHggOHB4OyBmb250OiAxM3B4LzEuNCBzeXN0ZW0tdWksIHNhbnMtc2VyaWY7IG9wYWNpdHk6IC42ODsgfQogICAgPC9zdHlsZT4KICA8L2hlYWQ+CiAgPGJvZHk+CiAgICA8bWFpbiBpZD0iYXBwIiBjbGFzcz0iY2FyZCI+PGRpdiBjbGFzcz0iZW1wdHkiPuihqOaDheato+WcqOi3kei/h+adpeKApuKApjwvZGl2PjwvbWFpbj4KICAgIDxzY3JpcHQ+CiAgICAgIGNvbnN0IGFwcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCJhcHAiKTsKCiAgICAgIGZ1bmN0aW9uIHVud3JhcCh2YWx1ZSkgewogICAgICAgIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAib2JqZWN0IikgcmV0dXJuIG51bGw7CiAgICAgICAgcmV0dXJuIHZhbHVlLnN0aWNrZXIgfHwgdmFsdWU7CiAgICAgIH0KCiAgICAgIGZ1bmN0aW9uIHN5bmNIZWlnaHQoKSB7CiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHsKICAgICAgICAgIHdpbmRvdy5vcGVuYWk/Lm5vdGlmeUludHJpbnNpY0hlaWdodD8uKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQpOwogICAgICAgIH0pOwogICAgICB9CgogICAgICBmdW5jdGlvbiByZW5kZXIodmFsdWUsIHBlcnNpc3QgPSBmYWxzZSkgewogICAgICAgIGNvbnN0IHN0aWNrZXIgPSB1bndyYXAodmFsdWUpOwogICAgICAgIGlmICghc3RpY2tlcj8uaW1hZ2VVcmwpIHJldHVybjsKCiAgICAgICAgYXBwLmlubmVySFRNTCA9IGAKICAgICAgICAgIDxpbWcgaWQ9InN0aWNrZXItaW1hZ2UiIHNyYz0iJHtlc2NhcGVBdHRyKHN0aWNrZXIuaW1hZ2VVcmwpfSIgYWx0PSIke2VzY2FwZUF0dHIoc3RpY2tlci5uYW1lIHx8ICLooajmg4XljIUiKX0iIC8+YDsKCiAgICAgICAgaWYgKHBlcnNpc3QgJiYgdHlwZW9mIHdpbmRvdy5vcGVuYWk/LnNldFdpZGdldFN0YXRlID09PSAiZnVuY3Rpb24iKSB7CiAgICAgICAgICB3aW5kb3cub3BlbmFpLnNldFdpZGdldFN0YXRlKHsgc3RpY2tlciB9KTsKICAgICAgICB9CgogICAgICAgIGNvbnN0IGltYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoInN0aWNrZXItaW1hZ2UiKTsKICAgICAgICBpbWFnZT8uYWRkRXZlbnRMaXN0ZW5lcigibG9hZCIsIHN5bmNIZWlnaHQsIHsgb25jZTogdHJ1ZSB9KTsKICAgICAgICBpbWFnZT8uYWRkRXZlbnRMaXN0ZW5lcigiZXJyb3IiLCAoKSA9PiB7CiAgICAgICAgICBhcHAuaW5uZXJIVE1MID0gYDxkaXYgY2xhc3M9ImVtcHR5Ij7lm77niYfmmoLml7bmsqHot5Hov4fmnaXvvIzlho3or5XkuIDmrKHlsLHlpb3jgII8L2Rpdj5gOwogICAgICAgICAgc3luY0hlaWdodCgpOwogICAgICAgIH0sIHsgb25jZTogdHJ1ZSB9KTsKICAgICAgICBzeW5jSGVpZ2h0KCk7CiAgICAgIH0KCiAgICAgIGZ1bmN0aW9uIGVzY2FwZUh0bWwodmFsdWUpIHsKICAgICAgICByZXR1cm4gU3RyaW5nKHZhbHVlKS5yZXBsYWNlKC9bJjw+IiddL2csIGNoYXIgPT4gKHsKICAgICAgICAgICImIjogIiZhbXA7IiwgIjwiOiAiJmx0OyIsICI+IjogIiZndDsiLCAiXCIiOiAiJnF1b3Q7IiwgIiciOiAiJiMzOTsiCiAgICAgICAgfSlbY2hhcl0pOwogICAgICB9CgogICAgICBmdW5jdGlvbiBlc2NhcGVBdHRyKHZhbHVlKSB7IHJldHVybiBlc2NhcGVIdG1sKHZhbHVlKTsgfQoKICAgICAgZnVuY3Rpb24gcmVhZE9wZW5BSVN0YXRlKGV2ZW50KSB7CiAgICAgICAgY29uc3QgZ2xvYmFscyA9IGV2ZW50Py5kZXRhaWw/Lmdsb2JhbHM7CiAgICAgICAgcmVuZGVyKGdsb2JhbHM/LnRvb2xPdXRwdXQgfHwgd2luZG93Lm9wZW5haT8udG9vbE91dHB1dCB8fCBnbG9iYWxzPy53aWRnZXRTdGF0ZSB8fCB3aW5kb3cub3BlbmFpPy53aWRnZXRTdGF0ZSk7CiAgICAgIH0KCiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJvcGVuYWk6c2V0X2dsb2JhbHMiLCByZWFkT3BlbkFJU3RhdGUpOwogICAgICByZWFkT3BlbkFJU3RhdGUoKTsKCiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJtZXNzYWdlIiwgZXZlbnQgPT4gewogICAgICAgIGlmIChldmVudC5zb3VyY2UgIT09IHdpbmRvdy5wYXJlbnQpIHJldHVybjsKICAgICAgICBjb25zdCBtZXNzYWdlID0gZXZlbnQuZGF0YTsKICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgbWVzc2FnZS5qc29ucnBjICE9PSAiMi4wIikgcmV0dXJuOwoKICAgICAgICBpZiAobWVzc2FnZS5tZXRob2QgPT09ICJ1aS9ub3RpZmljYXRpb25zL3Rvb2wtcmVzdWx0IikgewogICAgICAgICAgcmVuZGVyKG1lc3NhZ2UucGFyYW1zPy5zdHJ1Y3R1cmVkQ29udGVudCwgdHJ1ZSk7CiAgICAgICAgfQogICAgICB9LCB7IHBhc3NpdmU6IHRydWUgfSk7CiAgICA8L3NjcmlwdD4KICA8L2JvZHk+CjwvaHRtbD4K", "base64").toString("utf8");
const indexHtml = readFileSync(join(publicDir, "index.html"), "utf8");
const port = Number(process.env.PORT || 3000);
const uiResourceUri = "ui://manman-stickers/sticker-v3.html";
const uiMimeType = "text/html;profile=mcp-app";

function buildFlatCatalogApi() {
  const catalog = JSON.parse(readFileSync(join(currentDir, "stickers.json"), "utf8"));
  const normalize = value => String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s，。！？、,.!?;；:：~～—_-]+/g, "");

  const scoreSticker = (sticker, query) => {
    const q = normalize(query);
    if (!q) return 1;
    const name = normalize(sticker.name);
    let score = q === normalize(sticker.id) ? 1000 : 0;
    if (q === name) score += 500;
    if (name.includes(q)) score += 180;
    if (q.includes(name)) score += 150;
    for (const rawLabel of sticker.labels) {
      const label = normalize(rawLabel);
      if (q === label) score += 220;
      else if (q.includes(label)) score += 90 + Math.min(label.length, 8);
      else if (q.length >= 2 && label.includes(q)) score += 65;
    }
    return score;
  };

  return {
    searchStickers(query = "", limit = 6) {
      const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 12));
      return catalog
        .map(sticker => ({ sticker, score: scoreSticker(sticker, query) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.sticker.id.localeCompare(b.sticker.id))
        .slice(0, safeLimit)
        .map(item => item.sticker);
    },
    getSticker(id) {
      const wanted = String(id ?? "").trim().padStart(3, "0");
      return catalog.find(sticker => sticker.id === wanted);
    },
    stickerWithUrl(sticker, baseUrl) {
      return {
        id: sticker.id,
        name: sticker.name,
        labels: sticker.labels,
        imageUrl: `${baseUrl.replace(/\/$/, "")}/stickers/${encodeURIComponent(sticker.file)}`
      };
    }
  };
}

const stickerOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  labels: z.array(z.string()),
  imageUrl: z.string().url()
});

function cleanBaseUrl(value) {
  const text = String(value || "").trim().replace(/\/$/, "");
  try {
    const parsed = new URL(text);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin : null;
  } catch {
    return null;
  }
}

function resolveBaseUrl(requestInfo) {
  const configured = cleanBaseUrl(process.env.PUBLIC_BASE_URL);
  if (configured) return configured;

  const forwardedHost = requestInfo?.headers?.get("x-forwarded-host");
  const host = forwardedHost || requestInfo?.headers?.get("host");
  const forwardedProto = requestInfo?.headers?.get("x-forwarded-proto")?.split(",")[0]?.trim();
  let requestOrigin;
  try {
    requestOrigin = new URL(requestInfo?.url).origin;
  } catch {
    requestOrigin = null;
  }
  if (host) {
    const requestProtocol = requestOrigin ? new URL(requestOrigin).protocol.replace(":", "") : null;
    return `${forwardedProto || requestProtocol || "https"}://${host}`;
  }

  return requestOrigin || `http://localhost:${port}`;
}

function uiMeta(baseUrl) {
  return {
    ui: {
      prefersBorder: false,
      domain: baseUrl,
      csp: {
        connectDomains: [baseUrl],
        resourceDomains: [baseUrl]
      }
    },
    "openai/widgetPrefersBorder": false,
    "openai/widgetDomain": baseUrl,
    "openai/ui": {
      availableDisplayModes: ["inline"]
    },
    "openai/widgetDescription": "一张小巧的满满专属表情图片。",
    "openai/widgetCSP": {
      connect_domains: [baseUrl],
      resource_domains: [baseUrl]
    }
  };
}

function buildMcpServer(baseUrl) {
  const mcp = new McpServer(
    { name: "manman-sticker-mcp", version: "1.0.2" },
    {
      capabilities: { tools: {}, resources: {} },
      cacheHints: {
        "tools/list": { ttlMs: 300_000, cacheScope: "public" },
        "resources/list": { ttlMs: 300_000, cacheScope: "public" },
        "resources/read": { ttlMs: 300_000, cacheScope: "public" }
      }
    }
  );

  mcp.registerTool(
    "sticker_search",
    {
      title: "搜索满满的表情包",
      description: "按中文名称、情绪或聊天语境搜索表情。先调用本工具获取候选，再调用 sticker_pick 展示选中的图片。",
      inputSchema: z.object({
        query: z.string().default("").describe("搜索语境或关键词，例如：委屈、想抱抱、催回复、早安"),
        limit: z.number().int().min(1).max(12).default(6).describe("最多返回多少个候选")
      }),
      outputSchema: z.object({
        query: z.string(),
        count: z.number().int(),
        stickers: z.array(stickerOutputSchema)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ query, limit }) => {
      const stickers = searchStickers(query, limit).map(item => stickerWithUrl(item, baseUrl));
      const summary = stickers.length
        ? stickers.map(item => `${item.id}｜${item.name}｜${item.labels.join("、")}`).join("\n")
        : "没有找到匹配表情，可以换一个更短的情绪词。";

      return {
        content: [{
          type: "text",
          text: `搜索“${query || "全部"}”得到 ${stickers.length} 个候选。要把图片发给用户，请继续调用 sticker_pick，并传入候选 id。\n${summary}`
        }],
        structuredContent: { query, count: stickers.length, stickers }
      };
    }
  );

  mcp.registerTool(
    "sticker_pick",
    {
      title: "发送满满的表情包",
      description: "按 id 选择并用小巧的卡片展示一张表情。通常在 sticker_search 之后调用。",
      inputSchema: z.object({
        id: z.string().describe("表情 id，例如 003")
      }),
      outputSchema: stickerOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: {
        ui: { resourceUri: uiResourceUri },
        "openai/outputTemplate": uiResourceUri,
        "openai/toolInvocation/invoking": "正在翻表情包……",
        "openai/toolInvocation/invoked": "找到啦"
      }
    },
    async ({ id }) => {
      const sticker = getSticker(id);
      if (!sticker) {
        return {
          isError: true,
          content: [{ type: "text", text: `没有 id 为 ${id} 的表情，请先调用 sticker_search。` }]
        };
      }

      const result = stickerWithUrl(sticker, baseUrl);
      return {
        content: [{
          type: "text",
          text: `已选中：${result.name}\n图片地址：${result.imageUrl}`
        }],
        structuredContent: result
      };
    }
  );

  const resourceMetadata = {
    title: "满满的表情卡片",
    description: "显示 sticker_pick 选中的表情图片、名称和标签。",
    mimeType: uiMimeType,
    _meta: uiMeta(baseUrl)
  };

  mcp.registerResource(
    "manman-sticker-card",
    uiResourceUri,
    resourceMetadata,
    async uri => ({
      contents: [{
        uri: uri.href,
        mimeType: uiMimeType,
        text: widgetHtml,
        _meta: uiMeta(baseUrl)
      }]
    })
  );

  return mcp;
}

const mcpHandler = createMcpHandler(
  ({ requestInfo } = {}) => buildMcpServer(resolveBaseUrl(requestInfo)),
  { responseMode: "json" }
);
const nodeMcpHandler = toNodeHandler(mcpHandler);

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function send(res, statusCode, contentType, body, cacheControl = "no-store") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", cacheControl);
  res.end(body);
}

const httpServer = createServer((req, res) => {
  setCommonHeaders(res);
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (requestUrl.pathname === "/mcp") {
    Promise.resolve(nodeMcpHandler(req, res)).catch(error => {
      console.error("MCP request failed", error);
      if (!res.headersSent) send(res, 500, "application/json; charset=utf-8", JSON.stringify({ error: "MCP request failed" }));
      else res.end();
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    send(res, 200, "application/json; charset=utf-8", JSON.stringify({ ok: true, stickers: 29 }));
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/") {
    send(res, 200, "text/html; charset=utf-8", indexHtml);
    return;
  }

  const stickerMatch = requestUrl.pathname.match(/^\/stickers\/(\d{3}\.jpg)$/);
  if (req.method === "GET" && stickerMatch) {
    try {
      const image = readFileSync(join(stickerDir, stickerMatch[1]));
      send(res, 200, "image/jpeg", image, "public, max-age=31536000, immutable");
    } catch {
      send(res, 404, "application/json; charset=utf-8", JSON.stringify({ error: "Sticker not found" }));
    }
    return;
  }

  send(res, 404, "application/json; charset=utf-8", JSON.stringify({ error: "Not found" }));
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Sticker MCP is listening on http://0.0.0.0:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  httpServer.close();
  await mcpHandler.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
