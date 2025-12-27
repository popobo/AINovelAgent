# AI小说续写系统

基于Next.js和OpenRouter的百万字小说AI续写系统，支持RAG、摘要和混合三种续写策略。

## 功能特性

- ✅ 用户认证系统（NextAuth.js，用户名/密码登录）
- ✅ 小说上传（支持txt文件）
- ✅ 章节自动识别（使用LLM）
- ✅ 向量化存储（pgvector + OpenRouter Embedding）
- ✅ 向量检索（基于相似度的章节检索）
- 🔄 章节摘要生成
- 🔄 全局摘要生成
- 🔄 续写功能（摘要/RAG/混合方案）

## 技术栈

- **前端**: Next.js 16, React 19, Tailwind CSS 4
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL + pgvector
- **ORM**: Prisma
- **认证**: NextAuth.js
- **AI服务**: OpenRouter API
- **测试**: Vitest

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动数据库

```bash
docker-compose up -d
```

### 3. 配置环境变量

复制环境变量模板：

```bash
cp env.example .env.local
```

编辑 `.env.local`，设置必要的环境变量：

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_novel_agent?schema=public
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
```

生成NEXTAUTH_SECRET：

```bash
openssl rand -base64 32
```

### 4. 运行数据库迁移

```bash
pnpm db:migrate
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 开发命令

```bash
# 开发服务器
pnpm dev

# 构建
pnpm build

# 生产模式
pnpm start

# 运行测试
pnpm test

# 测试UI界面
pnpm test:ui

# 测试覆盖率
pnpm test:coverage

# Prisma Studio（数据库可视化）
pnpm db:studio

# 数据库迁移
pnpm db:migrate
```

## 测试

### 快速测试

```bash
# 1. 使用快速端到端测试脚本（推荐）
./scripts/quick-e2e-test.sh

# 2. 或使用测试环境设置脚本
./scripts/test-setup.sh

# 3. 运行单元测试
pnpm test
```

### 测试文档

- **[COMPLETE_TESTING_GUIDE.md](./COMPLETE_TESTING_GUIDE.md)** - **完整功能测试指南（推荐）**
  - 包含所有功能的详细测试步骤
  - 端到端测试流程
  - 问题排查指南
  - 测试检查清单

- [TESTING.md](./TESTING.md) - 基础测试指南
  - 单元测试说明
  - API端点测试
  - 数据库连接测试

## 项目结构

```
.
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   ├── login/             # 登录页面
│   ├── register/          # 注册页面
│   └── ...
├── lib/                    # 业务逻辑
│   ├── auth/              # 认证相关
│   ├── db/                # 数据库操作
│   ├── embeddings/        # 向量化相关
│   ├── novel/             # 小说相关
│   └── openrouter/        # OpenRouter客户端
├── prisma/                # Prisma配置
│   ├── schema.prisma      # 数据库模式
│   └── migrations/        # 迁移文件
├── tests/                 # 测试文件
└── components/            # React组件
```

## 环境要求

- Node.js 18+
- pnpm
- Docker & Docker Compose
- PostgreSQL（通过Docker运行）

## 许可证

MIT
