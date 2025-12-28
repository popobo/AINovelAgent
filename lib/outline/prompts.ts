/**
 * 大纲生成提示词模板
 */

import type { OutlineContext } from './types';

/**
 * 生成批量大纲的提示词
 */
export function getOutlineGenerationPrompt(
  chapterCount: number,
  startingChapterIndex: number,
  context: OutlineContext
): string {
  const {
    globalSummary,
    metadata,
    recentChapters = [],
    startingContext: userContext,
  } = context;

  // 构建全局摘要部分
  const globalSummarySection = globalSummary
    ? `【全局摘要】\n${globalSummary}\n`
    : '';

  // 构建人物设定部分
  const charactersSection = metadata?.characters
    ? `【人物设定】\n${JSON.stringify(metadata.characters, null, 2)}\n`
    : '';

  // 构建世界观部分
  const worldRulesSection = metadata?.worldRules
    ? `【世界观设定】\n${JSON.stringify(metadata.worldRules, null, 2)}\n`
    : '';

  // 构建最近章节摘要
  const recentChaptersSection = recentChapters.length > 0
    ? `【最近章节摘要】\n${recentChapters.map((ch) =>
      `第${ch.chapterIndex}章 ${ch.title || '未命名'}：${ch.summary || '无摘要'}`
    ).join('\n\n')}\n`
    : '';

  // 构建用户提供的创作方向
  const userDirectionSection = userContext?.overallDirection || userContext?.specificRequirements
    ? `【创作方向】\n${
      userContext.overallDirection ? `整体方向：${userContext.overallDirection}\n` : ''
    }${
      userContext.specificRequirements && userContext.specificRequirements.length > 0
        ? `特殊要求：${userContext.specificRequirements.join('、')}\n`
        : ''
    }`
    : '';

  return `你是一位专业的小说大纲设计师。请为小说的未来${chapterCount}个章节生成详细大纲。

${globalSummarySection}${charactersSection}${worldRulesSection}${recentChaptersSection}${userDirectionSection}
请为第${startingChapterIndex}章到第${startingChapterIndex + chapterCount - 1}章生成详细大纲。

【大纲要求】
每章大纲必须包含以下字段：
1. title: 章节标题（简洁有力，符合小说风格）
2. plotSummary: 详细剧情摘要（500-800字），包括：
   - 章节起因（触发事件）
   - 情节发展（冲突升级）
   - 转折点（意外变化）
   - 高潮（关键对决或揭示）
   - 结局（为下一章铺垫）
3. characterGoals: 人物目标列表，格式：[{character: "人物名", goal: "目标描述"}]
   - 每章至少包含2-3个主要人物的目标
   - 目标要具体、可衡量
4. conflicts: 冲突设定
   - internal: 内部冲突列表（人物内心矛盾）
   - external: 外部冲突列表（人物间或环境冲突）
   - 每类至少1-2个冲突
5. emotionalArc: 情感弧线描述（100-200字）
   - 描述主要人物的情感变化轨迹
   - 情感起伏要与情节发展相匹配
6. keyScenes: 关键场景列表，格式：[{description: "场景描述", position: "开头/中间/结尾"}]
   - 每章至少3个关键场景
   - 场景要具体、有画面感
   - 标明场景在章节中的位置

【质量标准】
1. 剧情连贯性：前后章节自然衔接，避免逻辑断层
2. 设定一致性：严格符合已有的人物设定和世界观
3. 节奏把控：合理安排剧情密度，避免平淡或过载
4. 推进作用：每章都必须推动整体剧情发展
5. 情感深度：人物动机合理，情感变化真实可信
6. 创新性：避免套路化，提供新颖的情节发展

【返回格式】
请严格按照以下JSON格式返回，不要包含任何其他文字说明：
{
  "outlines": [
    {
      "title": "章节标题",
      "plotSummary": "详细剧情摘要...",
      "characterGoals": [
        {"character": "主角A", "goal": "目标描述"}
      ],
      "conflicts": {
        "internal": ["内心冲突1", "内心冲突2"],
        "external": ["外部冲突1", "外部冲突2"]
      },
      "emotionalArc": "情感弧线描述",
      "keyScenes": [
        {"description": "关键场景描述", "position": "开头"},
        {"description": "关键场景描述", "position": "中间"},
        {"description": "关键场景描述", "position": "结尾"}
      ]
    }
  ],
  "summary": {
    "overallArc": "整体剧情发展概述（200-300字）",
    "mainThemes": ["主题1", "主题2", "主题3"]
  }
}

请生成符合要求的大纲JSON：`;
}

/**
 * 生成从大纲创建章节内容的提示词
 */
export function getChapterFromOutlinePrompt(context: {
  outline: {
    title: string;
    plotSummary: string;
    characterGoals?: Array<{ character: string; goal: string }>;
    conflicts?: {
      internal?: string[];
      external?: string[];
    };
    emotionalArc?: string;
    keyScenes?: Array<{ description: string; position: string }>;
  };
  globalSummary?: string;
  metadata?: {
    characters?: Record<string, Record<string, unknown>>;
    worldRules?: Record<string, unknown>;
  };
  previousChapterSummary?: string;
  additionalPrompt?: string;
}): string {
  const {
    outline,
    globalSummary,
    metadata,
    previousChapterSummary,
    additionalPrompt,
  } = context;

  // 构建人物目标部分
  const characterGoalsSection = outline.characterGoals && outline.characterGoals.length > 0
    ? `【人物目标】\n${outline.characterGoals
      .map((g) => `${g.character}：${g.goal}`)
      .join('\n')}\n`
    : '';

  // 构建冲突部分
  const conflictsSection = outline.conflicts
    ? `【冲突设定】\n${
      outline.conflicts.internal && outline.conflicts.internal.length > 0
        ? `内部冲突：\n${outline.conflicts.internal.map((c) => `• ${c}`).join('\n')}\n`
        : ''
    }${
      outline.conflicts.external && outline.conflicts.external.length > 0
        ? `外部冲突：\n${outline.conflicts.external.map((c) => `• ${c}`).join('\n')}\n`
        : ''
    }`
    : '';

  // 构建情感弧线部分
  const emotionalArcSection = outline.emotionalArc
    ? `【情感弧线】\n${outline.emotionalArc}\n`
    : '';

  // 构建关键场景部分
  const keyScenesSection = outline.keyScenes && outline.keyScenes.length > 0
    ? `【关键场景】\n${outline.keyScenes
      .map((s) => `[${s.position}] ${s.description}`)
      .join('\n')}\n`
    : '';

  // 构建全局上下文
  const globalContextSection = globalSummary
    ? `【全局摘要】\n${globalSummary}\n`
    : '';

  // 构建人物设定
  const charactersSection = metadata?.characters
    ? `【人物设定】\n${JSON.stringify(metadata.characters, null, 2)}\n`
    : '';

  // 构建上一章摘要
  const previousChapterSection = previousChapterSummary
    ? `【上一章摘要】\n${previousChapterSummary}\n`
    : '';

  // 构建额外要求
  const additionalPromptSection = additionalPrompt
    ? `【额外要求】\n${additionalPrompt}\n`
    : '';

  return `你是一位专业的小说创作助手。请严格按照提供的大纲创作章节内容。

【章节大纲】
标题：${outline.title}

剧情摘要：
${outline.plotSummary}

${characterGoalsSection}${conflictsSection}${emotionalArcSection}${keyScenesSection}${globalContextSection}${charactersSection}${previousChapterSection}${additionalPromptSection}
【创作要求】
1. 严格按照大纲进行创作，不得偏离大纲设定的剧情和场景
2. 章节长度建议在2000-4000字
3. 保持与已有章节的风格一致（叙事风格、对话风格、描写风格）
4. 人物对话和行动要严格符合其性格设定
5. 情感描写要充分体现大纲中的情感弧线
6. 所有关键场景都必须完整呈现，不能遗漏
7. 场景转换要自然流畅，避免突兀
8. 注意细节描写，增强画面感和代入感
9. 适当运用伏笔，为后续章节埋下线索
10. 语言要生动形象，避免平淡叙述

【输出格式】
请直接输出章节的完整内容，不要包含任何标题、标记或说明文字。从正文开始直接写作。`;
}
