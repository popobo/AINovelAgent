import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 调试数据接口
 */
export interface DebugRequestData {
  timestamp: string;
  model: string;
  temperature: number;
  max_tokens: number;
  messages: unknown[];
  chapterTitle: string | null;
  chapterContentLength: number;
  previousChapterSummariesCount: number;
}

export interface DebugResponseData {
  timestamp: string;
  content: string;
  fullResponse: unknown;
  parsed?: unknown;
}

/**
 * 章节摘要调试服务
 * 用于保存和加载调试信息
 */
export class SummaryDebugService {
  private static enabled = !!process.env.PROMPT_DEBUG_URL && process.env.PROMPT_DEBUG_URL !== '';
  private static debugDir = process.env.PROMPT_DEBUG_URL || '';

  /**
   * 保存调试请求
   * @returns 文件路径,如果调试未启用则返回null
   */
  static async saveRequest(data: DebugRequestData): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `chapter-summary-request-${timestamp}.json`;
      const filepath = join(this.debugDir, filename);

      await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[调试] LLM API 请求内容已保存到: ${filepath}`);
      return filepath;
    } catch (error) {
      console.warn('[调试] 保存调试文件失败:', error);
      return null;
    }
  }

  /**
   * 保存调试响应
   */
  static async saveResponse(
    filepath: string | null,
    response: DebugResponseData
  ): Promise<void> {
    if (!filepath || !this.enabled) {
      return;
    }

    try {
      const existingData = JSON.parse(await readFile(filepath, 'utf-8'));
      const updatedData = {
        ...existingData,
        response: {
          ...response,
          timestamp: new Date().toISOString(),
        },
      };
      await writeFile(filepath, JSON.stringify(updatedData, null, 2), 'utf-8');
      console.log(`[调试] LLM API 回复内容已追加到: ${filepath}`);
    } catch (error) {
      console.warn('[调试] 追加回复内容到调试文件失败:', error);
    }
  }

  /**
   * 保存解析后的结果
   */
  static async saveParsedResult(
    filepath: string | null,
    parsed: unknown
  ): Promise<void> {
    if (!filepath || !this.enabled) {
      return;
    }

    try {
      const existingData = JSON.parse(await readFile(filepath, 'utf-8'));
      const updatedData = {
        ...existingData,
        response: {
          ...existingData.response,
          parsed,
        },
      };
      await writeFile(filepath, JSON.stringify(updatedData, null, 2), 'utf-8');
      console.log(`[调试] 解析结果已更新到: ${filepath}`);
    } catch (error) {
      console.warn('[调试] 更新解析结果到调试文件失败:', error);
    }
  }
}
