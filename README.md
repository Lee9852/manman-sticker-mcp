# 满满表情包 MCP

一个极简的远程 MCP 表情包插件。

## 当前结构

- `stickers.json`：保存表情 id、中文名称、标签和 Postimages HTTPS 直链
- `sticker_search`：按中文语境/标签搜索候选
- `sticker_pick`：返回选中表情的 structuredContent
- `widget.html`：只渲染一张小图片，并用 widgetState 保存当前表情
- CSP 仅放行 `https://i.postimg.cc`

图片不再由 Render 托管，也不再返回 base64。
