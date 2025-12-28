import { createOpenRouterClient } from '@/lib/openrouter/client';
import type { ChatMessage } from '@/lib/openrouter/types';
import { OpenRouterError } from '@/lib/openrouter/types';
import { getSystemPrompt, getUserPrompt, buildPreviousContext, getFallbackPrompt } from './prompts';
import { ChapterSummaryParser, ChapterSummary } from './parsers';
import { SummaryDebugService } from './debug-service';
import { SUMMARY_CONFIG } from './constants';
import { APIError } from './errors';

export interface PreviousChapterSummary {
  chapterIndex: number;
  title: string | null;
  summary: string;
}

/**
 * 为章节生成摘要（重构版）
 */
export async function generateChapterSummary(
  chapterContent: string,
  chapterTitle: string | null,
  apiKey: string,
  model: string = SUMMARY_CONFIG.DEFAULT_MODEL,
  maxContextLength: number = SUMMARY_CONFIG.DEFAULT_MAX_CONTEXT_LENGTH,
  previousChapterSummaries?: PreviousChapterSummary[],
  temperature: number = SUMMARY_CONFIG.DEFAULT_TEMPERATURE,
  maxTokens: number = SUMMARY_CONFIG.DEFAULT_MAX_TOKENS
): Promise<ChapterSummary> {
  // 如果章节内容超过上下文限制，需要分段处理
  if (chapterContent.length > maxContextLength * 3) {
    return await generateChapterSummaryChunked(
      chapterContent,
      chapterTitle,
      apiKey,
      model,
      maxContextLength,
      previousChapterSummaries,
      temperature,
      maxTokens
    );
  }

  const client = createOpenRouterClient(apiKey);

  // 构建上下文
  const previousContext = buildPreviousContext(previousChapterSummaries);

  // 构建提示词
  const systemPrompt = getSystemPrompt();
  const userPrompt = getUserPrompt(chapterTitle, chapterContent, previousContext);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  let debugFilepath: string | null = null;

  try {
    // 保存调试请求
    debugFilepath = await SummaryDebugService.saveRequest({
      timestamp: new Date().toISOString(),
      model,
      temperature,
      max_tokens: maxTokens,
      messages,
      chapterTitle,
      chapterContentLength: chapterContent.length,
      previousChapterSummariesCount: previousChapterSummaries?.length || 0,
    });

    // 调用API
    const response = await client.chatCompletion({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content || '{}';

    // 保存调试响应
    await SummaryDebugService.saveResponse(debugFilepath, {
      timestamp: new Date().toISOString(),
      content,
      fullResponse: response,
    });

    // 解析响应
    const parsed = ChapterSummaryParser.parseResponse(content);

    // 保存解析结果
    await SummaryDebugService.saveParsedResult(debugFilepath, parsed);

    return parsed;
  } catch (error) {
    return await handleFallback(
      error,
      client,
      model,
      systemPrompt,
      userPrompt,
      chapterTitle,
      chapterContent,
      previousContext,
      temperature,
      maxTokens,
      debugFilepath
    );
  }
}

/**
 * 处理降级逻辑
 */
async function handleFallback(
  error: unknown,
  client: ReturnType<typeof createOpenRouterClient>,
  model: string,
  _systemPrompt: string,
  _userPrompt: string,
  chapterTitle: string | null,
  chapterContent: string,
  _previousContext: string,
  temperature: number,
  maxTokens: number,
  _debugFilepath: string | null
): Promise<ChapterSummary> {
  console.error('章节摘要生成错误:', error);

  // 如果是 OpenRouter API 错误，直接抛出
  if (error instanceof OpenRouterError) {
    console.error('OpenRouter API错误详情:', {
      statusCode: error.statusCode,
      response: error.response,
      message: error.message,
    });
    throw new APIError(
      `OpenRouter API调用失败 (状态码: ${error.statusCode}): ${error.message}。请检查API Key是否正确配置。`
    );
  }

  // 如果是网络错误，直接抛出
  if (error instanceof Error) {
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED')
    ) {
      throw new APIError(`网络连接失败: ${error.message}。请检查网络连接。`);
    }

    // 如果是 JSON 解析错误，尝试 fallback
    if (!error.message.includes('JSON') && !error.message.includes('parse')) {
      throw error;
    }
  }

  console.log('JSON解析失败，尝试fallback方法');

  // 调用AI生成简单文本摘要
  try {
    const fallbackPrompt = getFallbackPrompt(chapterTitle, chapterContent.substring(0, 8000));

    const fallbackResponse = await client.chatCompletion({
      model,
      messages: [
        { role: 'system', content: _systemPrompt },
        { role: 'user', content: fallbackPrompt },
      ],
      temperature,
      max_tokens: Math.floor(maxTokens * SUMMARY_CONFIG.FALLBACK_TOKEN_RATIO),
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
      if (fallbackError.name === 'OpenRouterError' || fallbackError.message.includes('OpenRouter')) {
        throw new APIError(
          `OpenRouter API调用失败: ${fallbackError.message}。请检查API Key是否正确配置。`
        );
      }
      if (fallbackError.message.includes('fetch') || fallbackError.message.includes('network')) {
        throw new APIError(`网络错误: ${fallbackError.message}。请检查网络连接。`);
      }
    }

    throw new APIError(
      `摘要生成失败: ${fallbackError instanceof Error ? fallbackError.message : '未知错误'}。请检查API配置或稍后重试。`
    );
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
  previousChapterSummaries?: PreviousChapterSummary[],
  temperature: number = SUMMARY_CONFIG.DEFAULT_TEMPERATURE,
  maxTokens: number = SUMMARY_CONFIG.DEFAULT_MAX_TOKENS
): Promise<ChapterSummary> {
  const chunks: string[] = [];
  const chunkSize = SUMMARY_CONFIG.CHUNK_SIZE;

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
      temperature,
      max_tokens: Math.floor(maxTokens * SUMMARY_CONFIG.CHUNK_TOKEN_RATIO),
    });

    const summary = response.choices[0]?.message?.content || '';
    chunkSummaries.push(summary);
  }

  // 合并所有段落摘要，生成最终摘要
  const combinedContent = chunkSummaries.join('\n\n');
  return await generateChapterSummary(
    combinedContent,
    title,
    apiKey,
    model,
    maxContextLength,
    previousChapterSummaries,
    temperature,
    maxTokens
  );
}
