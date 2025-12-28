/**
 * 章节大纲相关类型定义
 */

import type { OutlineStatus } from '@prisma/client';

/**
 * 单个大纲数据结构
 */
export interface ChapterOutlineData {
  id: string;
  novelId: string;
  chapterIndex: number;
  title: string;
  plotSummary: string;
  characterGoals?: Array<{ character: string; goal: string }>;
  conflicts?: {
    internal?: string[];
    external?: string[];
  };
  emotionalArc?: string;
  keyScenes?: Array<{ description: string; position: string }>;
  notes?: string;
  status: OutlineStatus;
  generatedChapterId?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 大纲生成选项
 */
export interface OutlineGenerationOptions {
  novelId: string;
  chapterCount: number;
  apiKey: string;
  model?: string;
  startingContext?: {
    overallDirection?: string;
    specificRequirements?: string[];
  };
}

/**
 * 从大纲生成章节的选项
 */
export interface ChapterGenerationFromOutlineOptions {
  outlineId: string;
  apiKey: string;
  model?: string;
  additionalPrompt?: string;
}

/**
 * 大纲生成结果（从LLM返回）
 */
export interface OutlineGenerationResult {
  outlines: Array<{
    title: string;
    plotSummary: string;
    characterGoals?: Array<{ character: string; goal: string }>;
    conflicts?: {
      internal?: string[];
      external?: string[];
    };
    emotionalArc?: string;
    keyScenes?: Array<{ description: string; position: string }>;
  }>;
  summary: {
    overallArc: string;
    mainThemes: string[];
  };
}

/**
 * 大纲上下文信息
 */
export interface OutlineContext {
  globalSummary?: string;
  metadata?: {
    characters?: Record<string, Record<string, unknown>>;
    worldRules?: Record<string, unknown>;
  };
  recentChapters?: Array<{
    chapterIndex: number;
    title?: string | null;
    summary?: string | null;
  }>;
  startingContext?: {
    overallDirection?: string;
    specificRequirements?: string[];
  };
}

/**
 * 大纲更新数据
 */
export type OutlineUpdateData = Partial<Pick<ChapterOutlineData,
  'title' | 'plotSummary' | 'characterGoals' | 'conflicts' |
  'emotionalArc' | 'keyScenes' | 'notes'
>>;

/**
 * 批量操作选项
 */
export interface BatchOperationOptions {
  outlineIds: string[];
}
