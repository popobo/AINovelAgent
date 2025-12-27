# 测试指南

本文档说明如何测试已实现的AI小说续写系统功能。

## 前置准备

### 1. 启动PostgreSQL数据库

使用Docker Compose启动数据库（如果端口5432已被占用，请先停止占用该端口的服务）：

```bash
docker-compose up -d
```

验证数据库是否启动成功：

```bash
docker ps | grep ai_novel_agent_postgres
```

### 2. 配置环境变量

复制环境变量模板并配置：

```bash
cp env.example .env.local
```

编辑 `.env.local`，设置必要的环境变量：

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_novel_agent?schema=public
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
```

**生成NEXTAUTH_SECRET**（可选，用于生产环境）：

```bash
openssl rand -base64 32
```

### 3. 运行数据库迁移

确保数据库表结构是最新的：

```bash
pnpm db:migrate
```

## 运行单元测试

### 运行所有测试

```bash
pnpm test
```

### 运行特定测试文件

```bash
# 测试用户数据库操作
pnpm test tests/db/user.test.ts

# 测试小说数据库操作
pnpm test tests/db/novel.test.ts

# 测试注册功能
pnpm test tests/auth/register.test.ts

# 测试API Key管理
pnpm test tests/api-key/api-key.test.ts

# 测试OpenRouter客户端（需要mock）
pnpm test tests/openrouter/client.test.ts
```

### 使用UI模式运行测试

```bash
pnpm test:ui
```

### 生成测试覆盖率报告

```bash
pnpm test:coverage
```

## 手动功能测试

### 1. 启动开发服务器

```bash
pnpm dev
```

服务器将在 http://localhost:3000 启动。

### 2. 测试用户注册和登录

#### 测试注册功能

1. 访问 http://localhost:3000/register
2. 填写注册表单：
   - 用户名：testuser
   - 邮箱（可选）：test@example.com
   - 密码：password123
   - 确认密码：password123
3. 点击"注册"按钮
4. 应该跳转到登录页面

#### 测试登录功能

1. 访问 http://localhost:3000/login
2. 使用刚才注册的用户名和密码登录
3. 登录成功后应该跳转到首页

### 3. 测试API Key管理

1. 登录后访问 http://localhost:3000/settings
2. 在"OpenRouter API Key"部分输入你的OpenRouter API Key
3. 点击"保存"
4. 应该显示"✓ 已配置"状态

**获取OpenRouter API Key**：
- 访问 https://openrouter.ai/
- 注册账户并获取API Key

### 4. 测试小说上传

1. 准备一个txt格式的小说文件（例如：`test_novel.txt`）
2. 访问 http://localhost:3000/novels/upload
3. 选择txt文件
4. 输入小说标题（可选，默认使用文件名）
5. 点击"上传"
6. 上传成功后应该跳转到小说详情页

**注意**：上传的小说会创建一个临时章节，需要后续进行章节识别。

### 5. 测试章节识别（需要API Key）

**先确保已配置OpenRouter API Key**

1. 上传小说后，访问小说详情页面
2. 调用章节识别API（可以通过API或前端界面）：

```bash
curl -X POST http://localhost:3000/api/novels/{novelId}/chapters/identify \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"model": "openai/gpt-4o-mini"}'
```

或者创建一个前端界面来触发章节识别。

### 6. 测试获取模型列表

```bash
curl http://localhost:3000/api/openrouter/models \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

应该返回OpenRouter的可用模型列表。

## 使用Prisma Studio查看数据

查看数据库中的数据：

```bash
pnpm db:studio
```

Prisma Studio会在浏览器中打开（通常是 http://localhost:5555），可以可视化查看和编辑数据库数据。

## 测试API端点

### 认证相关

#### 注册

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 登录（通过NextAuth）

登录需要通过NextAuth的Web界面完成，无法直接通过API调用。

### 用户相关

#### 获取API Key状态

```bash
curl http://localhost:3000/api/user/api-key \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

#### 更新API Key

```bash
curl -X PUT http://localhost:3000/api/user/api-key \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"openRouterKey": "your-api-key"}'
```

### 小说相关

#### 上传小说

```bash
curl -X POST http://localhost:3000/api/novels/upload \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@/path/to/novel.txt" \
  -F "title=我的小说"
```

## 数据库连接测试

测试数据库连接是否正常：

```bash
# 使用psql连接（如果已安装）
psql postgresql://postgres:postgres@localhost:5432/ai_novel_agent

# 或者使用docker exec
docker exec -it ai_novel_agent_postgres psql -U postgres -d ai_novel_agent
```

在psql中测试pgvector扩展：

```sql
-- 检查扩展是否安装
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 测试vector类型
CREATE TABLE test_vector (id serial, vec vector(3));
INSERT INTO test_vector (vec) VALUES ('[1,2,3]');
SELECT * FROM test_vector;
DROP TABLE test_vector;
```

## 常见问题排查

### 1. 数据库连接失败

- 检查docker-compose是否运行：`docker ps`
- 检查DATABASE_URL环境变量是否正确
- 检查端口5432是否被占用

### 2. 测试失败

- 确保数据库已启动
- 确保环境变量已配置
- 检查测试数据库是否有冲突数据

### 3. NextAuth认证失败

- 检查NEXTAUTH_SECRET是否设置
- 检查NEXTAUTH_URL是否正确
- 清除浏览器cookies后重试

### 4. OpenRouter API调用失败

- 检查API Key是否正确配置
- 检查网络连接
- 查看服务器日志中的错误信息

## 下一步测试计划

当前已实现的功能测试完成后，可以继续测试：

- [ ] 章节摘要生成
- [ ] 全局摘要生成
- [ ] Embedding生成和存储
- [ ] 向量检索功能
- [ ] 续写功能（摘要方案、RAG方案、混合方案）
- [ ] 完整的前端UI流程测试

## 测试检查清单

- [ ] 数据库启动成功
- [ ] 环境变量配置完成
- [ ] 数据库迁移成功
- [ ] 单元测试全部通过
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] API Key管理功能正常
- [ ] 小说上传功能正常
- [ ] 章节识别功能正常（需要API Key）
- [ ] 模型列表获取正常（需要API Key）

