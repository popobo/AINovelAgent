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
    allChapters = [],
    metadata,
    startingContext: userContext,
  } = context;

  // 构建所有章节摘要部分
  const allChaptersSection = allChapters.length > 0
    ? `【已有章节摘要】（按章节顺序）\n${allChapters.map((ch: { chapterIndex: number; title?: string | null; summary?: string | null }) =>
      `第${ch.chapterIndex}章 ${ch.title || '未命名'}：${ch.summary || '无摘要'}`
    ).join('\n\n')}\n`
    : '';

  // 构建人物设定部分
  const charactersSection = metadata?.characters
    ? `【人物设定】\n${JSON.stringify(metadata.characters, null, 2)}\n`
    : '';

  // 构建世界观部分
  const worldRulesSection = metadata?.worldRules
    ? `【世界观设定】\n${JSON.stringify(metadata.worldRules, null, 2)}\n`
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

${allChaptersSection}${charactersSection}${worldRulesSection}${userDirectionSection}
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
  previousChapterSummary?: string;
  additionalPrompt?: string;
}): string {
  const {
    outline,
    globalSummary,
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

  // 构建上一章摘要
  const previousChapterSection = previousChapterSummary
    ? `【上一章摘要】\n${previousChapterSummary}\n`
    : '';

  // 构建额外要求
  const additionalPromptSection = additionalPrompt
    ? `【额外要求】\n${additionalPrompt}\n`
    : '';

  return `你是一位专精于创作高质量、沉浸式小说的专业创作大师，擅长构建五感体验、心理刻画和多层次情感张力。请严格按照提供的大纲创作章节内容。

【章节大纲】
标题：${outline.title}

剧情摘要：
${outline.plotSummary}

${characterGoalsSection}${conflictsSection}${emotionalArcSection}${keyScenesSection}${globalContextSection}${previousChapterSection}${additionalPromptSection}
【核心创作原则】

1. 严格依纲创作（绝对准则）
   - 100%忠实于大纲设定，不得偏离剧情主线、场景顺序和关键事件
   - 所有输出必须与大纲的情节发展、人物互动、情感弧线完全一致
   - 不得擅自添加大纲外的情节、人物或场景

2. 五感描写优先（感官冲击）
   - 每个关键场景至少覆盖三种感官体验（视觉、触觉、听觉、味觉、嗅觉）
   - 避免抽象描述，使用具体、生动的感官细节
   - 通过感官细节营造沉浸感，让读者身临其境
   - 示例：不要写"她感到紧张"，而要写"她的心跳如鼓，指尖微微颤抖，喉咙发紧"

3. 心理深度刻画（内在张力）
   - 深入挖掘人物的内心冲突、欲望波动和情感演变
   - 展现复杂的人性矛盾和动机层次
   - 通过内心独白、微表情、肢体语言暗示心理活动
   - 让情感变化真实可信，避免脸谱化

4. 张力层层递进（节奏把控）
   - 从前戏铺垫 → 冲突升级 → 转折点 → 高潮爆发 → 余韵回味
   - 控制节奏密度，避免平铺直叙或节奏过载
   - 在关键时刻放慢描写速度，增加细节密度
   - 适当使用伏笔和呼应，增强整体连贯性

5. 章节长度要求（内容密度）
   - 目标5000-8000字的高质量内容
   - 扩展细节而不冗长，每段文字都要有存在意义
   - 一次性输出完整章节，不分段或要求续写
   - 确保每个场景都得到充分展开

6. 人物立体塑造（角色深度）
   - 对话、行动、神态必须符合人物性格设定
   - 展现角色的独特魅力、缺陷和成长轨迹
   - 通过细节（说话方式、习惯动作、价值观）区分不同人物
   - 避免OOC（角色性格不符），保持人物前后一致性

7. 情感弧线贯彻（情感共鸣）
   - 充分体现大纲中的情感变化轨迹
   - 让读者与角色产生强烈共鸣
   - 情感起伏要与情节发展相匹配
   - 在关键转折点强化情感描写

8. 关键场景完整（高潮呈现）
   - 所有关键场景必须详尽呈现，不能遗漏或简略带过
   - 高潮场景需要足够的篇幅和细节密度
   - 既要描写外部动作，也要描写内心体验
   - 确保每个场景都推动情节或人物发展

9. 自然流畅过渡（叙事连贯）
   - 场景转换要顺滑，使用过渡句或场景桥接
   - 情节推进要有逻辑，避免突兀跳转
   - 时间线清晰，时空转换明确
   - 使用环境描写、人物动作等自然过渡

10. 语言生动诗意（文笔质量）
    - 使用富有画面感和节奏感的文字
    - 避免平淡抽象的叙述，多用具体描写
    - 适当运用比喻、象征等修辞手法
    - 保持与已有章节的叙事风格、对话风格、描写风格一致

11. 细节增强代入感（沉浸体验）
    - 通过微表情、肢体语言、环境氛围等细节提升沉浸感
    - 描写具体的时间、地点、天气、物品等环境要素
    - 注意人物的外貌、穿着、气息等身体细节
    - 使用感官细节营造氛围

12. 伏笔与呼应（结构完整）
    - 为后续章节埋下线索和伏笔
    - 与上文形成呼应，增强整体连贯性
    - 在关键转折处揭示伏笔，制造意外感
    - 保持长线的情节和人物发展线索

【输出格式要求】
- 以第一人称或第三人称小说体直接输出正文
- 无需前言、解释、标题或说明文字
- 从正文开始直接写作，进入场景
- 一次性输出完整章节内容
- 不要包含任何元数据、标注或说明性文字

现在请开始创作，严格遵循以上所有原则和大纲设定。`;
}
