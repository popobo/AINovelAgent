# 墨韵 AI - 智能小说续写与同人创作平台

利用AI技术进行长篇小说续写和同人小说创作的智能平台。

## 功能特点

### 长篇小说续写
- 支持导入百万字级别的长篇小说
- 智能上下文管理（章节摘要、人物关系、RAG检索）
- 自动保持写作风格一致性
- 实时流式生成预览

### 同人小说创作
- 内置热门动漫/电影/电视剧设定库
- 支持自定义角色和世界观
- 多种故事类型模板
- 角色性格深度还原

### 多AI模型支持
- OpenAI GPT-4o
- Anthropic Claude 3.5
- DeepSeek
- 通义千问

## 技术栈

- **前端**: Next.js 15 + React 19 + Tailwind CSS 4
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL + pgvector)
- **AI**: 多模型适配器架构

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

参考 [ENV_CONFIG.md](./ENV_CONFIG.md) 配置环境变量。

### 3. 配置Supabase

在Supabase控制台执行 `supabase/migrations/` 目录下的SQL脚本创建数据库表。

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页
│   ├── novels/            # 小说管理模块
│   ├── fanfic/            # 同人创作模块
│   └── api/               # API路由
├── components/            # React组件
│   ├── ui/               # 通用UI组件
│   ├── editor/           # 小说编辑器
│   └── reader/           # 阅读器组件
├── lib/                   # 核心库
│   ├── ai/               # AI服务适配器
│   ├── context/          # 上下文管理器
│   ├── rag/              # RAG检索服务
│   └── supabase/         # 数据库客户端
├── types/                 # TypeScript类型
└── hooks/                 # React Hooks
```

## 许可证

MIT

