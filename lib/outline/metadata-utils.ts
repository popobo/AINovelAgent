/**
 * 元数据转换工具函数
 */

import type { NovelMetadata as PrismaNovelMetadata } from '@prisma/client';

/**
 * 类型守卫：检查值是否为非null的对象
 */
function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 将 Prisma NovelMetadata 转换为大纲生成所需的格式
 */
export function normalizeNovelMetadata(
  metadata: PrismaNovelMetadata | null
): {
  characters?: Record<string, Record<string, unknown>>;
  worldRules?: Record<string, unknown>;
} | undefined {
  if (!metadata) {
    return undefined;
  }

  return {
    characters: isNonNullObject(metadata.characters)
      ? (metadata.characters as Record<string, Record<string, unknown>>)
      : undefined,
    worldRules: isNonNullObject(metadata.worldRules)
      ? (metadata.worldRules as Record<string, unknown>)
      : undefined,
  };
}

