import { createOpenRouterClient } from '@/lib/openrouter/client';
import { prisma } from '@/lib/prisma';
import type { ChatMessage } from '@/lib/openrouter/types';
import type { Prisma } from '@prisma/client';

const CONTEXT_LIMIT = 100000; // 假设使用100K模型
const SAFE_LIMIT = CONTEXT_LIMIT * 0.8; // 保留20%给输出
const RECENT_CHAPTERS_COUNT = 10; // 最近章节数量

export interface GlobalSummary {
  corePlot: string;
  characters: Record<string, {
    role: string;
    relationships: string[];
    arc: string;
  }>;
  worldBuilding: {
    setting: string;
    rules: string[];
    locations: string[];
  };
  recentChapters: Array<{
    chapterIndex: number;
    title: string | null;
    summary: string;
  }>;
  keyThemes: string[];
}

/**
 * 生成全局摘要
 */
export async function generateGlobalSummary(
  novelId: string,
  apiKey: string,
  model: string = 'openai/gpt-4o-mini'
): Promise<GlobalSummary> {
  // 获取所有章节摘要
  const chapterSummaries = await prisma.summary.findMany({
    where: {
      novelId,
      type: 'CHAPTER',
    },
    include: {
      novel: {
        include: {
          chapters: {
            orderBy: { chapterIndex: 'asc' },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // 获取小说元数据
  const metadata = await prisma.novelMetadata.findUnique({
    where: { novelId },
  });

  // 获取最近N章的摘要
  const allChapters = await prisma.chapter.findMany({
    where: { novelId },
    orderBy: { chapterIndex: 'desc' },
    take: RECENT_CHAPTERS_COUNT,
    include: {
      novel: true,
    },
  });

  const recentChapters = allChapters.reverse().map(ch => {
    const summary = chapterSummaries.find(s => s.targetId === ch.id);
    return {
      chapterIndex: ch.chapterIndex,
      title: ch.title,
      summary: summary?.content || '',
    };
  });

  // 估算token数量（粗略估算：1个中文字符 ≈ 1.5 tokens）
  const totalTokens = chapterSummaries.reduce((sum, s) => sum + s.content.length * 1.5, 0);

  let globalSummary: GlobalSummary;

  if (totalTokens < SAFE_LIMIT) {
    // 方法A：直接生成（所有章节摘要都在上下文内）
    globalSummary = await generateGlobalSummaryDirect(
      chapterSummaries,
      metadata,
      recentChapters,
      apiKey,
      model
    );
  } else {
    // 方法B：关键章节提取法
    globalSummary = await generateGlobalSummaryWithKeyChapters(
      novelId,
      chapterSummaries,
      metadata,
      recentChapters,
      apiKey,
      model
    );
  }

  return globalSummary;
}

/**
 * 直接生成全局摘要（所有章节摘要都在上下文内）
 */
async function generateGlobalSummaryDirect(
  chapterSummaries: Array<{ content: string; targetId: string | null }>,
  metadata: { characters: Prisma.JsonValue; worldRules: Prisma.JsonValue } | null,
  recentChapters: Array<{ chapterIndex: number; title: string | null; summary: string }>,
  apiKey: string,
  model: string
): Promise<GlobalSummary> {
  const client = createOpenRouterClient(apiKey);

  const allSummaries = chapterSummaries.map((s, i) => `章节${i + 1}：${s.content}`).join('\n\n');
  const recentSummariesText = recentChapters
    .map(ch => `第${ch.chapterIndex}章 ${ch.title || ''}：${ch.summary}`)
    .join('\n\n');

  const prompt = `请根据以下章节摘要，生成小说的全局摘要。

所有章节摘要：
${allSummaries}

最近章节摘要：
${recentSummariesText}

${metadata ? `已有元数据：\n${JSON.stringify(metadata, null, 2)}` : ''}

要求生成包含以下部分的全局摘要（JSON格式）：

1. **corePlot**（核心剧情主线）：压缩版的主线剧情（500字以内）
2. **characters**（人物关系）：主要人物及其关系、发展弧线
3. **worldBuilding**（世界观设定）：背景设定、规则、关键地点
4. **keyThemes**（核心主题）：小说的核心主题列表

JSON格式：
{
  "corePlot": "核心剧情主线...",
  "characters": {
    "人物名": {
      "role": "角色定位",
      "relationships": ["与其他人物关系"],
      "arc": "人物发展弧线"
    }
  },
  "worldBuilding": {
    "setting": "世界观设定",
    "rules": ["规则1", "规则2"],
    "locations": ["地点1", "地点2"]
  },
  "keyThemes": ["主题1", "主题2"]
}

请返回JSON格式：`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的小说分析助手，擅长提取和总结小说的核心信息。请只返回有效的JSON格式，不要包含其他文字说明。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await client.chatCompletion({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n');
    }
    if (jsonStr.startsWith('```json')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n');
    }

    const parsed = JSON.parse(jsonStr);

    return {
      corePlot: parsed.corePlot || '',
      characters: parsed.characters || {},
      worldBuilding: parsed.worldBuilding || { setting: '', rules: [], locations: [] },
      recentChapters,
      keyThemes: parsed.keyThemes || [],
    };
  } catch (error) {
    console.error('全局摘要生成错误:', error);
    // 返回基础结构
    const metadataChars = metadata?.characters as Record<string, { role: string; relationships: string[]; arc: string }> | undefined;
    const metadataWorldRules = metadata?.worldRules as { setting: string; rules: string[]; locations: string[] } | undefined;
    return {
      corePlot: '',
      characters: metadataChars || {},
      worldBuilding: metadataWorldRules || { setting: '', rules: [], locations: [] },
      recentChapters,
      keyThemes: [],
    };
  }
}

/**
 * 使用关键章节提取法生成全局摘要
 */
async function generateGlobalSummaryWithKeyChapters(
  novelId: string,
  chapterSummaries: Array<{ content: string; targetId: string | null }>,
  metadata: { characters: Prisma.JsonValue; worldRules: Prisma.JsonValue } | null,
  recentChapters: Array<{ chapterIndex: number; title: string | null; summary: string }>,
  apiKey: string,
  model: string
): Promise<GlobalSummary> {
  const client = createOpenRouterClient(apiKey);

  // 获取当前全局摘要（如果存在）
  // 对于 GLOBAL 类型，targetId 为 null，不能使用 findUnique，改用 findFirst
  const currentGlobal = await prisma.summary.findFirst({
    where: {
      novelId,
      type: 'GLOBAL',
      targetId: null,
    },
  });

  // 构建关键章节摘要文本（最近章节 + 部分核心章节摘要）
  const keySummaries: string[] = [];

  // 1. 添加最近章节摘要
  recentChapters.forEach(ch => {
    if (ch.summary) {
      keySummaries.push(`第${ch.chapterIndex}章 ${ch.title || ''}：${ch.summary}`);
    }
  });

  // 2. 添加部分核心章节摘要（选择前20个章节摘要）
  const coreSummaries = chapterSummaries.slice(0, 20);
  coreSummaries.forEach((s, i) => {
    keySummaries.push(`核心章节${i + 1}：${s.content}`);
  });

  const keySummariesText = keySummaries.join('\n\n');

  const prompt = `请根据以下关键章节摘要，生成/更新小说的全局摘要。

关键章节摘要：
${keySummariesText}

${currentGlobal ? `当前全局摘要：\n${currentGlobal.content}` : ''}

${metadata ? `已有元数据：\n${JSON.stringify(metadata, null, 2)}` : ''}

要求生成包含以下部分的全局摘要（JSON格式）：

1. **corePlot**（核心剧情主线）：压缩版的主线剧情（500字以内）
2. **characters**（人物关系）：主要人物及其关系、发展弧线
3. **worldBuilding**（世界观设定）：背景设定、规则、关键地点
4. **keyThemes**（核心主题）：小说的核心主题列表

${currentGlobal ? '请基于当前全局摘要进行增量更新，保留重要信息，补充新内容。' : ''}

JSON格式：
{
  "corePlot": "核心剧情主线...",
  "characters": {
    "人物名": {
      "role": "角色定位",
      "relationships": ["与其他人物关系"],
      "arc": "人物发展弧线"
    }
  },
  "worldBuilding": {
    "setting": "世界观设定",
    "rules": ["规则1", "规则2"],
    "locations": ["地点1", "地点2"]
  },
  "keyThemes": ["主题1", "主题2"]
}

请返回JSON格式：`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的小说分析助手，擅长提取和总结小说的核心信息。请只返回有效的JSON格式，不要包含其他文字说明。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await client.chatCompletion({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n');
    }
    if (jsonStr.startsWith('```json')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n');
    }

    const parsed = JSON.parse(jsonStr);

    return {
      corePlot: parsed.corePlot || '',
      characters: parsed.characters || {},
      worldBuilding: parsed.worldBuilding || { setting: '', rules: [], locations: [] },
      recentChapters,
      keyThemes: parsed.keyThemes || [],
    };
  } catch (error) {
    console.error('全局摘要生成错误:', error);
    // 返回基础结构
    const metadataChars = metadata?.characters as Record<string, { role: string; relationships: string[]; arc: string }> | undefined;
    const metadataWorldRules = metadata?.worldRules as { setting: string; rules: string[]; locations: string[] } | undefined;
    return {
      corePlot: currentGlobal?.content || '',
      characters: metadataChars || {},
      worldBuilding: metadataWorldRules || { setting: '', rules: [], locations: [] },
      recentChapters,
      keyThemes: [],
    };
  }
}

