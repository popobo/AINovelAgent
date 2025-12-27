# 百万字小说摘要提取策略

## 核心挑战

- **上下文限制**：即使是最新的128K模型，也无法一次性处理百万字小说（约40万tokens）
- **信息密度**：需要保留关键情节、人物关系、世界观设定等重要信息
- **更新效率**：每次续写后，需要高效更新摘要而不重新处理全文

## 解决方案：多层次增量摘要架构

### 1. 分层摘要结构

```
┌─────────────────────────────────────┐
│      全局摘要 (Global Summary)       │
│  - 核心剧情主线                      │
│  - 主要人物关系                      │
│  - 世界观设定                        │
│  - 最近N章摘要（滑动窗口）            │
└─────────────────────────────────────┘
                ↕
┌─────────────────────────────────────┐
│    卷/部分摘要 (Volume Summary)      │
│  - 每卷的核心情节                    │
│  - 卷内人物发展                      │
│  - 卷内关键事件                      │
└─────────────────────────────────────┘
                ↕
┌─────────────────────────────────────┐
│      章节摘要 (Chapter Summary)      │
│  - 章节核心事件                      │
│  - 人物出现与互动                    │
│  - 关键对话/决策                     │
└─────────────────────────────────────┘
```

### 2. 数据存储设计

```typescript
// Prisma Schema 示意
model Novel {
  id        String   @id @default(uuid())
  title     String
  chapters  Chapter[]
  summaries Summary[]
  // ...
}

model Chapter {
  id           String   @id @default(uuid())
  novelId      String
  chapterIndex Int
  title        String?
  content      String   // 原始文本
  summary      String?  // 章节摘要
  embeddings   Embedding[]
  // ...
}

model Summary {
  id          String   @id @default(uuid())
  novelId     String
  type        SummaryType  // CHAPTER, VOLUME, GLOBAL
  targetId    String?      // 关联的章节ID或卷ID
  content     String       // 摘要内容
  metadata    Json?        // 额外信息（人物、设定等）
  version     Int
  updatedAt   DateTime @updatedAt
  // ...
}

enum SummaryType {
  CHAPTER
  VOLUME
  GLOBAL
}
```

### 3. 摘要提取流程

#### 阶段1：章节级摘要（首次导入）

**策略**：批量处理 + 滑动窗口

1. **批量分块**：
   - 将小说按章节分割（使用LLM识别章节）
   - 每章如果超过模型上下文（如32K），进一步按段落拆分
   - 每个段落提取要点，再合并成章节摘要

2. **处理流程**：
```
单章内容 → [如果>上下文限制] → 分段处理 → 段落要点提取 → 合并章节摘要
```

3. **提示词模板**：
```
请为以下章节内容生成结构化摘要，包含：

1. **核心事件**：本 chapter 发生的关键事件（3-5个要点）
2. **人物活动**：主要人物的出现和行为
3. **关键信息**：重要的设定、线索、伏笔
4. **情感线索**：重要的情感变化或关系发展

要求：
- 摘要控制在500字以内
- 保留具体的人物名称、地点、时间等关键实体
- 突出与后续剧情相关的线索

章节内容：
{chapter_content}
```

#### 阶段2：卷/部分摘要（可选层级）

**策略**：合并章节摘要生成卷摘要

1. **识别卷/部分**：
   - 使用LLM分析章节标题和内容，识别自然的分卷点
   - 或用户手动标记卷的分界

2. **摘要合并**：
```
卷内所有章节摘要 → [合并处理] → 卷摘要
```

3. **处理策略**：
   - 如果章节摘要总数在上下文内：直接合并生成
   - 如果超出：先按章节摘要聚类，生成子摘要，再合并

#### 阶段3：全局摘要

**策略**：关键信息提取 + 滑动窗口

1. **组成结构**：
```
全局摘要 = {
  core_plot: "核心剧情主线（压缩版）",
  characters: {
    "人物名": {
      role: "角色定位",
      relationships: ["与其他人物关系"],
      arc: "人物发展弧线"
    }
  },
  world_building: {
    setting: "世界观设定",
    rules: "重要规则/法则",
    locations: "关键地点"
  },
  recent_chapters: [
    // 最近N章的摘要（滑动窗口，如最近10章）
  ],
  key_themes: ["核心主题"]
}
```

2. **生成策略**：

**方法A：递归压缩法**（适合首次生成）
```
所有章节摘要 → 聚类分组 → 每组生成子摘要 → 递归合并 → 全局摘要
```

**方法B：关键章节提取法**（适合更新）
```
1. 使用embedding检索，识别与核心主题最相关的章节
2. 提取这些章节的摘要
3. 结合最近的章节摘要
4. 生成/更新全局摘要
```

### 4. 增量更新策略

#### 4.1 章节新增/更新

```typescript
// 伪代码流程
async function updateSummaryAfterNewChapter(
  novelId: string,
  newChapterId: string
) {
  // 1. 为新章节生成摘要
  const chapterSummary = await generateChapterSummary(newChapterId);
  
  // 2. 更新全局摘要中的"最近章节"滑动窗口
  await updateGlobalSummaryRecentChapters(novelId, chapterSummary);
  
  // 3. 检查是否需要更新卷摘要（如果新章节属于某个卷）
  const volumeId = getChapterVolume(newChapterId);
  if (volumeId) {
    await updateVolumeSummary(volumeId);
  }
  
  // 4. 标记全局摘要需要手动更新（因为手动触发策略）
  await markGlobalSummaryNeedsUpdate(novelId);
}
```

#### 4.2 全局摘要更新（手动触发）

**策略**：智能压缩 + 关键信息保留

```typescript
async function updateGlobalSummary(novelId: string) {
  // 1. 获取当前全局摘要
  const currentGlobal = await getGlobalSummary(novelId);
  
  // 2. 获取所有章节摘要（或卷摘要，如果存在）
  const chapterSummaries = await getAllChapterSummaries(novelId);
  
  // 3. 如果章节摘要总量在上下文内
  if (totalTokens(chapterSummaries) < CONTEXT_LIMIT * 0.8) {
    // 直接生成新摘要
    const newGlobal = await generateGlobalSummaryFromChapters(chapterSummaries);
    return newGlobal;
  }
  
  // 4. 如果超出上下文，使用关键章节提取法
  const keyChapters = await extractKeyChapters(novelId, {
    // 最近N章（必选）
    recentCount: 10,
    // 使用embedding检索与核心主题相关的章节
    embeddingBasedCount: 20,
    // 人物关键章节（通过人物关系图识别）
    characterKeyCount: 10
  });
  
  // 5. 合并关键章节摘要 + 当前全局摘要 → 生成新摘要
  const newGlobal = await generateGlobalSummaryIncremental(
    currentGlobal,
    keyChapters
  );
  
  return newGlobal;
}
```

### 5. 关键信息提取与维护

独立维护结构化的关键信息，用于续写时的上下文注入：

```typescript
model NovelMetadata {
  id           String   @id @default(uuid())
  novelId      String
  characters   Json     // 人物信息
  locations    Json     // 地点信息
  timeline     Json     // 时间线
  worldRules   Json     // 世界观规则
  keyEvents    Json     // 关键事件索引
  updatedAt    DateTime @updatedAt
}

// 人物信息结构示例
{
  "characters": {
    "张三": {
      "name": "张三",
      "role": "主角",
      "description": "年龄、外貌、性格",
      "relationships": {
        "李四": "好友",
        "王五": "敌人"
      },
      "keyMoments": ["章节ID列表"],
      "currentStatus": "最新状态描述"
    }
  }
}
```

**提取策略**：
- 首次导入：遍历所有章节，提取并合并人物、地点等信息
- 增量更新：仅处理新增/修改章节，更新相关信息

### 6. 续写时的摘要使用策略

#### 6.1 摘要方案

```
续写上下文 = 全局摘要 + 最近N章摘要 + 关键信息
```

**上下文组装**：
```typescript
function buildSummaryContext(novelId: string, recentCount: number = 5) {
  const globalSummary = getGlobalSummary(novelId);
  const recentChapters = getRecentChapterSummaries(novelId, recentCount);
  const metadata = getNovelMetadata(novelId);
  
  return {
    global: globalSummary,
    recent: recentChapters,
    characters: metadata.characters,
    worldBuilding: metadata.worldRules,
    // 总长度控制在模型上下文限制内（如80%）
  };
}
```

#### 6.2 混合方案（RAG + 摘要）

```
续写上下文 = 
  全局摘要（压缩核心信息）
  + RAG检索的相关章节（基于用户提示词）
  + 最近N章摘要
  + 关键信息（人物、设定）
```

**流程**：
1. 根据用户提示词，使用embedding检索相关章节
2. 提取这些章节的摘要或关键段落
3. 结合全局摘要和最近章节
4. 组装最终上下文

### 7. 实现建议

#### 7.1 摘要生成API设计

```typescript
// 章节摘要生成
POST /api/novels/:novelId/summaries/chapters/:chapterId
// 手动触发全局摘要更新
POST /api/novels/:novelId/summaries/global/update
// 获取续写用的摘要上下文
GET /api/novels/:novelId/summaries/context?strategy=summary&recentCount=5
```

#### 7.2 提示词优化

**章节摘要提示词**：
- 强调保留实体信息（人物名、地点名）
- 突出因果关系和情节推进
- 标记伏笔和线索

**全局摘要提示词**：
- 强调主线剧情压缩
- 保留人物关系网络
- 突出世界观一致性

#### 7.3 性能优化

1. **异步处理**：摘要生成使用队列异步处理，避免阻塞
2. **缓存策略**：摘要结果缓存，只有内容变更时才重新生成
3. **批量处理**：章节摘要可以批量生成，提高效率
4. **增量计算**：利用旧摘要，只处理变更部分

### 8. 上下文长度控制

**策略**：动态调整各部分的token分配

```typescript
const CONTEXT_LIMIT = 100000; // 假设使用100K模型
const SAFE_LIMIT = CONTEXT_LIMIT * 0.8; // 保留20%给续写输出

function allocateContextTokens(strategy: 'summary' | 'rag' | 'hybrid') {
  if (strategy === 'summary') {
    return {
      globalSummary: SAFE_LIMIT * 0.3,      // 30%
      recentChapters: SAFE_LIMIT * 0.4,     // 40%
      keyInfo: SAFE_LIMIT * 0.2,            // 20%
      userPrompt: SAFE_LIMIT * 0.1          // 10%
    };
  }
  // ... 其他策略的分配
}
```

### 9. 质量保证

1. **摘要验证**：生成后使用LLM验证摘要是否保留了关键信息
2. **一致性检查**：检查摘要之间的一致性（人物关系、时间线等）
3. **用户反馈**：允许用户查看和编辑摘要，提高准确性

## 总结

这个策略的核心思想是：
1. **分层压缩**：从章节到全局，逐层压缩信息
2. **增量更新**：只处理变更部分，避免重复计算
3. **智能提取**：结合embedding和规则，识别关键章节
4. **灵活组合**：续写时根据策略动态组装上下文

这样可以在上下文限制下，有效提取和维护百万字小说的关键信息，支持高质量的续写。
