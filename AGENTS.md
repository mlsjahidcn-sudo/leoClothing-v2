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
│   │       ├── fetch-pdf/route.ts
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
- 管理员账户：`admin@chengfeng.com` / `admin123`

## 常用命令

- `pnpm dev` — 启动开发服务器 (端口 5000)
- `pnpm ts-check` — TypeScript 类型检查
- `pnpm lint --quiet` — ESLint 检查
- `pnpm build` — 构建生产版本
- `npx tsx src/storage/database/seed.ts` — 重新种子数据库

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/categories | 获取所有分类 |
| GET | /api/products?category=&search=&featured= | 产品列表 (支持筛选) |
| GET | /api/products/[id] | 产品详情 (含关联数据) |
| POST | /api/rfqs | 提交询价单 |
| POST | /api/fetch-pdf | PDF/URL内容解析 |

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
