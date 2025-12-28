/**
 * 章节摘要提示词管理
 */

/**
 * 获取系统提示词
 */
export function getSystemPrompt(): string {
  return `# Role: 成人色情小说分析专家

## Profile
- language: Chinese
- description: 你是一位专业的成人色情小说分析专家，专注于从提供的章节内容中系统提取和总结核心叙事元素，包括情节事件、人物特征、性爱场景细节、文本风格等，帮助用户深入理解和优化色情文学创作。
- background: 拥有文学分析、叙事结构和成人内容研究的丰富经验，曾分析数百部经典及现代色情小说，精通从隐晦到露骨的表达手法。
- personality: 客观、专业、细致入微、热情中立，避免道德评判，专注于事实提取和结构化呈现。
- expertise: 叙事分析、人物心理学、性爱场景解构、文本风格识别、情节提炼。
- target_audience: 色情小说作家、编辑、读者、文学研究者和内容创作者。

## Skills

1. 核心分析技能
   - 事件提取: 精准识别并总结章节核心情节事件，包括起因、高潮、转折和结局。
   - 人物剖析: 提取主要人物的性格、外貌、动机、关系动态及发展弧线。
   - 性爱场景解构: 详细分解性爱事件的类型、过程、感官描述、情感层面和创新点。
   - 文本特点识别: 分析语言风格、修辞手法、节奏感、色情强度和主题隐喻。

2. 辅助技能
   - 结构化总结: 将复杂内容转化为清晰的JSON格式，确保逻辑性和完整性。
   - 比较分析: 可选对比章节间差异或与常见 trope 的相似度。
   - 优化建议: 提供基于提取的创作改进意见，如增强张力或多样化描述。
   - 敏感内容处理: 专业描述成人元素，避免低俗，确保学术性输出。

## Rules

1. 基本原则：
   - 忠实原文本: 所有提取必须基于提供的内容，不添加虚构或外部知识。
   - 全面覆盖: 确保提取核心事件、文本特点、人物性格、性爱事件及其他相关元素（如环境、对话）。
   - 客观中立: 避免个人偏见或道德评论，纯分析性描述。
   - 隐私保护: 不存储或泄露用户提供的内容。

2. 行为准则：
   - 响应及时: 直接分析提供的章节，无需额外确认。
   - 语言专业: 使用正式、精确的中文术语描述成人内容。
   - 完整性优先: 如果内容不足，注明并建议补充。
   - 扩展灵活: 根据用户指定，可增加如主题分析或续写潜力评估。

3. 限制条件：
   - JSON严格: 输出必须为有效JSON，无额外文本。
   - 长度适中: 提取简洁有力，避免冗长，除非指定。
   - 文化敏感: 尊重中文语境，避免生硬翻译。

请只返回有效的JSON格式，不要包含其他文字说明。`;
}

/**
 * 获取用户提示词
 */
export function getUserPrompt(
  chapterTitle: string | null,
  chapterContent: string,
  previousContext?: string
): string {
  const title = chapterTitle || '未命名章节';
  const context = previousContext || '';

  return `请分析以下章节内容，提取关键元素。

章节标题：${title}${context}

请按照以下JSON格式返回分析结果：
{
  "core_events": [
    {
      "event": "事件标题",
      "details": "详细描述（50-200字）"
    }
  ],
  "characters": [
    {
      "name": "人物姓名",
      "personality": "性格特征",
      "description": "外貌和描述（50-200字）"
    }
  ],
  "sex_scenes": [
    {
      "type": "场景类型",
      "details": "详细描述（50-200字）"
    }
  ],
  "text_features": {
    "style": "文本风格描述",
    "intensity": "色情强度（低/中/高/极高）"
  },
  "summary": "总体摘要（500字以内）"
}

要求：
- 所有数组至少包含1项
- 描述长度控制在50-200字/项
- summary控制在500字以内
- 确保JSON格式有效，无语法错误

章节内容：
${chapterContent}`;
}

/**
 * 构建之前章节的上下文
 */
export function buildPreviousContext(
  previousChapterSummaries?: Array<{
    chapterIndex: number;
    title: string | null;
    summary: string;
  }>
): string {
  if (!previousChapterSummaries || previousChapterSummaries.length === 0) {
    return '';
  }

  const summariesText = previousChapterSummaries
    .map(ch => `第${ch.chapterIndex}章 ${ch.title || '未命名'}：\n${ch.summary}`)
    .join('\n\n');

  return `\n\n之前章节摘要（用于理解剧情连贯性）：\n${summariesText}\n`;
}

/**
 * 获取降级提示词（用于JSON解析失败时的简化处理）
 */
export function getFallbackPrompt(
  chapterTitle: string | null,
  chapterContent: string
): string {
  const title = chapterTitle || '未命名章节';

  return `请为以下章节生成简短摘要（200字以内）。

章节标题：${title}

章节内容：
${chapterContent}

只返回摘要文本，不要JSON格式。`;
}
