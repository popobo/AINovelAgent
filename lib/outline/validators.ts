/**
 * 大纲相关验证器
 */

import { z } from 'zod';

/**
 * 生成大纲的请求验证
 */
export const generateOutlinesSchema = z.object({
  chapterCount: z.number().min(1).max(50), // 最多一次性生成50章大纲
  model: z.string().optional(),
  startingContext: z.object({
    overallDirection: z.string().max(2000).optional(),
    specificRequirements: z.array(z.string().max(500)).optional(),
  }).optional(),
});

/**
 * 更新大纲的验证
 */
export const updateOutlineSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  plotSummary: z.string().min(50).max(10000).optional(),
  characterGoals: z.array(z.object({
    character: z.string().min(1).max(100),
    goal: z.string().min(1).max(500),
  })).optional(),
  conflicts: z.object({
    internal: z.array(z.string().max(500)).optional(),
    external: z.array(z.string().max(500)).optional(),
  }).optional(),
  emotionalArc: z.string().max(2000).optional(),
  keyScenes: z.array(z.object({
    description: z.string().min(1).max(500),
    position: z.enum(['开头', '中间', '结尾', 'Opening', 'Middle', 'Ending']),
  })).optional(),
  notes: z.string().max(5000).optional(),
});

/**
 * 从大纲生成章节的验证
 */
export const generateChapterFromOutlineSchema = z.object({
  model: z.string().optional(),
  additionalPrompt: z.string().max(2000).optional(),
});

/**
 * 批量操作的验证
 */
export const batchOperationSchema = z.object({
  outlineIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * 重新生成大纲的验证
 */
export const regenerateOutlinesSchema = z.object({
  fromChapter: z.number().min(1),
  chapterCount: z.number().min(1).max(50),
  keepApproved: z.boolean().default(false),
});
