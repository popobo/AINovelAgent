/**
 * 新格式的章节分析
 */
export interface NewChapterAnalysis {
  core_events: Array<{ event: string; details: string }>;
  characters: Array<{ name: string; personality: string; description: string }>;
  sex_scenes: Array<{ type: string; details: string }>;
  text_features: { style: string; intensity: string };
  summary: string;
}

/**
 * 兼容旧格式的章节摘要
 */
export interface ChapterSummary {
  coreEvents: string[];
  characterActivities: string;
  keyInformation: string;
  emotionalClues: string;
  fullSummary: string;
  rawAnalysis?: NewChapterAnalysis;
}

/**
 * 章节摘要响应解析器
 */
export class ChapterSummaryParser {
  /**
   * 从LLM响应中解析章节摘要
   */
  static parseResponse(content: string): ChapterSummary {
    // 提取JSON字符串
    const jsonStr = this.extractJSON(content);

    // 解析JSON
    const parsed = JSON.parse(jsonStr) as NewChapterAnalysis;

    // 转换为标准格式
    return this.convertToStandardFormat(parsed);
  }

  /**
   * 从文本中提取JSON
   * 处理markdown代码块和额外的文本
   */
  static extractJSON(content: string): string {
    let jsonStr = content.trim();

    // 移除markdown代码块标记
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // 尝试找到JSON对象（可能前后有额外文本）
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    return jsonStr;
  }

  /**
   * 将新格式转换为兼容的旧格式
   */
  static convertToStandardFormat(data: NewChapterAnalysis): ChapterSummary {
    return {
      coreEvents: data.core_events.map(e => `${e.event}: ${e.details}`),
      characterActivities: data.characters
        .map(c => `${c.name}: ${c.personality} - ${c.description}`)
        .join('\n'),
      keyInformation: data.text_features.style,
      emotionalClues: data.text_features.intensity,
      fullSummary: data.summary,
      rawAnalysis: data,
    };
  }

  /**
   * 验证新格式数据
   */
  static validateNewFormat(data: unknown): data is NewChapterAnalysis {
    return (
      typeof data === 'object' &&
      data !== null &&
      Array.isArray((data as NewChapterAnalysis).core_events) &&
      Array.isArray((data as NewChapterAnalysis).characters) &&
      Array.isArray((data as NewChapterAnalysis).sex_scenes) &&
      typeof (data as NewChapterAnalysis).text_features === 'object' &&
      typeof (data as NewChapterAnalysis).summary === 'string'
    );
  }
}
