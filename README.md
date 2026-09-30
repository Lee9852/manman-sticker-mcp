# 满满表情包 MCP

给 ChatGPT 使用的远程 MCP 表情包插件。

## 功能

- `sticker_search`：按中文语境、情绪和标签搜索候选表情
- `sticker_pick`：选择一张表情并渲染 UI 卡片
- 29 张图片使用 Postimages 稳定 HTTPS 直链
- UI CSP 仅放行 `https://i.postimg.cc`
- 使用 `window.openai.widgetState` / `setWidgetState` 保存当前表情，刷新后可恢复
- 使用官方 `@modelcontextprotocol/sdk` 和 `@modelcontextprotocol/ext-apps`
- Streamable HTTP MCP endpoint：`/mcp`
- 健康检查：`/health`

## Render

Build command:

```
npm install --omit=dev
```

Start command:

```
npm start
```

连接 ChatGPT 时使用：

```
https://你的-render-域名.onrender.com/mcp
```
