import { createOpenRouterClient } from '@/lib/openrouter/client';
import type { ChatMessage } from '@/lib/openrouter/types';
import { OpenRouterError } from '@/lib/openrouter/types';

export interface ChapterSummary {
  coreEvents: string[];
  characterActivities: string;
  keyInformation: string;
  emotionalClues: string;
  fullSummary: string; // 完整摘要文本
}

export interface PreviousChapterSummary {
  chapterIndex: number;
  title: string | null;
  summary: string;
}

/**
 * 为章节生成摘要
 */
export async function generateChapterSummary(
  chapterContent: string,
  chapterTitle: string | null,
  apiKey: string,
  model: string = 'openai/gpt-4o-mini',
  maxContextLength: number = 32000,
  previousChapterSummaries?: PreviousChapterSummary[]
): Promise<ChapterSummary> {
  const client = createOpenRouterClient(apiKey);

  // 如果章节内容超过上下文限制，需要分段处理
  if (chapterContent.length > maxContextLength * 3) {
    // 粗略估算：假设平均每个字符0.5个token，需要预留空间给提示词和响应
    return await generateChapterSummaryChunked(chapterContent, chapterTitle, apiKey, model, maxContextLength, previousChapterSummaries);
  }

  // 构建之前章节摘要的上下文
  let previousContext = '';
  if (previousChapterSummaries && previousChapterSummaries.length > 0) {
    const previousSummariesText = previousChapterSummaries
      .map(ch => `第${ch.chapterIndex}章 ${ch.title || '未命名'}：\n${ch.summary}`)
      .join('\n\n');
    previousContext = `\n\n之前章节摘要（用于理解剧情连贯性）：\n${previousSummariesText}\n`;
  }

  const prompt = `请为以下章节内容生成结构化摘要。

章节标题：${chapterTitle || '未命名章节'}${previousContext}

要求生成包含以下部分的结构化摘要：

1. **核心事件**：本章节发生的关键事件（3-5个要点，用数组格式）
2. **人物活动**：主要人物的出现和行为
3. **关键信息**：重要的设定、线索、伏笔
4. **情感线索**：重要的情感变化或关系发展

要求：
- 摘要控制在500字以内
- 保留具体的人物名称、地点、时间等关键实体
- 突出与后续剧情相关的线索
${previousChapterSummaries && previousChapterSummaries.length > 0 ? '- 请参考之前章节的剧情发展，确保摘要与前面的内容连贯一致\n' : ''}- 使用JSON格式返回，格式如下：
{
  "coreEvents": ["事件1", "事件2", ...],
  "characterActivities": "人物活动描述",
  "keyInformation": "关键信息描述",
  "emotionalClues": "情感线索描述",
  "fullSummary": "完整摘要文本（综合以上内容，500字以内）"
}

章节内容：
${chapterContent}`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的小说内容分析助手，擅长提取章节的核心信息和关键情节。请只返回有效的JSON格式，不要包含其他文字说明。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  let response;
  let responseContent: string | undefined;
  
  try {
    response = await client.chatCompletion({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    responseContent = content;
    
    // 提取JSON - 更健壮的提取逻辑
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

    const parsed = JSON.parse(jsonStr);
    
    // 验证返回的数据结构
    if (parsed.fullSummary && parsed.fullSummary.length > 0) {
      return {
        coreEvents: Array.isArray(parsed.coreEvents) ? parsed.coreEvents : [],
        characterActivities: parsed.characterActivities || '',
        keyInformation: parsed.keyInformation || '',
        emotionalClues: parsed.emotionalClues || '',
        fullSummary: parsed.fullSummary,
      };
    }
    
    // 如果没有fullSummary，尝试从其他字段组合
    const summaryParts: string[] = [];
    if (Array.isArray(parsed.coreEvents) && parsed.coreEvents.length > 0) {
      summaryParts.push(`核心事件：${parsed.coreEvents.join('；')}`);
    }
    if (parsed.characterActivities) {
      summaryParts.push(`人物活动：${parsed.characterActivities}`);
    }
    if (parsed.keyInformation) {
      summaryParts.push(`关键信息：${parsed.keyInformation}`);
    }
    if (parsed.emotionalClues) {
      summaryParts.push(`情感线索：${parsed.emotionalClues}`);
    }
    
    if (summaryParts.length > 0) {
      return {
        coreEvents: Array.isArray(parsed.coreEvents) ? parsed.coreEvents : [],
        characterActivities: parsed.characterActivities || '',
        keyInformation: parsed.keyInformation || '',
        emotionalClues: parsed.emotionalClues || '',
        fullSummary: summaryParts.join('。'),
      };
    }
    
    // 如果解析成功但没有有效数据，抛出错误以触发fallback
    throw new Error('AI返回的JSON格式不正确，缺少摘要内容');
  } catch (error) {
    console.error('章节摘要生成错误:', error);
    
    // 如果是 OpenRouter API 错误（如 API key 无效、网络错误等），直接抛出，不进行 fallback
    if (error instanceof OpenRouterError) {
      console.error('OpenRouter API错误详情:', {
        statusCode: error.statusCode,
        response: error.response,
        message: error.message,
      });
      throw new Error(
        `OpenRouter API调用失败 (状态码: ${error.statusCode}): ${error.message}。请检查API Key是否正确配置。`
      );
    }
    
    // 如果是其他类型的错误（如网络错误），也直接抛出
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        throw new Error(`网络连接失败: ${error.message}。请检查网络连接。`);
      }
      // 如果是 JSON 解析错误，可以尝试 fallback
      if (error.message.includes('JSON') || error.message.includes('parse')) {
        console.log('JSON解析失败，尝试fallback方法');
      } else {
        // 其他错误直接抛出
        throw error;
      }
    }
    
    if (responseContent) {
      console.error('原始响应内容:', responseContent.substring(0, 500));
    }
    
    // 如果JSON解析失败，调用AI生成简单文本摘要
    try {
      const fallbackResponse = await client.chatCompletion({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的小说内容分析助手，请用简洁的语言总结章节的核心内容，控制在500字以内。',
          },
          {
            role: 'user',
            content: `请为以下章节生成摘要（500字以内）：\n\n章节标题：${chapterTitle || '未命名章节'}${previousContext}\n\n章节内容：\n${chapterContent.substring(0, 8000)}`, // 限制长度避免超限
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });
      
      const fallbackSummary = fallbackResponse.choices[0]?.message?.content || '';
      
      return {
        coreEvents: [],
        characterActivities: '',
        keyInformation: '',
        emotionalClues: '',
        fullSummary: fallbackSummary.trim() || '摘要生成失败，请重试',
      };
    } catch (fallbackError) {
      console.error('Fallback摘要生成也失败:', fallbackError);
      
      // 检查是否是 OpenRouter API 错误
      if (fallbackError instanceof Error) {
        // 如果是 OpenRouterError，提供更详细的错误信息
        if (fallbackError.name === 'OpenRouterError' || fallbackError.message.includes('OpenRouter')) {
          throw new Error(`OpenRouter API调用失败: ${fallbackError.message}。请检查API Key是否正确配置。`);
        }
        // 如果是网络错误或其他错误
        if (fallbackError.message.includes('fetch') || fallbackError.message.includes('network')) {
          throw new Error(`网络错误: ${fallbackError.message}。请检查网络连接。`);
        }
      }
      
      // 如果所有方法都失败，抛出错误而不是返回错误信息字符串
      throw new Error(
        `摘要生成失败: ${fallbackError instanceof Error ? fallbackError.message : '未知错误'}。请检查API配置或稍后重试。`
      );
    }
  }
}

/**
 * 分段处理超长章节的摘要生成
 */
async function generateChapterSummaryChunked(
  content: string,
  title: string | null,
  apiKey: string,
  model: string,
  maxContextLength: number,
  previousChapterSummaries?: PreviousChapterSummary[]
): Promise<ChapterSummary> {
  // 将内容按段落分割（假设每个段落不超过1000字符）
  const chunks: string[] = [];
  const chunkSize = 10000; // 每段大约10K字符

  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }

  // 为每个段落生成要点
  const chunkSummaries: string[] = [];
  for (const chunk of chunks) {
    const client = createOpenRouterClient(apiKey);
    const response = await client.chatCompletion({
      model,
      messages: [
        {
          role: 'system',
          content: '提取文本的核心要点，用简洁的语言描述（100字以内）。',
        },
        {
          role: 'user',
          content: `提取以下文本的核心要点：\n\n${chunk}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const summary = response.choices[0]?.message?.content || '';
    chunkSummaries.push(summary);
  }

  // 合并所有段落摘要，生成最终摘要
  const combinedContent = chunkSummaries.join('\n\n');
  return await generateChapterSummary(combinedContent, title, apiKey, model, maxContextLength, previousChapterSummaries);
}

