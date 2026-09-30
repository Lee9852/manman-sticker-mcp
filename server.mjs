import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const stickers = JSON.parse(
  readFileSync(join(currentDir, "stickers.json"), "utf8")
);
const widgetHtml = readFileSync(
  join(currentDir, "widget.html"),
  "utf8"
);

const PORT = Number(process.env.PORT ?? 3000);
const MCP_PATH = "/mcp";
const UI_URI = "ui://manman-stickers/sticker-v4.html";
const IMAGE_DOMAIN = "https://i.postimg.cc";

const stickerSchema = z.object({
  id: z.string(),
  name: z.string(),
  labels: z.array(z.string()),
  imageUrl: z.string().url(),
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

  const id = normalize(sticker.id);
  const name = normalize(sticker.name);
  let score = 0;

  if (q === id) score += 1000;
  if (q === name) score += 500;
  if (name.includes(q)) score += 180;
  if (q.includes(name)) score += 150;

  for (const rawLabel of sticker.labels) {
    const label = normalize(rawLabel);
    if (!label) continue;

    if (q === label) score += 220;
    else if (q.includes(label)) score += 100 + Math.min(label.length, 10);
    else if (q.length >= 2 && label.includes(q)) score += 70;
  }

  return score;
}

function searchStickers(query = "", limit = 6) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 12));

  return stickers
    .map((sticker) => ({
      sticker,
      score: scoreSticker(sticker, query),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.sticker.id.localeCompare(b.sticker.id)
    )
    .slice(0, safeLimit)
    .map((item) => item.sticker);
}

function getSticker(id) {
  const raw = String(id ?? "").trim();
  const normalizedId = /^\d+$/.test(raw)
    ? raw.padStart(3, "0")
    : raw;

  return stickers.find((sticker) => sticker.id === normalizedId);
}

function createStickerServer() {
  const server = new McpServer(
    {
      name: "manman-sticker-mcp",
      version: "3.0.0",
    },
    {
      instructions:
        "Use sticker_search to find a fitting sticker from the user's personal sticker pack, then call sticker_pick with exactly one chosen id. A sticker can be used as a lightweight conversational reaction when it naturally fits, but do not spam stickers.",
    }
  );

  registerAppResource(
    server,
    "manman-sticker-widget",
    UI_URI,
    {},
    async () => ({
      contents: [
        {
          uri: UI_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              prefersBorder: false,
              csp: {
                connectDomains: [],
                resourceDomains: [IMAGE_DOMAIN],
              },
            },
            "openai/widgetPrefersBorder": false,
            "openai/widgetCSP": {
              connect_domains: [],
              resource_domains: [IMAGE_DOMAIN],
            },
            "openai/ui": {
              availableDisplayModes: ["inline"],
            },
          },
        },
      ],
    })
  );

  server.registerTool(
    "sticker_search",
    {
      title: "搜索满满的表情包",
      description:
        "按中文名称、情绪、聊天语境或关键词搜索表情候选。需要发图时先调用本工具，再把选中的 id 交给 sticker_pick。",
      inputSchema: {
        query: z
          .string()
          .default("")
          .describe("聊天语境或关键词，例如：亲亲、委屈、催回复、早安、生气"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(12)
          .default(6)
          .describe("最多返回多少个候选"),
      },
      outputSchema: {
        query: z.string(),
        count: z.number().int(),
        stickers: z.array(stickerSchema),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ query, limit }) => {
      const results = searchStickers(query, limit);

      return {
        content: [
          {
            type: "text",
            text: results.length
              ? results
                  .map(
                    (item) =>
                      `${item.id}｜${item.name}｜${item.labels.join("、")}`
                  )
                  .join("\n")
              : "没有找到匹配表情。",
          },
        ],
        structuredContent: {
          query,
          count: results.length,
          stickers: results,
        },
      };
    }
  );

  registerAppTool(
    server,
    "sticker_pick",
    {
      title: "发送满满的表情包",
      description:
        "从 sticker_search 的候选中按 id 选择一张表情，并直接渲染这张图片。",
      inputSchema: {
        id: z.string().describe("表情 id，例如 003"),
      },
      outputSchema: {
        id: z.string(),
        name: z.string(),
        labels: z.array(z.string()),
        imageUrl: z.string().url(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: UI_URI },
        "openai/outputTemplate": UI_URI,
        "openai/toolInvocation/invoking": "正在挑表情……",
        "openai/toolInvocation/invoked": "挑好了",
      },
    },
    async ({ id }) => {
      const sticker = getSticker(id);

      if (!sticker) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `没有 id 为 ${id} 的表情，请先调用 sticker_search。`,
            },
          ],
        };
      }

      return {
        content: [],
        structuredContent: sticker,
      };
    }
  );

  return server;
}

function sendJson(res, statusCode, value) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(value));
}

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(
    req.url,
    `http://${req.headers.host ?? "localhost"}`
  );

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "content-type, accept, authorization, mcp-session-id, mcp-protocol-version",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
    });
    res.end("manman-sticker-mcp 3.0.0");
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      version: "3.0.0",
      stickers: stickers.length,
      ui: UI_URI,
    });
    return;
  }

  const mcpMethods = new Set(["POST", "GET", "DELETE"]);

  if (
    url.pathname === MCP_PATH &&
    req.method &&
    mcpMethods.has(req.method)
  ) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createStickerServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP request failed", error);

      if (!res.headersSent) {
        sendJson(res, 500, {
          error: "MCP request failed",
        });
      } else {
        res.end();
      }
    }

    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Sticker MCP listening on http://0.0.0.0:${PORT}${MCP_PATH}`
  );
});
