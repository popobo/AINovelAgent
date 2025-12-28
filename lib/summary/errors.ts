/**
 * 章节摘要生成错误基类
 */
export class ChapterSummaryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ChapterSummaryError';
  }
}

/**
 * API调用错误
 */
export class APIError extends ChapterSummaryError {
  constructor(message: string, details?: unknown) {
    super(message, 'API_ERROR', details);
    this.name = 'APIError';
  }
}

/**
 * JSON解析错误
 */
export class ParseError extends ChapterSummaryError {
  constructor(message: string, details?: unknown) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'ParseError';
  }
}

/**
 * 内容验证错误
 */
export class ValidationError extends ChapterSummaryError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
