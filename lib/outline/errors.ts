/**
 * 大纲相关错误类
 */

/**
 * 大纲未找到错误
 */
export class OutlineNotFoundError extends Error {
  constructor(outlineId: string) {
    super(`Outline not found: ${outlineId}`);
    this.name = 'OutlineNotFoundError';
  }
}

/**
 * 大纲状态错误
 */
export class OutlineStatusError extends Error {
  constructor(currentStatus: string, expectedStatus: string) {
    super(`Invalid outline status. Expected: ${expectedStatus}, got: ${currentStatus}`);
    this.name = 'OutlineStatusError';
  }
}

/**
 * 大纲生成失败错误
 */
export class OutlineGenerationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`Outline generation failed: ${message}`);
    this.name = 'OutlineGenerationError';
  }
}

/**
 * 无效的大纲响应错误
 */
export class InvalidOutlineResponseError extends Error {
  constructor(message: string) {
    super(`Invalid outline response: ${message}`);
    this.name = 'InvalidOutlineResponseError';
  }
}

/**
 * 章节生成失败错误
 */
export class ChapterGenerationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`Chapter generation failed: ${message}`);
    this.name = 'ChapterGenerationError';
  }
}
