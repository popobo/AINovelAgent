import { createOpenRouterClient } from '@/lib/openrouter/client';
import type { ChatMessage } from '@/lib/openrouter/types';
import { OpenRouterError } from '@/lib/openrouter/types';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

// 新提示词返回的数据结构
export interface NewChapterAnalysis {
  core_events: Array<{event: string, details: string}>;
  characters: Array<{name: string, personality: string, description: string}>;
  sex_scenes: Array<{type: string, details: string}>;
  text_features: {style: string, intensity: string};
  summary: string;
}

export interface ChapterSummary {
  coreEvents: string[];
  characterActivities: string;
  keyInformation: string;
  emotionalClues: string;
  fullSummary: string; // 完整摘要文本
  rawAnalysis?: NewChapterAnalysis; // 保存新格式的完整数据
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
  previousChapterSummaries?: PreviousChapterSummary[],
  temperature: number = 0.3,
  maxTokens: number = 2000
): Promise<ChapterSummary> {
  const client = createOpenRouterClient(apiKey);

  // 如果章节内容超过上下文限制，需要分段处理
  if (chapterContent.length > maxContextLength * 3) {
    // 粗略估算：假设平均每个字符0.5个token，需要预留空间给提示词和响应
    return await generateChapterSummaryChunked(chapterContent, chapterTitle, apiKey, model, maxContextLength, previousChapterSummaries, temperature, maxTokens);
  }

  // 构建之前章节摘要的上下文
  let previousContext = '';
  if (previousChapterSummaries && previousChapterSummaries.length > 0) {
    const previousSummariesText = previousChapterSummaries
      .map(ch => `第${ch.chapterIndex}章 ${ch.title || '未命名'}：\n${ch.summary}`)
      .join('\n\n');
    previousContext = `\n\n之前章节摘要（用于理解剧情连贯性）：\n${previousSummariesText}\n`;
  }

  // 新提示词：用户提供的角色定义
  const systemPrompt = `# Role: 成人色情小说分析专家

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

  const userPrompt = `请分析以下章节内容，提取关键元素。

章节标题：${chapterTitle || '未命名章节'}${previousContext}

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

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: userPrompt,
    },
  ];

  let response;
  let responseContent: string | undefined;
  let debugFilepath: string | undefined;
  const promptDebugUrl = process.env.PROMPT_DEBUG_URL;
  
  try {
    // 调试：保存发送给 LLM API 的全部内容到临时文件
    if (promptDebugUrl && promptDebugUrl != "") {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `chapter-summary-request-${timestamp}.json`;
        debugFilepath = join(promptDebugUrl, filename);
        const debugData = {
          timestamp: new Date().toISOString(),
          model,
          temperature: temperature,
          max_tokens: maxTokens,
          messages,
          chapterTitle,
          chapterContentLength: chapterContent.length,
          previousChapterSummariesCount: previousChapterSummaries?.length || 0,
        };
        await writeFile(debugFilepath, JSON.stringify(debugData, null, 2), 'utf-8');
        console.log(`[调试] LLM API 请求内容已保存到: ${debugFilepath}`);
      } catch (debugError) {
        console.warn('[调试] 保存调试文件失败:', debugError);
      }
    }

    response = await client.chatCompletion({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content || '{}';
    responseContent = content;
    
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
        console.log(`[调试] LLM API 回复内容已追加到: ${debugFilepath}`);
      } catch (debugError) {
        console.warn('[调试] 追加回复内容到调试文件失败:', debugError);
      }
    }
    
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
      } catch (debugError) {
        console.warn('[调试] 更新解析结果到调试文件失败:', debugError);
      }
    }
    
    // 检查是否是新格式（包含 core_events 字段）
    if (parsed.core_events && Array.isArray(parsed.core_events)) {
      // 新格式：转换为旧格式
      const newAnalysis: NewChapterAnalysis = {
        core_events: parsed.core_events || [],
        characters: parsed.characters || [],
        sex_scenes: parsed.sex_scenes || [],
        text_features: parsed.text_features || { style: '', intensity: '' },
        summary: parsed.summary || '',
      };

      // 转换为旧格式
      const coreEvents = newAnalysis.core_events.map(item => item.event);
      
      // 将 characters 数组转换为描述性文本
      const characterActivities = newAnalysis.characters
        .map(char => `${char.name}（${char.personality}）：${char.description}`)
        .join('；');

      // 合并 text_features 和 sex_scenes 到 keyInformation
      const keyInformationParts: string[] = [];
      if (newAnalysis.text_features.style) {
        keyInformationParts.push(`文本风格：${newAnalysis.text_features.style}`);
      }
      if (newAnalysis.text_features.intensity) {
        keyInformationParts.push(`色情强度：${newAnalysis.text_features.intensity}`);
      }
      if (newAnalysis.sex_scenes.length > 0) {
        const sexScenesText = newAnalysis.sex_scenes
          .map(scene => `${scene.type}：${scene.details}`)
          .join('；');
        keyInformationParts.push(`性爱场景：${sexScenesText}`);
      }
      const keyInformation = keyInformationParts.join('。');

      // emotionalClues 可以从 characters 的关系动态中提取，暂时留空或从其他字段推导
      const emotionalClues = newAnalysis.characters
        .filter(char => char.description.includes('关系') || char.description.includes('情感'))
        .map(char => char.description)
        .join('；') || '';

      return {
        coreEvents,
        characterActivities: characterActivities || '',
        keyInformation: keyInformation || '',
        emotionalClues: emotionalClues || '',
        fullSummary: newAnalysis.summary || '',
        rawAnalysis: newAnalysis,
      };
    }
    
    // 旧格式兼容：验证返回的数据结构
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
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `请为以下章节生成摘要（500字以内）：\n\n章节标题：${chapterTitle || '未命名章节'}${previousContext}\n\n章节内容：\n${chapterContent.substring(0, 8000)}`, // 限制长度避免超限
          },
        ],
        temperature,
        max_tokens: Math.floor(maxTokens * 0.5), // fallback使用一半的tokens
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
  previousChapterSummaries?: PreviousChapterSummary[],
  temperature: number = 0.3,
  maxTokens: number = 2000
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
        temperature,
        max_tokens: Math.floor(maxTokens * 0.1), // 分段处理使用10%的tokens
      });

    const summary = response.choices[0]?.message?.content || '';
    chunkSummaries.push(summary);
  }

  // 合并所有段落摘要，生成最终摘要
  const combinedContent = chunkSummaries.join('\n\n');
  return await generateChapterSummary(combinedContent, title, apiKey, model, maxContextLength, previousChapterSummaries, temperature, maxTokens);
}

