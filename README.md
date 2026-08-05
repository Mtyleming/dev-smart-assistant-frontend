# 开发智能助手 · 前端工程

> 工程名：`dev-smart-assistant-frontend`  
> 本地路径：`D:\agentProject\dev-smart-assistant-frontend`  
> 技术依据：`04b-前端技术选型.md`

这是「开发智能助手」的前端项目。它负责两件事：

1. **对话式 AI 交互**：流式输出、Markdown 渲染、代码高亮、一键复制  
2. **后台管理能力**：登录、知识库管理、用户管理表格与表单

即使后端还没完全接通，你也可以先登录、点页面、体验主要流程（会自动使用本地演示数据）。

---

## 一、技术栈（一句话版）

| 用途 | 技术 | 作用 |
|------|------|------|
| 页面框架 | Vue 3 + TypeScript | 写页面和交互逻辑 |
| 工程构建 | Vite | 本地启动、打包发布 |
| 界面组件 | Element Plus | 按钮、表格、表单、上传等现成组件 |
| 页面跳转 | Vue Router 4 | 登录 / 对话 / 知识库 / 管理后台 |
| 状态管理 | Pinia | 保存登录态、对话内容、侧边栏状态 |
| 接口请求 | Axios | 调用后端普通 API |
| 流式对话 | fetch + ReadableStream | 大模型逐字输出 |
| Markdown | markdown-it + highlight.js | AI 回答排版与代码高亮 |
| 复制 | clipboard | 复制回答内容 |
| 进度条 | nprogress | 切换页面时顶部进度条 |

---

## 二、怎么启动（最重要）

### 1. 安装依赖

在项目根目录打开终端，执行：

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

浏览器打开终端里提示的地址（一般是 `http://localhost:5173`）。

### 3. 打包生产版本

```bash
npm run build
```

### 4. 预览打包结果

```bash
npm run preview
```

---

## 三、怎么登录试用

1. 打开网站后如果未登录，会跳到登录页  
2. 输入任意密码即可  
3. **用户 ID 为 15**：超级管理员，仅显示「管理后台」菜单  
4. **其他用户**：使用对话、知识库、团队管理等功能  

说明：超级管理员由前端根据用户 ID（15）简单判断，不依赖后端字段。

---

## 四、四个核心页面

| 路径 | 页面 | 做什么 |
|------|------|--------|
| `/login` | 登录页 | 输入账号密码进入系统 |
| `/chat` | 对话主界面 | 我的对话列表、创建/删除/改标题、提问与流式回答 |
| `/knowledge` | 知识库管理 | 知识库列表/新建/编辑/删除；管理文档（上传、分页、详情、删除） |
| `/admin` | 管理后台 | 仅超级管理员可进，用户组织树与启停用账号 |

默认打开 `/` 会自动跳到 `/chat`。未登录访问受保护页面会跳回登录页。

---

## 五、目录说明（给以后改代码用）

```text
dev-smart-assistant-frontend/
├── src/
│   ├── api/                 # 接口请求（登录、对话、知识库、管理）
│   ├── components/          # 可复用组件（布局、消息气泡）
│   ├── views/               # 四个核心页面
│   ├── router/              # 路由与登录守卫
│   ├── stores/              # Pinia：user / chat / app
│   ├── utils/               # http、markdown 等工具
│   ├── styles/              # 全局样式
│   ├── App.vue              # 根组件
│   └── main.ts              # 应用入口
├── public/                  # 静态资源
├── .env.development         # 开发环境变量
├── .env.production          # 生产环境变量
├── vite.config.ts           # Vite 配置（别名、代理、按需引入）
├── package.json             # 依赖与脚本
└── README.md                # 本说明书
```

---

## 六、API 约定

- 业务接口统一前缀：`/api/v1`  
- 开发环境通过 Vite 代理转发到：`http://localhost:8000`  
- 普通请求走 `src/utils/http.ts`（Axios）  
- 流式对话走 `src/api/message.ts` 的 `streamChatMessageApi`（`fetch` + SSE）

### 对话 SSE（`POST /messages/chat`）

请求体与原先一致：`content` 必填，可选 `content_type`、`conversation_id`（首次可不传）。

响应为 `text/event-stream`，常见事件顺序：

| 事件 | data 含义 |
|------|-----------|
| `conversation` | `{"conversation_id": number}` 会话 ID（新建时会推） |
| `user_msg` | 用户消息完整对象（含 id） |
| `delta` | `{"content": "..."}` 助手增量文本，可多次 |
| `assistant_msg` | 助手消息完整对象（含 id 与全文） |
| `done` | `null`，流结束 |
| `error` | `{"code": number, "message": string}` 业务错误 |

前端会边收 `delta` 边渲染气泡；结束后用 `assistant_msg` 校正最终内容与消息 ID。

相关环境变量：

- `VITE_API_BASE_URL`：默认 `/api/v1`

代理配置在 `vite.config.ts` 的 `server.proxy` 中（已关闭代理超时，避免 SSE 被提前断开）。

### 知识库（`/knowledge-bases/*`）

需登录后携带 Bearer Token。当前后端已提供：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/knowledge-bases/status` | 模块探活 |
| POST | `/knowledge-bases/page` | 分页列表（`page` / `pageSize` / `keyword`） |
| POST | `/knowledge-bases/create` | 新建（`name` 必填，`description` 可选） |
| POST | `/knowledge-bases/getById` | 详情（`id`） |
| POST | `/knowledge-bases/update` | 更新（`id` + `name`/`description`） |
| POST | `/knowledge-bases/delete` | 删除（`id`） |

### 知识库文档（同一前缀）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/knowledge-bases/createDocuments` | 上传文档（`multipart`：`kb_id` + `file`） |
| POST | `/knowledge-bases/pageDocuments` | 分页列表（`kb_id` / `page` / `pageSize` / `keyword`） |
| POST | `/knowledge-bases/getDocumentById` | 详情（`document_id`） |
| POST | `/knowledge-bases/deleteDocumentById` | 删除（`document_id`） |

上传限制：`pdf` / `docx` / `md` / `txt`，单文件最大 20MB；上传成功返回 `{ id }`（HTTP 201）。

前端页面：`/knowledge`，接口封装在 `src/api/knowledge.ts`。在知识库列表点「管理文档」可上传、分页查看、看详情、删除文档。

---

## 七、常见问题

### Q1：页面能开，但接口报错？

请先确认后端已在 `http://localhost:8000` 启动，并用真实账号登录。知识库页会直接调用真实接口；失败时会提示错误信息，不再静默使用演示数据。

### Q2：为什么管理后台进不去？

需要用户 ID 为 15 的账号登录。普通用户无法访问管理后台。

### Q3：超级管理员能看到哪些菜单？

超级管理员仅显示「管理后台」，无团队切换；对话助手、知识库、团队管理等栏目已隐藏。

### Q4：怎么改后端地址？

开发环境改 `vite.config.ts` 里 `server.proxy['/api'].target`；生产环境改 `.env.production` 的 `VITE_API_BASE_URL`。

### Q5：知识库列表是空的？

1. 确认已登录（未登录会 401）  
2. 知识库按「当前团队」隔离，切换团队后列表会不同  
3. 点击「新建知识库」创建一条后再刷新列表  

### Q6：文档上传失败？

1. 确认文件格式为 pdf / docx / md / txt，且不超过 20MB  
2. 确认后端已启动，并已登录拿到 Token  
3. 上传接口超时时间为 120 秒；网络慢时可稍等后再试  

---

## 八、后续可改进

- 文档解析状态自动刷新（轮询 pending/processing → ready）  
- 对话流支持「停止生成」按钮（AbortController 已预留）  
- 管理后台增加团队管理、权限细化  
- 补充单元测试与 E2E 测试  

---

## 九、GitHub

仓库地址：[https://github.com/Mtyleming/dev-smart-assistant-frontend](https://github.com/Mtyleming/dev-smart-assistant-frontend)

克隆后按「怎么启动」三步即可运行。

> 说明：若本机 `git push` 访问 GitHub 不稳定，可继续用 `gh` 登录状态同步代码；仓库本身已创建并完成首次上传。
