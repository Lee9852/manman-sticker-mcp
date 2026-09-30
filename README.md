# 满满的表情包 MCP

这是一个已经装好 29 张小猫表情的远程 MCP 服务。它适合部署到 Render，然后同时接入 ChatGPT 和支持 Streamable HTTP MCP 的客户端（例如 Kelivo）。

它提供两个只读工具：

- `sticker_search`：按名称、情绪或聊天语境搜索候选表情。
- `sticker_pick`：选择一张表情，并返回图片卡片、名称、标签和图片直链。

图片与服务放在同一个 Render 项目里，不需要 Postimages、Supabase 或一台一直开机的电脑。

## 最省事的部署方法

### 1. 上传到 GitHub

1. 解压本压缩包。
2. 在 GitHub 新建一个空仓库，例如 `manman-sticker-mcp`。
3. 进入仓库，选择 **Add file → Upload files**。
4. 上传解压后文件夹里面的全部内容。请确保 `render.yaml` 和 `package.json` 位于仓库根目录。
5. 提交文件。

### 2. 用 Render 部署

1. 打开 Render，选择 **New → Blueprint**。
2. 连接刚才的 GitHub 仓库。
3. Render 会自动读取 `render.yaml`，创建免费的 Node Web Service。
4. 等部署成功后，打开服务主页。若页面显示“服务运行正常”，部署就完成了。

最终 MCP 地址是：

```text
https://你的服务名.onrender.com/mcp
```

健康检查地址是：

```text
https://你的服务名.onrender.com/health
```

免费实例闲置后可能会休眠，第一次调用需要稍等服务唤醒。

## 接入 ChatGPT

在 ChatGPT 网页端或电脑端打开开发者模式，创建一个自定义连接器，把上面的 `/mcp` 完整地址填进去。无需填写 API Key 或 OAuth。

连接后可以这样说：

- “给我一个委屈等回复的表情。”
- “发一张想抱抱的表情。”
- “用表情包跟我说早安。”

ChatGPT 会先调用 `sticker_search`，再调用 `sticker_pick`，并显示图片卡片。

## 接入 Kelivo

在 Kelivo 的 MCP 设置中新增服务器：

- 类型：`Streamable HTTP`
- 地址：`https://你的服务名.onrender.com/mcp`
- 鉴权：无

如果 Kelivo 当前版本不渲染 MCP UI 卡片，它仍能读取 `sticker_pick` 返回的图片直链和 Markdown 图片回退。

## 更换或增加表情

1. 把新的 JPG 图片放进 `public/stickers/`，使用三位数字命名，例如 `030.jpg`。
2. 在 `stickers.json` 中新增对应条目：`id`、`name`、`labels`、`file`。
3. 提交到 GitHub。Render 会自动重新部署。

图片建议使用真正的 JPEG、PNG 或 WebP。当前这 29 张已经全部转换为标准 JPEG，浏览器可以直接加载。

## 可选环境变量

通常不需要配置任何环境变量。如果服务放在反向代理或自定义域名后，且返回的图片地址不正确，可以设置：

```text
PUBLIC_BASE_URL=https://你的公开域名
```

不要在末尾加 `/mcp`。

## 本地运行

需要 Node.js 20 或更高版本：

```bash
npm install
npm run check
npm start
```

然后访问 `http://localhost:3000`，MCP 地址为 `http://localhost:3000/mcp`。

## 文件说明

- `server.mjs`：MCP 与图片服务器。
- `stickers.json`：表情名称、标签和图片文件映射。
- `public/widget.html`：ChatGPT/MCP Apps 图片卡片。
- `public/stickers/`：29 张标准 JPEG 表情。
- `render.yaml`：Render 一键部署配置。
- `test/catalog.test.mjs`：目录和搜索测试。

这个服务不保存聊天内容、不写入数据库，所有工具均为只读。
