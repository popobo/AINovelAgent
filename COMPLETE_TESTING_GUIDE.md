# 完整功能测试指南

本指南提供端到端的完整功能测试流程，帮助您验证所有已实现的功能。

## 📋 测试前准备

### 1. 环境准备

```bash
# 1. 确保Docker正在运行
docker ps

# 2. 启动数据库
docker-compose up -d

# 3. 检查数据库状态
docker ps | grep ai_novel_agent_postgres
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env.local

# 编辑.env.local，设置以下内容：
# - DATABASE_URL（已自动配置）
# - NEXTAUTH_SECRET（必需，可以使用 openssl rand -base64 32 生成）
# - NEXTAUTH_URL=http://localhost:3000
```

生成NEXTAUTH_SECRET：
```bash
openssl rand -base64 32
```

### 3. 初始化数据库

```bash
# 运行数据库迁移
pnpm db:migrate

# 验证数据库结构（可选）
pnpm db:studio
```

### 4. 获取OpenRouter API Key

1. 访问 https://openrouter.ai/
2. 注册/登录账户
3. 获取API Key（后续测试需要）

### 5. 启动开发服务器

```bash
pnpm dev
```

服务器将在 http://localhost:3000 启动。

---

## 🧪 完整测试流程

### 第一阶段：用户认证测试

#### 1.1 用户注册

**步骤：**
1. 访问 http://localhost:3000
2. 点击"注册"或访问 http://localhost:3000/register
3. 填写注册表单：
   - 用户名：`testuser`
   - 邮箱（可选）：`test@example.com`
   - 密码：`password123`
   - 确认密码：`password123`
4. 点击"注册"按钮

**预期结果：**
- ✅ 注册成功，跳转到登录页面
- ✅ 如果用户名已存在，显示错误提示

**验证方法：**
```bash
# 使用Prisma Studio查看数据库
pnpm db:studio
# 在users表中应该能看到新注册的用户
```

#### 1.2 用户登录

**步骤：**
1. 访问 http://localhost:3000/login
2. 使用刚才注册的用户名和密码登录
3. 点击"登录"按钮

**预期结果：**
- ✅ 登录成功，跳转到小说列表页面（/novels）
- ✅ 如果密码错误，显示错误提示

#### 1.3 配置API Key

**步骤：**
1. 登录后，访问 http://localhost:3000/settings
2. 在"OpenRouter API Key"部分输入您的OpenRouter API Key
3. 点击"保存"

**预期结果：**
- ✅ 显示"API Key更新成功"
- ✅ 显示"✓ 已配置"状态

---

### 第二阶段：小说上传与章节识别测试

#### 2.1 准备测试文件

创建一个测试用的txt文件 `test_novel.txt`：

```txt
第一章 开始

这是小说的第一章内容。主角张三出场了，他是一个年轻的冒险者。

第二章 遇见

张三在旅途中遇见了李四，两人成为了朋友。他们一起踏上了冒险的旅程。

第三章 挑战

他们遇到了第一个挑战，需要跨越一条宽阔的河流。
```

#### 2.2 上传小说

**步骤：**
1. 访问 http://localhost:3000/novels/upload
2. 选择刚才创建的 `test_novel.txt` 文件
3. 输入小说标题（可选）：`测试小说`
4. 点击"上传"

**预期结果：**
- ✅ 上传成功，跳转到小说详情页面
- ✅ 小说标题正确显示
- ✅ 显示一个临时章节"待解析"

#### 2.3 章节识别

**步骤：**
1. 在小说详情页面，调用章节识别API（需要先确保已配置API Key）

**使用curl测试：**
```bash
# 先登录获取session token（需要通过浏览器登录后从cookie中获取）
# 或者使用浏览器开发者工具中的Network标签页，复制请求的Cookie

curl -X POST http://localhost:3000/api/novels/{novelId}/chapters/identify \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"model": "openai/gpt-4o-mini"}'
```

**或者通过前端界面：**
- 可以添加一个"识别章节"按钮来触发

**预期结果：**
- ✅ 章节识别成功
- ✅ 小说被正确分割为多个章节
- ✅ 每个章节有正确的标题和内容

---

### 第三阶段：摘要功能测试

#### 3.1 生成章节摘要

**步骤：**
1. 访问小说详情页面：http://localhost:3000/novels/{novelId}
2. 访问摘要管理页面：http://localhost:3000/novels/{novelId}/summaries
3. 找到某个章节，点击"生成摘要"按钮

**或使用API：**
```bash
curl -X POST http://localhost:3000/api/novels/{novelId}/summaries/chapters/{chapterId} \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"model": "openai/gpt-4o-mini"}'
```

**预期结果：**
- ✅ 章节摘要生成成功
- ✅ 摘要包含核心事件、人物活动、关键信息等
- ✅ 摘要显示在章节下方

#### 3.2 提取关键信息（元数据）

**步骤：**
使用API提取元数据：
```bash
curl -X POST http://localhost:3000/api/novels/{novelId}/metadata/extract \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"model": "openai/gpt-4o-mini"}'
```

**预期结果：**
- ✅ 元数据提取成功
- ✅ 包含人物信息、地点信息、世界观设定等

#### 3.3 生成全局摘要

**步骤：**
1. 访问摘要管理页面：http://localhost:3000/novels/{novelId}/summaries
2. 点击"更新全局摘要"按钮

**或使用API：**
```bash
curl -X POST http://localhost:3000/api/novels/{novelId}/summaries/global/update \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{"model": "openai/gpt-4o-mini"}'
```

**预期结果：**
- ✅ 全局摘要生成成功
- ✅ 包含核心剧情主线、人物关系、世界观设定
- ✅ 包含最近章节的摘要

---

### 第四阶段：向量化存储测试

#### 4.1 生成Embedding

**注意：** 这个功能目前需要通过API调用，可以创建一个管理界面来触发。

**使用Prisma Studio或直接SQL：**
```sql
-- 检查embeddings表
SELECT COUNT(*) FROM embeddings WHERE "novelId" = 'your-novel-id';
```

**或创建测试脚本：**
```typescript
// scripts/test-embedding.ts
import { storeChapterEmbedding } from './lib/embeddings/store';
import { getUserById } from './lib/db/user';
import { getNovelById } from './lib/db/novel';

// 需要传入正确的参数
```

**预期结果：**
- ✅ 章节的embedding成功存储到数据库
- ✅ embeddings表中有对应记录

---

### 第五阶段：续写功能测试

#### 5.1 摘要方案续写

**步骤：**
1. 访问续写页面：http://localhost:3000/novels/{novelId}/continue
2. 选择续写策略：**摘要方案**
3. 选择模型：`openai/gpt-4o`（或其他可用模型）
4. 输入提示词：`主角遇到了新的挑战，需要解决一个难题`
5. 点击"开始续写"

**预期结果：**
- ✅ 续写成功，显示续写结果
- ✅ 续写内容与原文风格一致
- ✅ 续写内容符合提示词要求

#### 5.2 RAG方案续写

**前提条件：** 需要先为章节生成embedding（第四阶段）

**步骤：**
1. 在续写页面选择策略：**RAG方案**
2. 输入提示词：`关于主角冒险的内容`
3. 点击"开始续写"

**预期结果：**
- ✅ 系统检索到相关章节
- ✅ 基于相关章节生成续写内容
- ✅ 续写内容与检索到的章节相关

#### 5.3 混合方案续写

**步骤：**
1. 在续写页面选择策略：**混合方案**
2. 输入提示词：`继续讲述主角的冒险故事`
3. 点击"开始续写"

**预期结果：**
- ✅ 结合了全局摘要、相关章节和关键信息
- ✅ 续写质量最优

#### 5.4 保存续写结果

**步骤：**
1. 续写成功后，选择保存方式：
   - **保存为新章节**：点击"保存为新章节"
   - **追加到现有章节**：点击"追加到现有章节"，输入章节ID

**预期结果：**
- ✅ 新章节模式：创建新的章节，章节索引递增
- ✅ 追加模式：内容追加到指定章节末尾
- ✅ 保存后跳转到小说详情页面

---

### 第六阶段：完整流程测试

#### 6.1 端到端测试场景

**场景：上传小说 → 识别章节 → 生成摘要 → 续写**

1. **上传小说**
   - 上传一个较长的txt文件（至少3-5章）

2. **识别章节**
   - 调用章节识别API

3. **生成所有章节摘要**
   - 为每个章节生成摘要

4. **生成全局摘要**
   - 更新全局摘要

5. **生成Embedding**（可选，用于RAG方案）
   - 为所有章节生成embedding

6. **使用三种策略分别续写**
   - 摘要方案续写
   - RAG方案续写（需要embedding）
   - 混合方案续写（需要embedding）

7. **保存续写结果**
   - 尝试两种保存方式

8. **验证结果**
   - 检查小说章节列表
   - 检查章节内容
   - 检查摘要内容

---

## 🔍 测试检查清单

### 基础功能
- [ ] 用户注册成功
- [ ] 用户登录成功
- [ ] API Key配置成功
- [ ] 小说上传成功
- [ ] 章节识别成功

### 摘要功能
- [ ] 章节摘要生成成功
- [ ] 元数据提取成功
- [ ] 全局摘要生成成功
- [ ] 摘要内容正确显示

### 向量化功能
- [ ] Embedding生成成功
- [ ] 向量存储成功
- [ ] 向量检索功能正常

### 续写功能
- [ ] 摘要方案续写成功
- [ ] RAG方案续写成功
- [ ] 混合方案续写成功
- [ ] 续写结果保存成功（新章节）
- [ ] 续写结果保存成功（追加）

### 用户界面
- [ ] 小说列表显示正常
- [ ] 小说详情显示正常
- [ ] 续写界面功能完整
- [ ] 摘要管理界面功能完整
- [ ] 导航栏正常显示

---

## 🐛 常见问题排查

### 问题1：数据库连接失败

**症状：** 启动时出现数据库连接错误

**解决方法：**
```bash
# 检查Docker是否运行
docker ps

# 检查数据库容器
docker ps | grep postgres

# 重启数据库
docker-compose restart

# 检查端口占用
lsof -i :5432
```

### 问题2：NextAuth认证失败

**症状：** 登录后无法保持session

**解决方法：**
- 检查 `.env.local` 中的 `NEXTAUTH_SECRET` 是否设置
- 清除浏览器cookies后重试
- 检查 `NEXTAUTH_URL` 是否正确

### 问题3：OpenRouter API调用失败

**症状：** 续写或摘要生成失败

**解决方法：**
- 检查API Key是否正确配置
- 检查API Key是否有足够余额
- 查看服务器日志中的错误信息
- 尝试使用不同的模型

### 问题4：章节识别不准确

**症状：** 章节分割错误

**解决方法：**
- 确保txt文件格式清晰（章节标题明确）
- 尝试使用更强大的模型（如gpt-4）
- 检查文件编码（建议使用UTF-8）

### 问题5：向量检索无结果

**症状：** RAG方案续写时无法找到相关章节

**解决方法：**
- 确保已为章节生成embedding
- 检查相似度阈值设置（可以降低阈值）
- 验证embedding是否正确存储

---

## 📊 性能测试建议

### 大文件测试

1. **上传大文件（>1MB）**
   - 测试上传大文件的性能
   - 检查是否有超时或内存问题

2. **大量章节测试**
   - 测试100+章节的小说
   - 验证章节识别和摘要生成的性能

3. **并发测试**
   - 同时进行多个续写请求
   - 检查系统稳定性

### 数据库性能

```bash
# 使用Prisma Studio查看数据
pnpm db:studio

# 检查表大小
# 在Prisma Studio的SQL编辑器中执行：
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🎯 测试脚本

创建一个自动化测试脚本（可选）：

```bash
#!/bin/bash
# scripts/e2e-test.sh

echo "开始端到端测试..."

# 1. 检查数据库
echo "检查数据库..."
docker ps | grep postgres || { echo "数据库未运行"; exit 1; }

# 2. 运行单元测试
echo "运行单元测试..."
pnpm test --run

# 3. 检查环境变量
echo "检查环境变量..."
[ -f .env.local ] || { echo ".env.local不存在"; exit 1; }

echo "基础检查完成！"
echo "请手动完成功能测试..."
```

---

## 📝 测试报告模板

测试完成后，可以填写以下测试报告：

```
测试日期：_______
测试人员：_______
测试环境：_______

功能测试结果：
- 用户认证：✅ / ❌
- 小说上传：✅ / ❌
- 章节识别：✅ / ❌
- 摘要生成：✅ / ❌
- 向量检索：✅ / ❌
- 续写功能：✅ / ❌
  - 摘要方案：✅ / ❌
  - RAG方案：✅ / ❌
  - 混合方案：✅ / ❌

发现的问题：
1. 
2. 

建议改进：
1. 
2. 
```

---

## 🚀 快速测试命令

```bash
# 快速测试所有功能
./scripts/test-setup.sh    # 设置测试环境
pnpm test                  # 运行单元测试
pnpm dev                   # 启动开发服务器

# 然后按照上述流程进行手动测试
```

---

## 📚 相关文档

- [README.md](./README.md) - 项目说明
- [TESTING.md](./TESTING.md) - 基础测试指南
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - 实现状态

---

**祝测试顺利！** 🎉

