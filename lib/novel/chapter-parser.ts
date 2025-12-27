import { createOpenRouterClient } from '@/lib/openrouter/client';
import type { ChatMessage } from '@/lib/openrouter/types';

export interface ChapterInfo {
  index: number;
  title: string;
  content: string;
  startPos: number;
  endPos: number;
}

/**
 * 使用LLM识别章节标题的正则表达式模式，然后用正则表达式切分章节
 */
export async function identifyChapters(
  text: string,
  apiKey: string,
  model: string = 'openai/gpt-4o-mini'
): Promise<ChapterInfo[]> {
  const client = createOpenRouterClient(apiKey);

  // 如果文本太长，先取前30000字符进行分析（用于识别章节模式）
  const sampleText = text.slice(0, 30000);

  const prompt = `请分析以下小说文本的章节标题格式，识别出章节标题的正则表达式模式。

要求：
1. 仔细查看文本中的章节标题格式（例如："第一章"、"第1章"、"Chapter 1"、"============================================================\\n第一章灰色斑斓\\n============================================================"等）
2. 返回一个可以匹配章节标题行的正则表达式模式（JavaScript格式）
3. 正则表达式应该能够准确匹配文本中所有章节标题行的开始位置
4. 如果章节标题前有分隔线（如多个等号），正则表达式也应该包含这些内容
5. 返回JSON格式：{"regex": "正则表达式字符串", "flags": "正则表达式标志（如'm'或'gm'）", "example": "一个匹配示例"}

示例文本：
${sampleText}

请返回JSON格式，只包含regex、flags和example字段：`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的小说文本分析助手，擅长识别章节标题的正则表达式模式。请只返回有效的JSON格式，不要包含其他文字说明。',
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
      temperature: 0.1, // 降低温度以提高正则表达式的准确性
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // 尝试提取JSON（可能被markdown代码块包裹）
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
    const regexPattern = parsed.regex || '';
    const flags = parsed.flags || 'gm';

    if (!regexPattern) {
      console.warn('未能识别出正则表达式模式，使用备用方案');
      return fallbackChapterIdentification(text);
    }

    // 使用识别出的正则表达式切分整个文本
    return splitChaptersByRegex(text, regexPattern, flags);
  } catch (error) {
    console.error('章节识别错误:', error);
    // 如果LLM识别失败，使用简单的规则识别
    return fallbackChapterIdentification(text);
  }
}

/**
 * 使用正则表达式切分章节
 * @param text 小说文本内容
 * @param regexPattern 正则表达式模式
 * @param flags 正则表达式标志，默认为 'gm'
 * @returns 章节信息数组
 * @throws 如果正则表达式无效，抛出错误
 */
export function splitChaptersByRegex(
  text: string,
  regexPattern: string,
  flags: string = 'gm'
): ChapterInfo[] {
  const chapters: ChapterInfo[] = [];
  
  // 验证正则表达式是否有效
  try {
    new RegExp(regexPattern, flags);
  } catch (error) {
    throw new Error(`无效的正则表达式: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  try {
    const regex = new RegExp(regexPattern, flags);
    
    // 找到所有匹配的章节标题
    // 注意：使用 matchAll 或先收集所有匹配，避免 lastIndex 问题
    const allMatches = Array.from(text.matchAll(regex));
    const matches: Array<{ index: number; title: string; pos: number }> = [];

    for (const match of allMatches) {
      // 提取章节标题（去掉前后分隔线等）
      let title = match[0].trim();
      
      // 如果标题包含换行符，尝试提取中间的章节标题行
      if (title.includes('\n')) {
        const lines = title.split('\n').map(l => l.trim()).filter(l => l);
        // 通常章节标题在中间或最后一行
        for (const line of lines) {
          // 匹配常见的章节标题格式
          if (/第[一二三四五六七八九十百千万\d]+章/.test(line) || 
              /Chapter\s+\d+/i.test(line) ||
              /^第\d+章/.test(line)) {
            title = line;
            break;
          }
        }
      }

      matches.push({
        index: matches.length + 1,
        title: title,
        pos: match.index || 0,
      });
    }

    // 按位置排序
    matches.sort((a, b) => a.pos - b.pos);

    if (matches.length === 0) {
      // 如果没有找到章节，将整个文本作为一个章节
      chapters.push({
        index: 1,
        title: '第一章',
        content: text,
        startPos: 0,
        endPos: text.length,
      });
    } else {
      // 根据匹配的位置分割文本
      for (let i = 0; i < matches.length; i++) {
        const startPos = matches[i].pos;
        const endPos = i < matches.length - 1 ? matches[i + 1].pos : text.length;
        
        // 提取章节内容（去掉标题行）
        let content = text.slice(startPos, endPos).trim();
        
        // 如果内容以章节标题开头，尝试去掉标题行
        const titleLine = matches[i].title;
        if (content.startsWith(titleLine)) {
          content = content.slice(titleLine.length).trim();
        }
        // 去掉可能的分隔线
        content = content.replace(/^=+\s*$/gm, '').trim();
        
        chapters.push({
          index: matches[i].index,
          title: titleLine,
          content: content,
          startPos,
          endPos,
        });
      }
    }

    return chapters;
  } catch (error) {
    console.error('正则表达式切分章节错误:', error);
    // 如果正则表达式有问题，抛出错误而不是使用备用方案
    // 因为这是用户明确提供的正则表达式，应该让用户知道有问题
    throw new Error(`使用正则表达式切分章节时出错: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 备用方案：基于规则识别章节（当LLM识别失败时）
 */
function fallbackChapterIdentification(text: string): ChapterInfo[] {
  const chapters: ChapterInfo[] = [];
  
  // 常见的章节标题模式
  const patterns = [
    /^第[一二三四五六七八九十百千万\d]+章[^\n]*$/gm,
    /^Chapter\s+\d+[^\n]*$/gim,
    /^第\d+章[^\n]*$/gm,
    /^【第[一二三四五六七八九十百千万\d]+章】[^\n]*$/gm,
  ];

  const matches: Array<{ index: number; title: string; pos: number }> = [];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: matches.length + 1,
        title: match[0].trim(),
        pos: match.index,
      });
    }
    if (matches.length > 0) break; // 找到一种模式就停止
  }

  // 按位置排序
  matches.sort((a, b) => a.pos - b.pos);

  if (matches.length === 0) {
    // 如果没有找到章节，将整个文本作为一个章节
    chapters.push({
      index: 1,
      title: '第一章',
      content: text,
      startPos: 0,
      endPos: text.length,
    });
  } else {
    // 根据匹配的位置分割文本
    for (let i = 0; i < matches.length; i++) {
      const startPos = matches[i].pos;
      const endPos = i < matches.length - 1 ? matches[i + 1].pos : text.length;
      
      chapters.push({
        index: matches[i].index,
        title: matches[i].title,
        content: text.slice(startPos, endPos).trim(),
        startPos,
        endPos,
      });
    }
  }

  return chapters;
}

