/**
 * AI 提示词模板
 */

export const PROMPTS = {
  // 小说续写系统提示词
  NOVEL_CONTINUE_SYSTEM: `你是一位资深的小说作家，擅长续写各种类型的小说。你需要：

1. 严格保持原作的写作风格、叙事视角和语言特点
2. 确保情节的连贯性，与前文自然衔接
3. 人物性格和对话风格要与前文一致
4. 保持世界观设定的一致性
5. 适当推进情节发展，不要过于冗长或跳跃

请根据提供的上下文信息续写小说内容。`,

  // 章节摘要生成
  CHAPTER_SUMMARY: `请为以下小说章节生成一个简洁但信息丰富的摘要。摘要应包含：
1. 主要情节发展
2. 出场的重要人物
3. 重要的对话或决定
4. 情感基调变化

摘要长度控制在200-300字。`,

  // 全书摘要生成
  NOVEL_SUMMARY: `请根据提供的章节摘要，生成整本小说的总体摘要。摘要应包含：
1. 故事主线和核心冲突
2. 主要人物及其关系
3. 重要的转折点
4. 当前故事进展到的阶段

摘要长度控制在500-800字。`,

  // 人物分析
  CHARACTER_ANALYSIS: `请从以下小说内容中提取人物信息。对于每个主要人物，请提供：
1. 姓名
2. 外貌描写（如有）
3. 性格特点
4. 与其他人物的关系
5. 在故事中的角色/定位

以JSON格式返回，格式如下：
[
  {
    "name": "人物名",
    "appearance": "外貌描写",
    "personality": "性格特点",
    "relationships": ["与XX是XX关系"],
    "role": "角色定位"
  }
]`,

  // 写作风格分析
  STYLE_ANALYSIS: `请分析以下小说内容的写作风格，包括：
1. 叙事视角（第一人称/第三人称等）
2. 语言风格（文雅/白话/幽默等）
3. 描写特点（注重心理/注重环境/注重动作等）
4. 对话风格
5. 常用修辞手法
6. 句式特点

请总结成一段200字左右的写作风格指南，供续写时参考。`,

  // 同人小说创作系统提示词
  FANFIC_SYSTEM: `你是一位擅长创作同人小说的作家。你需要：

1. 严格遵循原作的世界观设定
2. 保持角色的性格特点和说话方式与原作一致
3. 可以创作原作中没有的剧情，但要符合逻辑
4. 注意角色之间的关系互动
5. 适当加入原作中的经典元素或彩蛋

请根据提供的原作设定和用户要求创作同人小说。`,

  // 续写提示词模板
  CONTINUE_PROMPT: `## 小说信息
{novelInfo}

## 世界观设定
{worldSettings}

## 人物信息
{characters}

## 最近章节摘要
{recentSummaries}

## 相关情节段落
{relevantParagraphs}

## 最近原文内容
{recentContent}

---

请根据以上信息，自然地续写下去。续写内容约{wordCount}字。`,

  // 同人创作提示词模板
  FANFIC_PROMPT: `## 原作信息
作品名称：{sourceName}
作品类型：{sourceType}

## 世界观设定
{worldSetting}

## 角色设定
{characters}

## 用户要求
{userRequest}

---

请根据以上信息创作同人小说内容。`,
};

/**
 * 替换模板中的占位符
 */
export function fillPromptTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value || "无");
  }
  return result;
}

