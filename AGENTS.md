# AGENTS.md

## 项目概览

乘风国际 (Chengfeng International) B2B男装批发平台 — 面向服装制造公司的产品展示、询价管理和后台管理网页应用。

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI) + 自定义组件
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + Drizzle ORM)
- **字体**: Playfair Display + Noto Serif SC + Inter

## 目录结构

```
├── public/                 # 静态资源 (含 /products/ 产品图片)
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── layout.tsx      # 根布局 (Navbar + Footer)
│   │   ├── page.tsx        # 首页 (Hero+分类+精选+品牌)
│   │   ├── globals.css     # 全局样式 (自定义设计系统)
│   │   ├── products/
│   │   │   ├── page.tsx    # 产品列表页 (API驱动+分类筛选)
│   │   │   └── [id]/page.tsx # 产品详情页 (db-queries)
│   │   ├── about/page.tsx  # 关于我们页
│   │   ├── inquiry/page.tsx # 询价页 (API驱动)
│   │   ├── admin/          # 管理后台
│   │   │   ├── layout.tsx  # 后台根布局 (AuthProvider)
│   │   │   ├── login/page.tsx # 登录页
│   │   │   ├── page.tsx    # 仪表盘首页
│   │   │   ├── products/   # 产品管理
│   │   │   └── rfqs/       # 询价管理
│   │   └── api/            # API 路由
│   │       ├── categories/route.ts
│   │       ├── products/route.ts & [id]/route.ts
│   │       ├── rfqs/route.ts
│   │       └── admin/      # 管理API
│   │           ├── auth/route.ts
│   │           ├── dashboard/route.ts
│   │           ├── products/route.ts & [id]/route.ts
│   │           └── rfqs/route.ts & [id]/route.ts
│   ├── components/         # 自定义组件
│   │   ├── Navbar.tsx      # 导航栏 (响应式+移动端菜单)
│   │   ├── Footer.tsx      # 页脚
│   │   ├── ProductCard.tsx # 产品卡片 (standard/large/tall变体)
│   │   ├── SizeSelector.tsx # 尺码选择器 (tooltip+modal)
│   │   └── admin/
│   │       ├── AuthProvider.tsx # 管理后台认证Provider
│   │       └── AdminShell.tsx   # 管理后台外壳 (侧边栏+顶栏)
│   ├── lib/                # 工具库
│   │   ├── utils.ts        # 通用工具函数
│   │   ├── products.ts     # 产品类型定义 + 分类常量 + getCategoryLabel
│   │   ├── product-data.ts # 静态产品数据 (仅seed使用) + 查询函数
│   │   └── db-queries.ts   # 数据库查询函数 (Supabase)
│   └── storage/
│       └── database/
│           ├── supabase-client.ts # Supabase客户端
│           ├── seed.ts            # 数据库种子脚本
│           └── shared/schema.ts   # Drizzle表定义
├── DESIGN.md               # 设计规范文档
└── package.json
```

## 开发规范

### 设计系统

- 配色：暖调米白(#F5F0EB) + 深炭灰(#2C2C2C) + 低饱和赭石(#B8956A)
- 字体：Playfair Display(英文标题) + Noto Serif SC(中文标题) + Inter(正文)
- 圆角：最大 6px（--radius: 0.375rem）
- 动效：仅 hover 微移 + 淡入，禁止弹跳/旋转/渐变

### 编码规范

- TypeScript strict 模式，禁止隐式 any
- 产品分类由 `products.ts` 中的 `categories` 常量统一管理，slug 小写+连字符
- 产品数据通过 `db-queries.ts` 从 Supabase 获取（前端页面不再直接用 product-data.ts）
- `ProductCard` 支持 standard/large/tall 三种变体实现交错网格布局
- 分类显示使用 `getCategoryLabel(slug)` 函数转换 slug 为可读标签

### Hydration 注意事项

- Footer 中年份硬编码为 2025，避免 `new Date()` 导致 hydration mismatch
- 产品列表页使用 `useSearchParams` 需配合 `Suspense`
- html/body 标签添加 `suppressHydrationWarning` 防止浏览器扩展导致hydration警告

### 数据库规范

- 所有表已启用 RLS，仅通过 service_role_key 后端访问
- 产品ID格式：`cf-polo-001`, `cf-tee-001`, `cf-stripe-001`, `cf-knit-001`
- 分类slug：`polos`, `t-shirts`, `striped-tees`, `knitwear`
- 管理员账户（Supabase Auth 中实际存在）：
  - `mlsjahid@qq.com`（`superadmin`）— 主账号
  - `leochengfeng@gmail.com`（`superadmin`）— 业务联系邮箱
  - 密码不写入仓库；在 Supabase dashboard 中重置，或用 service-role 密钥通过 `auth/v1/admin/users/{id}` PUT 设置。

## 常用命令

- `pnpm dev` — 启动开发服务器 (端口 5000)
- `pnpm ts-check` — TypeScript 类型检查
- `pnpm lint --quiet` — ESLint 检查
- `pnpm build` — 构建生产版本
- `npx tsx src/storage/database/seed.ts` — 重新种子数据库

## Chatbot (Cora)

Floating B2B sales assistant on every public page. Lead-gates the visitor (name + email + company) before the chat opens, then answers product/catalog questions grounded in the live Supabase catalog.

### Stack
- **LLM**: DeepSeek Chat Completions (`deepseek-chat`) — OpenAI-compatible API.
- **RAG**: Live Supabase catalog fetch on every turn (`src/lib/chatbot/rag.ts`). No embeddings; the catalog fits comfortably in context. Switch to embedding search once the catalog exceeds ~100 products.
- **Persistence**: `chatbot_conversations` (one per visitor session, FK to `leads`) + `chatbot_messages` (rolling transcript). Migration `0007_chatbot.sql`.

### Files
- `src/lib/chatbot/deepseek.ts` — DeepSeek HTTP client (server-only, aborts after 25s).
- `src/lib/chatbot/rag.ts` — Builds the live catalog context block + extracts cited product IDs from the assistant reply.
- `src/lib/chatbot/engine.ts` — Orchestrator: system prompt + history + RAG + DeepSeek + persistence.
- `src/components/chatbot/ChatbotWidget.tsx` — Floating bubble + state machine (closed → gate → open).
- `src/components/chatbot/LeadGateForm.tsx` — Lead-capture form.
- `src/components/chatbot/ChatbotPanel.tsx` — Chat surface (messages, composer, suggested prompts).
- `src/app/api/chatbot/{leads,messages,conversations/[id]}/route.ts` — Public endpoints (service-role).
- `src/app/api/admin/chatbot/{route,[id]/route}.ts` — Admin endpoints (gated by `requireAdmin`).
- `src/app/admin/chatbot/{page,[id]/page}.tsx` — Admin list + transcript detail.
- `src/lib/validators.ts` — `chatbotLeadGateSchema`, `chatbotMessageSchema`.
- `supabase/migrations/0007_chatbot.sql` — Tables + RLS policies.

### Environment variables

| 变量 | 用途 | 是否公开 |
|------|------|---------|
| `DEEPSEEK_API_KEY` | DeepSeek API key (server-only) | ❌ 必须服务端 |
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat`，可改 `deepseek-reasoner` | ❌ 服务端 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` | ❌ 服务端 |

### Lead capture flow
1. Visitor clicks the floating bubble → `LeadGateForm` opens.
2. Form submits to `POST /api/chatbot/leads` → creates/upserts a `leads` row with `source='chatbot'` and opens a `chatbot_conversations` row.
3. Widget persists `conversation_id` + `visitor_token` to `localStorage` so returning visitors rejoin the same transcript.
4. Each turn: `POST /api/chatbot/messages` → engine rebuilds RAG context, calls DeepSeek, persists both turns, returns assistant reply.
5. Admin reads transcripts at `/admin/chatbot` (list) and `/admin/chatbot/[id]` (detail). Leads list flags chatbot leads with an `AI` badge.

### Refusal / guardrail rules baked into the system prompt
- Never invent product specs, prices, MOQs, or SKUs.
- Never quote a specific delivery date.
- Never request payment or passwords.
- Out-of-scope questions → escalate to the sales team.
- Always cite products by SKU (`CF-PO-001`) or numeric label (`Product 3`) so the citation validator can store real product IDs.

### Admin operations
- **Close / reopen** a conversation: `PATCH /api/admin/chatbot/[id]` with `{ status: 'open' | 'closed' }`.
- Transcripts are **append-only**. To redact something, edit the lead's `notes` field.

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/categories | 获取所有分类 |
| GET | /api/products?category=&search=&featured= | 产品列表 (支持筛选) |
| GET | /api/products/[id] | 产品详情 (含关联数据) |
| POST | /api/rfqs | 提交询价单 |
| POST | /api/chatbot/leads | Chatbot 潜客门 (lead gate) |
| POST | /api/chatbot/messages | Chatbot 发送一条消息 |
| GET | /api/chatbot/conversations/[id] | Chatbot 加载会话历史 |

### 管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/auth | 管理员登录 |
| GET | /api/admin/dashboard | 仪表盘数据 |
| GET | /api/admin/products | 产品列表 (含非活跃) |
| POST | /api/admin/products | 创建产品 |
| GET | /api/admin/products/[id] | 产品详情 |
| PATCH | /api/admin/products/[id] | 更新产品 |
| DELETE | /api/admin/products/[id] | 删除产品 (软删除) |
| GET | /api/admin/rfqs | 询价单列表 |
| GET | /api/admin/rfqs/[id] | 询价单详情 |
| PATCH | /api/admin/rfqs/[id] | 更新询价状态/备注 |
| GET | /api/admin/chatbot | Chatbot 会话列表 |
| GET | /api/admin/chatbot/[id] | Chatbot 会话详情 + 完整 transcript |
| PATCH | /api/admin/chatbot/[id] | 关闭/重开 Chatbot 会话 |
