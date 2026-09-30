# 满满表情包 MCP · Kelivo 版

Kelivo 专用远程 MCP。内置 29 张表情包，按中文语境搜索，并用标准 MCP 图片内容返回，Kelivo 可以直接显示。

## 工具

- `sticker_search`：按情绪、语境或标签搜索候选
- `sticker_pick`：选择一张表情并返回图片

## 部署到 Render

- Build command：`npm install --omit=dev`
- Start command：`npm start`
- Health check：`/health`
- MCP endpoint：`/mcp`

## Kelivo 配置

部署后，把下面的域名换成你的 Render 域名，再导入 Kelivo：

```json
{
  "mcpServers": {
    "满满表情包": {
      "type": "streamableHttp",
      "url": "https://你的-render-域名.onrender.com/mcp"
    }
  }
}
```

本分支只服务 Kelivo，不包含 ChatGPT Apps 小组件。

