import { createOpenRouterClient } from '@/lib/openrouter/client';
import type { ChatMessage } from '@/lib/openrouter/types';

export interface NovelMetadata {
  characters: Record<string, {
    name: string;
    role?: string;
    description?: string;
    relationships?: Record<string, string>;
    keyMoments?: string[];
    currentStatus?: string;
  }>;
  locations: Record<string, {
    name: string;
    description?: string;
    importance?: string;
  }>;
  worldRules: {
    setting?: string;
    rules?: string[];
    locations?: string[];
  };
  keyEvents: Array<{
    chapterIndex: number;
    description: string;
    significance?: string;
  }>;
}

/**
 * 从章节内容中提取关键信息（人物、地点、世界观等）
 */
export async function extractMetadata(
  chapterContent: string,
  existingMetadata: NovelMetadata | null,
  apiKey: string,
  model: string = 'openai/gpt-4o-mini'
): Promise<NovelMetadata> {
  const client = createOpenRouterClient(apiKey);

  const prompt = `请分析以下章节内容，提取关键信息。

要求提取以下信息并以JSON格式返回：

1. **characters**（人物信息）：
   - 出现的人物及其信息
   - 包括：name（姓名）、role（角色定位，如主角/配角/反派等）、description（描述）、relationships（与其他人物关系）、currentStatus（当前状态）

2. **locations**（地点信息）：
   - 出现的地点及其描述
   - 包括：name（名称）、description（描述）、importance（重要性）

3. **worldRules**（世界观设定）：
   - 世界观相关设定
   - 包括：setting（背景设定）、rules（规则/法则）、locations（关键地点列表）

4. **keyEvents**（关键事件）：
   - 本章节的关键事件
   - 包括：chapterIndex（章节索引，如果是单章节分析则设为1）、description（事件描述）、significance（重要性）

如果存在existingMetadata（已有元数据），请合并更新，而不是替换。

JSON格式示例：
{
  "characters": {
    "张三": {
      "name": "张三",
      "role": "主角",
      "description": "年龄、外貌、性格",
      "relationships": {
        "李四": "好友",
        "王五": "敌人"
      },
      "currentStatus": "最新状态描述"
    }
  },
  "locations": {
    "京城": {
      "name": "京城",
      "description": "繁华的都城",
      "importance": "重要"
    }
  },
  "worldRules": {
    "setting": "古代武侠世界",
    "rules": ["内功心法", "武功秘籍"],
    "locations": ["京城", "江南"]
  },
  "keyEvents": [
    {
      "chapterIndex": 1,
      "description": "张三遇到李四",
      "significance": "重要"
    }
  ]
}

章节内容：
${chapterContent}

${existingMetadata ? `已有元数据（请合并更新）：\n${JSON.stringify(existingMetadata, null, 2)}` : ''}

请返回JSON格式：`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: '你是一个专业的小说内容分析助手，擅长提取人物、地点、世界观等关键信息。请只返回有效的JSON格式，不要包含其他文字说明。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await client.chatCompletion({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // 提取JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n');
    }
    if (jsonStr.startsWith('```json')) {
      const lines = jsonStr.split('\n');
      jsonStr = lines.slice(1, -1).join('\n');
    }

    const parsed = JSON.parse(jsonStr);
    
    // 合并已有元数据
    if (existingMetadata) {
      return mergeMetadata(existingMetadata, parsed as NovelMetadata);
    }

    return parsed as NovelMetadata;
  } catch (error) {
    console.error('元数据提取错误:', error);
    return existingMetadata || {
      characters: {},
      locations: {},
      worldRules: {},
      keyEvents: [],
    };
  }
}

/**
 * 合并元数据
 */
function mergeMetadata(
  existing: NovelMetadata,
  newData: NovelMetadata
): NovelMetadata {
  // 合并人物信息
  const mergedCharacters = { ...existing.characters };
  for (const [name, info] of Object.entries(newData.characters || {})) {
    if (mergedCharacters[name]) {
      // 合并已有信息
      mergedCharacters[name] = {
        ...mergedCharacters[name],
        ...info,
        relationships: {
          ...mergedCharacters[name].relationships,
          ...info.relationships,
        },
      };
    } else {
      mergedCharacters[name] = info;
    }
  }

  // 合并地点信息
  const mergedLocations = { ...existing.locations, ...newData.locations };

  // 合并世界观设定
  const mergedWorldRules = {
    setting: newData.worldRules?.setting || existing.worldRules?.setting,
    rules: [
      ...(existing.worldRules?.rules || []),
      ...(newData.worldRules?.rules || []),
    ].filter((v, i, a) => a.indexOf(v) === i), // 去重
    locations: [
      ...(existing.worldRules?.locations || []),
      ...(newData.worldRules?.locations || []),
    ].filter((v, i, a) => a.indexOf(v) === i), // 去重
  };

  // 合并关键事件
  const mergedKeyEvents = [
    ...existing.keyEvents,
    ...newData.keyEvents,
  ];

  return {
    characters: mergedCharacters,
    locations: mergedLocations,
    worldRules: mergedWorldRules,
    keyEvents: mergedKeyEvents,
  };
}

/**
 * 从多个章节提取并合并元数据
 */
export async function extractMetadataFromChapters(
  chapters: Array<{ content: string; chapterIndex: number }>,
  apiKey: string,
  model: string = 'openai/gpt-4o-mini'
): Promise<NovelMetadata> {
  let metadata: NovelMetadata | null = null;

  for (const chapter of chapters) {
    metadata = await extractMetadata(chapter.content, metadata, apiKey, model);
  }

  return metadata || {
    characters: {},
    locations: {},
    worldRules: {},
    keyEvents: [],
  };
}

