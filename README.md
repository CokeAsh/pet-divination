# 宠物灵语 · 宠物占卜沟通网站

与毛孩子的心灵对话 —— 前后端完整版，接 OpenAI API 生成「心灵讯息」。

## 快速运行（已安装依赖且已配置 .env 时）

```bash
npm run start
```

然后浏览器打开 **http://localhost:5173**。  
（也可用 `npm run dev:all`，效果相同。）

## 技术栈

- **前端**：React 18 + Vite 5 + React Router 6 + Tailwind CSS 3
- **后端**：Go + Gin（原 Node.js 已废弃）
- **接 API**：OpenAI GPT（`openai` 包），Key 只放在后端

## 接 API 的文件与行（注释已标好）

| 文件 | 说明 | 关键行 |
|------|------|--------|
| **backend/main.go** | 后端：调 GPT 的完整逻辑 | 见 `handleFortune`、`handleChat` |
| **src/pages/Fortune.jsx** | 前端：请求后端占卜接口 | 见 `【接 API】第 1～5 步` 注释 |
| **src/pages/Result.jsx** | 前端：展示接口返回的 message | 见 `【接 API】` 注释那一行 |

### server/index.js 里「接 API」对应步骤

- **第 1 步**：用 `OPENAI_API_KEY` 创建 `OpenAI` 客户端  
- **第 2 步**：未配置 key 时直接返回错误，避免请求发到 OpenAI  
- **第 3 步**：拼「系统提示」（宠物占卜师人设）  
- **第 4 步**：拼「用户消息」（宠物类型、名字、心情、问题）  
- **第 5 步**：`openai.chat.completions.create()` 真正调用 GPT  
- **第 6 步**：从返回结果里取出 `content` 作为 `message`  
- **第 7 步**：请求失败时返回错误信息  

### 前端 Fortune.jsx 里「接 API」对应步骤

- **第 1 步**：请求地址 `/api/fortune`（由 Vite 代理到后端）  
- **第 2 步**：请求体 `body` 包含 petType、petName、emotion、question  
- **第 3 步**：`fetch(apiUrl, { method: 'POST', ... })` 发请求  
- **第 4 步**：`res.ok` 为 false 时显示错误  
- **第 5 步**：成功时把 `data.message` 带到结果页  

## 本地运行

### 1. 安装依赖

```bash
npm install
```

**后端为 Go 编写**，需安装 [Go 1.21+](https://go.dev/dl/)。首次运行会自动执行 `go mod download`。

### 2. 配置 API Key

在项目根目录新建 `.env` 文件（可复制 `.env.example`）：

```bash
cp .env.example .env
```

在 `.env` 里填入配置（可参考 `.env.example`）：

```
# 必填：Supabase 数据库连接
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# 至少配置其一（AI 占卜）
OPENAI_API_KEY=sk-...        # OpenAI 官方
DEEPSEEK_API_KEY=sk-...      # DeepSeek（USE_DEEPSEEK=false 可禁用）
```

**获取 Supabase 连接串**：Supabase 项目 → Settings → Database → Connection string（URI）

（不要将 `.env` 提交到 git，已加入 .gitignore。）

### 3. 同时启动后端 + 前端

```bash
npm run dev:all
```

会同时启动：

- 后端（Go）：http://localhost:3000（提供 `/api/*`）
- 前端：http://localhost:5173

**创建管理员**：`npm run init-admin -- 用户名 密码`
- 前端：http://localhost:5173（Vite 会把 `/api` 代理到 3000）

浏览器访问前端地址即可使用占卜。

若想分开启动：

```bash
# 终端 1：后端
npm run server

# 终端 2：前端
npm run dev
```

### 4. 仅构建前端（部署用）

```bash
npm run build
npm run preview
```

部署时需单独部署后端（如 Node 服务器或 Serverless），并设置环境变量 `OPENAI_API_KEY`；前端请求的 `/api` 需指向该后端地址。

## 功能结构

| 路径 | 说明 |
|------|------|
| `/` | 首页：介绍与入口 |
| `/pet` | 选择宠物类型与名字 |
| `/fortune` | 快速感应：选择心情、问题，抽牌后请求 AI |
| `/result` | 展示占卜结果 |
| `/consult` | 深度占卜：与莉莉安娜对话 |
| `/login` | 登录 / 注册 |
| `/admin` | 管理后台（管理员） |
| `/dashboard` | 占卜师后台 |

仅供娱乐，用心感受与毛孩子的联结。
