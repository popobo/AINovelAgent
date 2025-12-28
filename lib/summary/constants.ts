/**
 * 章节摘要生成配置常量
 */
export const SUMMARY_CONFIG = {
  /** 默认模型 */
  DEFAULT_MODEL: 'openai/gpt-4o-mini',

  /** 默认温度参数 */
  DEFAULT_TEMPERATURE: 0.3,

  /** 默认最大token数 */
  DEFAULT_MAX_TOKENS: 2000,

  /** 默认最大上下文长度 */
  DEFAULT_MAX_CONTEXT_LENGTH: 32000,

  /** 分段处理时的块大小 */
  CHUNK_SIZE: 10000,

  /** 降级处理时的token比例 */
  FALLBACK_TOKEN_RATIO: 0.5,

  /** 块处理时的token比例 */
  CHUNK_TOKEN_RATIO: 0.1,
} as const;
