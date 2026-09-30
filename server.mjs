import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import * as z from "zod/v4";

const currentDir = dirname(fileURLToPath(import.meta.url));
const stickers = JSON.parse(readFileSync(join(currentDir, "stickers.json"), "utf8"));
const widgetHtml = readFileSync(join(currentDir, "widget.html"), "utf8");
const port = Number(process.env.PORT || 3000);

const uiResourceUri = "ui://manman-stickers/postimages-v1.html";
const uiMimeType = "text/html;profile=mcp-app";
const imageDomain = "https://i.postimg.cc";

const stickerSchema = z.object({
  id: z.string(),
  name: z.string(),
  labels: z.array(z.string()),
  imageUrl: z.string().url()
});

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s，。！？、,.!?;；:：~～—_-]+/g, "");
}

function scoreSticker(sticker, query) {
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
}

function searchStickers(query = "", limit = 6) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 12));
  return stickers
    .map(sticker => ({ sticker, score: scoreSticker(sticker, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.sticker.id.localeCompare(b.sticker.id))
    .slice(0, safeLimit)
    .map(item => item.sticker);
}

function getSticker(id) {
  const wanted = String(id ?? "").trim().padStart(3, "0");
  return stickers.find(sticker => sticker.id === wanted);
}

function uiMeta() {
  return {
    ui: {
      prefersBorder: false,
      csp: {
        connectDomains: [],
        resourceDomains: [imageDomain]
      }
    },
    "openai/widgetPrefersBorder": false,
    "openai/ui": {
      availableDisplayModes: ["inline"]
    },
    "openai/widgetDescription": "只显示一张小巧的表情包图片。",
    "openai/widgetCSP": {
      connect_domains: [],
      resource_domains: [imageDomain]
    }
  };
}

function buildMcpServer() {
  const mcp = new McpServer(
    { name: "manman-sticker-mcp", version: "2.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  mcp.registerTool(
    "sticker_search",
    {
      title: "搜索满满的表情包",
      description: "按中文名称、情绪或聊天语境搜索表情。先搜索候选，再调用 sticker_pick 展示选中的图片。",
      inputSchema: z.object({
        query: z.string().default("").describe("搜索语境或关键词，例如：委屈、亲亲、催回复、早安"),
        limit: z.number().int().min(1).max(12).default(6).describe("最多返回多少个候选")
      }),
      outputSchema: z.object({
        query: z.string(),
        count: z.number().int(),
        stickers: z.array(stickerSchema)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async ({ query, limit }) => {
      const results = searchStickers(query, limit);
      return {
        content: [{
          type: "text",
          text: results.length
            ? results.map(item => `${item.id}｜${item.name}｜${item.labels.join("、")}`).join("\n")
            : "没有找到匹配表情。"
        }],
        structuredContent: {
          query,
          count: results.length,
          stickers: results
        }
      };
    }
  );

  mcp.registerTool(
    "sticker_pick",
    {
      title: "发送满满的表情包",
      description: "按 id 选择一张表情，只显示对应图片。",
      inputSchema: z.object({
        id: z.string().describe("表情 id，例如 003")
      }),
      outputSchema: stickerSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: {
        ui: { resourceUri: uiResourceUri },
        "openai/outputTemplate": uiResourceUri,
        "openai/toolInvocation/invoking": "正在挑表情……",
        "openai/toolInvocation/invoked": "挑好了"
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

      return {
        content: [],
        structuredContent: sticker
      };
    }
  );

  const meta = uiMeta();
  mcp.registerResource(
    "manman-sticker-image",
    uiResourceUri,
    {
      title: "满满表情包",
      description: "只显示 sticker_pick 选中的图片。",
      mimeType: uiMimeType,
      _meta: meta
    },
    async uri => ({
      contents: [{
        uri: uri.href,
        mimeType: uiMimeType,
        text: widgetHtml,
        _meta: meta
      }]
    })
  );

  return mcp;
}

const mcpHandler = createMcpHandler(() => buildMcpServer(), { responseMode: "json" });
const nodeMcpHandler = toNodeHandler(mcpHandler);

function send(res, statusCode, contentType, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

const httpServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/mcp") {
    Promise.resolve(nodeMcpHandler(req, res)).catch(error => {
      console.error("MCP request failed", error);
      if (!res.headersSent) {
        send(res, 500, "application/json; charset=utf-8", JSON.stringify({ error: "MCP request failed" }));
      } else {
        res.end();
      }
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    send(
      res,
      200,
      "application/json; charset=utf-8",
      JSON.stringify({ ok: true, stickers: stickers.length, version: "2.0.0", ui: "postimages-v1" })
    );
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/") {
    send(res, 200, "text/plain; charset=utf-8", "manman-sticker-mcp 2.0.0");
    return;
  }

  send(res, 404, "application/json; charset=utf-8", JSON.stringify({ error: "Not found" }));
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Sticker MCP is listening on http://0.0.0.0:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  httpServer.close();
  await mcpHandler.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
