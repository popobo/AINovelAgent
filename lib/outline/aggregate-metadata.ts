/**
 * 从章节摘要聚合metadata
 */

import { prisma } from '@/lib/prisma';

/**
 * 从所有章节摘要的metadata字段中聚合人物和世界观信息
 */
export async function aggregateMetadataFromSummaries(
  novelId: string
): Promise<{
  characters?: Record<string, Record<string, unknown>>;
  worldRules?: Record<string, unknown>;
} | null> {
  // 1. 获取所有章节摘要
  const chapterSummaries = await prisma.summary.findMany({
    where: { novelId, type: 'CHAPTER' },
    orderBy: { createdAt: 'asc' },
  });

  if (chapterSummaries.length === 0) {
    return null;
  }

  // 2. 聚合人物信息
  const characterMap = new Map<string, {
    name: string;
    personality?: string;
    description?: string;
    appearances: number; // 出现次数
    relationships: Set<string>;
  }>();

  // 3. 聚合世界观信息
  const worldInfo = {
    setting: '',
    rules: [] as string[],
    locations: [] as string[],
    textStyles: new Set<string>(),
    intensities: new Set<string>(),
  };

  // 4. 遍历所有摘要的metadata
  for (const summary of chapterSummaries) {
    if (!summary.metadata) continue;

    const metadata = summary.metadata as {
      newAnalysis?: {
        characters?: Array<{name: string; personality: string; description: string}>;
        text_features?: {style: string; intensity: string};
      };
      keyInformation?: string;
    };

    // 提取人物信息
    if (metadata.newAnalysis?.characters) {
      for (const char of metadata.newAnalysis.characters) {
        const existing = characterMap.get(char.name);
        if (existing) {
          existing.appearances++;
          if (char.personality && !existing.personality) {
            existing.personality = char.personality;
          }
          if (char.description && !existing.description) {
            existing.description = char.description;
          }
        } else {
          characterMap.set(char.name, {
            name: char.name,
            personality: char.personality,
            description: char.description,
            appearances: 1,
            relationships: new Set(),
          });
        }
      }
    }

    // 提取世界观信息
    if (metadata.newAnalysis?.text_features?.style) {
      worldInfo.textStyles.add(metadata.newAnalysis.text_features.style);
    }
    if (metadata.newAnalysis?.text_features?.intensity) {
      worldInfo.intensities.add(metadata.newAnalysis.text_features.intensity);
    }
  }

  // 5. 构建人物关系（基于共现）
  for (const summary of chapterSummaries) {
    if (!summary.metadata) continue;
    const metadata = summary.metadata as {
      newAnalysis?: {
        characters?: Array<{name: string}>;
      };
    };

    if (metadata.newAnalysis?.characters) {
      const charNames = metadata.newAnalysis.characters.map(c => c.name);
      // 建立同一章节中人物之间的关系
      for (let i = 0; i < charNames.length; i++) {
        for (let j = i + 1; j < charNames.length; j++) {
          const char1 = characterMap.get(charNames[i]);
          const char2 = characterMap.get(charNames[j]);
          if (char1 && char2) {
            char1.relationships.add(charNames[j]);
            char2.relationships.add(charNames[i]);
          }
        }
      }
    }
  }

  // 6. 转换为返回格式
  const characters: Record<string, Record<string, unknown>> = {};
  for (const [name, char] of characterMap) {
    characters[name] = {
      name: char.name,
      personality: char.personality || '未知',
      description: char.description || '',
      relationships: Array.from(char.relationships),
      appearances: char.appearances,
    };
  }

  const worldRules: Record<string, unknown> = {
    setting: worldInfo.setting || '现代背景',
    rules: worldInfo.rules,
    locations: worldInfo.locations,
    textStyles: Array.from(worldInfo.textStyles),
    intensities: Array.from(worldInfo.intensities),
  };

  return { characters, worldRules };
}
