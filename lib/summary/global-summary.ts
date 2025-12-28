import { createOpenRouterClient } from '@/lib/openrouter/client';
import { prisma } from '@/lib/prisma';
import type { ChatMessage } from '@/lib/openrouter/types';
import type { Prisma } from '@prisma/client';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { NewChapterAnalysis } from './chapter-summary';

const CONTEXT_LIMIT = 100000; // 假设使用100K模型
const SAFE_LIMIT = CONTEXT_LIMIT * 0.8; // 保留20%给输出
const RECENT_CHAPTERS_COUNT = 10; // 最近章节数量

/**
 * 加载全局摘要prompt
 */
async function loadGlobalSummaryPrompt(): Promise<string> {
  const promptPath = join(process.cwd(), 'lib/summary/global_summary_prompt.md');
  return await readFile(promptPath, 'utf-8');
}

/**
 * 从章节摘要中提取并构建增强的输入文本
 */
function buildEnhancedChapterInput(
  chapterSummaries: Array<{ content: string; metadata: Prisma.JsonValue | null }>,
  startIndex: number = 1
): string {
  return chapterSummaries.map((s, i) => {
    const chapterNum = startIndex + i;
    let text = `=== 第${chapterNum}章摘要 ===\n${s.content}\n`;

    // 尝试提取 rawAnalysis 数据
    if (s.metadata) {
      const metadata = s.metadata as { rawAnalysis?: NewChapterAnalysis };
      const raw = metadata.rawAnalysis;

      if (raw) {
        text += `\n【详细分析】\n`;
        text += `- 核心事件: ${raw.core_events.map(e => e.event).join('、')}\n`;
        text += `- 人物: ${raw.characters.map(c => c.name).join('、')}\n`;
        if (raw.sex_scenes.length > 0) {
          text += `- 性爱场景: ${raw.sex_scenes.map(s => s.type).join('、')}\n`;
        }
        text += `- 文本强度: ${raw.text_features.intensity}\n`;
      }
    }

    return text;
  }).join('\n\n');
}

export interface GlobalSummary {
  corePlot: string;
  characters: Record<string, {
    role: string;
    personality: string; // 新增：性格特征
    relationships: string[];
    arc: string;
  }>;
  worldBuilding: {
    setting: string;
    rules: string[];
    locations: string[];
    consistencyNotes?: string; // 新增：一致性备注
  };
  recentChapters: Array<{
    chapterIndex: number;
    title: string | null;
    summary: string;
    keyEvents?: string[]; // 新增：关键事件
    significance?: string; // 新增：章节重要性
  }>;
  keyThemes: string[];

  // 新增字段：人物关系网络
  characterRelationships?: Record<string, {
    type: string;
    development: string;
    keyEvents: string[];
    emotionalDepth: '浅层' | '中度' | '深厚' | '复杂';
  }>;

  // 新增字段：主题发展
  themeDevelopment?: Record<string, {
    introductionChapter: string;
    evolution: string;
  }>;

  // 新增字段：性爱内容分析
  sexualContentAnalysis?: {
    overallProgression: string;
    sceneTypes: string[];
    intensityTrajectory: string;
    emotionalIntegration: string;
    narrativeFunction: string[];
  };

  // 新增字段：叙事模式
  narrativePatterns?: {
    pacing: string;
    structure: string;
    recurringMotifs: string[];
    chapterTransitionPattern: string;
  };

  // 新增字段：文本风格演变
  textStyleEvolution?: {
    overallStyle: string;
    stability: string;
    intensityRange: string;
    notableChanges: string[];
  };

  // 新增字段：一致性问题
  consistencyIssues?: string[];

  // 新增字段：创作建议
  writingSuggestions?: string[];
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
  chapterSummaries: Array<{ content: string; metadata: Prisma.JsonValue | null; targetId: string | null }>,
  metadata: { characters: Prisma.JsonValue; worldRules: Prisma.JsonValue } | null,
  recentChapters: Array<{ chapterIndex: number; title: string | null; summary: string }>,
  apiKey: string,
  model: string
): Promise<GlobalSummary> {
  const client = createOpenRouterClient(apiKey);

  // 加载新的prompt
  const systemPrompt = await loadGlobalSummaryPrompt();

  // 构建增强的输入文本（包含 rawAnalysis 数据）
  const allSummariesText = buildEnhancedChapterInput(chapterSummaries);

  const recentSummariesText = recentChapters
    .map(ch => `第${ch.chapterIndex}章 ${ch.title || ''}：${ch.summary}`)
    .join('\n\n');

  const prompt = `请根据以下所有章节摘要的详细分析，生成小说的全局摘要。

【所有章节详细分析】
${allSummariesText}

【最近章节摘要】
${recentSummariesText}

${metadata ? `【已有元数据】\n${JSON.stringify(metadata, null, 2)}` : ''}

请按照要求的JSON格式返回全局摘要，重点分析：
1. 核心剧情主线的起承转合和发展轨迹
2. 主要人物的性格特征、关系演变和发展弧线
3. 世界观设定的建立和演变
4. 性爱场景的类型分布和强度发展
5. 叙事模式、文本风格的演变
6. 主题的发展轨迹
7. 潜在的一致性问题

请返回有效的JSON格式，不要包含其他文字说明。`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  let response;
  let debugFilepath: string | undefined;
  const promptDebugUrl = process.env.PROMPT_DEBUG_URL;

  try {
    // 调试：保存发送给 LLM API 的全部内容到临时文件
    if (promptDebugUrl && promptDebugUrl != "") {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `global-summary-direct-${timestamp}.json`;
        debugFilepath = join(promptDebugUrl, filename);
        const debugData = {
          timestamp: new Date().toISOString(),
          model,
          temperature: 0.3,
          max_tokens: 4000,
          messages,
          chapterSummariesCount: chapterSummaries.length,
          method: 'direct',
        };
        await writeFile(debugFilepath, JSON.stringify(debugData, null, 2), 'utf-8');
        console.log(`[调试] 全局摘要生成请求已保存到: ${debugFilepath}`);
      } catch (debugError) {
        console.warn('[调试] 保存调试文件失败:', debugError);
      }
    }

    response = await client.chatCompletion({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '{}';

    // 调试：将 LLM 回复内容追加到调试文件
    if (promptDebugUrl && promptDebugUrl != "" && debugFilepath) {
      try {
        const existingData = JSON.parse(await readFile(debugFilepath, 'utf-8'));
        const updatedDebugData = {
          ...existingData,
          response: {
            timestamp: new Date().toISOString(),
            content,
            fullResponse: response,
            parsed: undefined, // 将在解析后更新
          },
        };
        await writeFile(debugFilepath, JSON.stringify(updatedDebugData, null, 2), 'utf-8');
        console.log(`[调试] 全局摘要生成回复已追加到: ${debugFilepath}`);
      } catch (debugError) {
        console.warn('[调试] 追加回复内容到调试文件失败:', debugError);
      }
    }

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

    // 调试：更新解析后的结果到调试文件
    if (promptDebugUrl && promptDebugUrl != "" && debugFilepath) {
      try {
        const existingData = JSON.parse(await readFile(debugFilepath, 'utf-8'));
        const updatedDebugData = {
          ...existingData,
          response: {
            ...existingData.response,
            parsed,
          },
        };
        await writeFile(debugFilepath, JSON.stringify(updatedDebugData, null, 2), 'utf-8');
        console.log(`[调试] 全局摘要解析结果已更新到: ${debugFilepath}`);
      } catch (debugError) {
        console.warn('[调试] 更新解析结果到调试文件失败:', debugError);
      }
    }

    // 确保 characters 包含 personality 字段（向后兼容）
    const normalizedChars: Record<string, { role: string; personality: string; relationships: string[]; arc: string }> = {};
    if (parsed.characters) {
      Object.entries(parsed.characters).forEach(([name, char]: [string, unknown]) => {
        const charData = char as Record<string, unknown>;
        normalizedChars[name] = {
          role: (charData.role as string) || '',
          personality: (charData.personality as string) || '未明确描述',
          relationships: (charData.relationships as string[]) || [],
          arc: (charData.arc as string) || ''
        };
      });
    }

    return {
      corePlot: parsed.corePlot || '',
      characters: normalizedChars,
      worldBuilding: parsed.worldBuilding || { setting: '', rules: [], locations: [] },
      recentChapters,
      keyThemes: parsed.keyThemes || [],
      characterRelationships: parsed.characterRelationships,
      themeDevelopment: parsed.themeDevelopment,
      sexualContentAnalysis: parsed.sexualContentAnalysis,
      narrativePatterns: parsed.narrativePatterns,
      textStyleEvolution: parsed.textStyleEvolution,
      consistencyIssues: parsed.consistencyIssues,
      writingSuggestions: parsed.writingSuggestions,
    };
  } catch (error) {
    console.error('全局摘要生成错误:', error);
    // 返回基础结构
    const metadataChars = metadata?.characters as Record<string, { role: string; relationships: string[]; arc: string; personality?: string }> | undefined;
    const metadataWorldRules = metadata?.worldRules as { setting: string; rules: string[]; locations: string[] } | undefined;

    // 确保 characters 包含 personality 字段
    const normalizedChars: Record<string, { role: string; personality: string; relationships: string[]; arc: string }> = {};
    if (metadataChars) {
      Object.entries(metadataChars).forEach(([name, char]) => {
        normalizedChars[name] = {
          role: char.role,
          personality: char.personality || '未知',
          relationships: char.relationships,
          arc: char.arc
        };
      });
    }

    return {
      corePlot: '',
      characters: normalizedChars,
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
  chapterSummaries: Array<{ content: string; metadata: Prisma.JsonValue | null; targetId: string | null }>,
  metadata: { characters: Prisma.JsonValue; worldRules: Prisma.JsonValue } | null,
  recentChapters: Array<{ chapterIndex: number; title: string | null; summary: string }>,
  apiKey: string,
  model: string
): Promise<GlobalSummary> {
  const client = createOpenRouterClient(apiKey);

  // 加载新的prompt
  const systemPrompt = await loadGlobalSummaryPrompt();

  // 构建关键章节摘要文本（最近章节 + 所有核心章节摘要，包含 rawAnalysis）
  const keySummaries: string[] = [];

  // 1. 添加最近章节摘要（不带 rawAnalysis，因为recentChapters数据结构不同）
  recentChapters.forEach(ch => {
    if (ch.summary) {
      keySummaries.push(`第${ch.chapterIndex}章 ${ch.title || ''}：${ch.summary}`);
    }
  });

  // 2. 添加所有核心章节摘要（带 rawAnalysis）
  const enhancedSummaries = buildEnhancedChapterInput(chapterSummaries);
  keySummaries.push(enhancedSummaries);

  const keySummariesText = keySummaries.join('\n\n');

  const prompt = `请根据以下关键章节的详细分析，生成小说的全局摘要。

【关键章节详细分析】
${keySummariesText}

${metadata ? `【已有元数据】\n${JSON.stringify(metadata, null, 2)}` : ''}

请按照要求的JSON格式返回全局摘要，重点分析：
1. 核心剧情主线的起承转合和发展轨迹
2. 主要人物的性格特征、关系演变和发展弧线
3. 世界观设定的建立和演变
4. 性爱场景的类型分布和强度发展
5. 叙事模式、文本风格的演变
6. 主题的发展轨迹
7. 潜在的一致性问题

请返回有效的JSON格式，不要包含其他文字说明。`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  let response;
  let debugFilepath: string | undefined;
  const promptDebugUrl = process.env.PROMPT_DEBUG_URL;

  try {
    // 调试：保存发送给 LLM API 的全部内容到临时文件
    if (promptDebugUrl && promptDebugUrl != "") {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `global-summary-keychapters-${timestamp}.json`;
        debugFilepath = join(promptDebugUrl, filename);
        const debugData = {
          timestamp: new Date().toISOString(),
          model,
          temperature: 0.3,
          max_tokens: 4000,
          messages,
          chapterSummariesCount: chapterSummaries.length,
          recentChaptersCount: recentChapters.length,
          method: 'keychapters',
        };
        await writeFile(debugFilepath, JSON.stringify(debugData, null, 2), 'utf-8');
        console.log(`[调试] 全局摘要生成请求已保存到: ${debugFilepath}`);
      } catch (debugError) {
        console.warn('[调试] 保存调试文件失败:', debugError);
      }
    }

    response = await client.chatCompletion({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '{}';

    // 调试：将 LLM 回复内容追加到调试文件
    if (promptDebugUrl && promptDebugUrl != "" && debugFilepath) {
      try {
        const existingData = JSON.parse(await readFile(debugFilepath, 'utf-8'));
        const updatedDebugData = {
          ...existingData,
          response: {
            timestamp: new Date().toISOString(),
            content,
            fullResponse: response,
            parsed: undefined, // 将在解析后更新
          },
        };
        await writeFile(debugFilepath, JSON.stringify(updatedDebugData, null, 2), 'utf-8');
        console.log(`[调试] 全局摘要生成回复已追加到: ${debugFilepath}`);
      } catch (debugError) {
        console.warn('[调试] 追加回复内容到调试文件失败:', debugError);
      }
    }

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

    // 调试：更新解析后的结果到调试文件
    if (promptDebugUrl && promptDebugUrl != "" && debugFilepath) {
      try {
        const existingData = JSON.parse(await readFile(debugFilepath, 'utf-8'));
        const updatedDebugData = {
          ...existingData,
          response: {
            ...existingData.response,
            parsed,
          },
        };
        await writeFile(debugFilepath, JSON.stringify(updatedDebugData, null, 2), 'utf-8');
        console.log(`[调试] 全局摘要解析结果已更新到: ${debugFilepath}`);
      } catch (debugError) {
        console.warn('[调试] 更新解析结果到调试文件失败:', debugError);
      }
    }

    // 确保 characters 包含 personality 字段（向后兼容）
    const normalizedChars: Record<string, { role: string; personality: string; relationships: string[]; arc: string }> = {};
    if (parsed.characters) {
      Object.entries(parsed.characters).forEach(([name, char]: [string, unknown]) => {
        const charData = char as Record<string, unknown>;
        normalizedChars[name] = {
          role: (charData.role as string) || '',
          personality: (charData.personality as string) || '未明确描述',
          relationships: (charData.relationships as string[]) || [],
          arc: (charData.arc as string) || ''
        };
      });
    }

    return {
      corePlot: parsed.corePlot || '',
      characters: normalizedChars,
      worldBuilding: parsed.worldBuilding || { setting: '', rules: [], locations: [] },
      recentChapters,
      keyThemes: parsed.keyThemes || [],
      characterRelationships: parsed.characterRelationships,
      themeDevelopment: parsed.themeDevelopment,
      sexualContentAnalysis: parsed.sexualContentAnalysis,
      narrativePatterns: parsed.narrativePatterns,
      textStyleEvolution: parsed.textStyleEvolution,
      consistencyIssues: parsed.consistencyIssues,
      writingSuggestions: parsed.writingSuggestions,
    };
  } catch (error) {
    console.error('全局摘要生成错误:', error);
    // 返回基础结构
    const metadataChars = metadata?.characters as Record<string, { role: string; relationships: string[]; arc: string; personality?: string }> | undefined;
    const metadataWorldRules = metadata?.worldRules as { setting: string; rules: string[]; locations: string[] } | undefined;

    // 确保 characters 包含 personality 字段
    const normalizedChars: Record<string, { role: string; personality: string; relationships: string[]; arc: string }> = {};
    if (metadataChars) {
      Object.entries(metadataChars).forEach(([name, char]) => {
        normalizedChars[name] = {
          role: char.role,
          personality: char.personality || '未知',
          relationships: char.relationships,
          arc: char.arc
        };
      });
    }

    return {
      corePlot: '',
      characters: normalizedChars,
      worldBuilding: metadataWorldRules || { setting: '', rules: [], locations: [] },
      recentChapters,
      keyThemes: [],
    };
  }
}

