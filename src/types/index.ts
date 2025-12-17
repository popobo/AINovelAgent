// ============================================
// 小说相关类型
// ============================================

export interface Novel {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  summary?: string;
  settings?: WorldSettings;
  style_guide?: string;
  created_at: string;
  updated_at?: string;
  chapter_count?: number;
  word_count?: number;
}

export interface Chapter {
  id: string;
  novel_id: string;
  chapter_number: number;
  title?: string;
  content: string;
  summary?: string;
  word_count: number;
  created_at: string;
}

export interface Character {
  id: string;
  novel_id: string;
  name: string;
  description?: string;
  personality?: string;
  relationships?: CharacterRelationship[];
  appearance?: string;
}

export interface CharacterRelationship {
  character_id: string;
  character_name: string;
  relationship: string;
}

export interface WorldSettings {
  era?: string;
  location?: string;
  magic_system?: string;
  technology_level?: string;
  social_structure?: string;
  custom_settings?: Record<string, string>;
}

// ============================================
// 同人小说相关类型
// ============================================

export interface FanficSource {
  id: string;
  name: string;
  type: "anime" | "movie" | "tv" | "game" | "novel" | "other";
  world_setting?: string;
  characters: FanficCharacter[];
  plot_summary?: string;
  created_at: string;
}

export interface FanficCharacter {
  name: string;
  description: string;
  personality: string;
  relationships?: string[];
  catchphrases?: string[];
}

// ============================================
// AI相关类型
// ============================================

export type AIProviderType = "openai" | "claude" | "deepseek" | "qwen" | "openrouter";

export interface AIGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
}

// ============================================
// 上下文管理相关类型
// ============================================

export interface NovelContext {
  novelSummary: string;
  chapterSummaries: ChapterSummary[];
  characters: Character[];
  relevantParagraphs: RelevantParagraph[];
  recentChapters: Chapter[];
  worldSettings?: WorldSettings;
  styleGuide?: string;
}

export interface ChapterSummary {
  chapter_number: number;
  title?: string;
  summary: string;
}

export interface RelevantParagraph {
  content: string;
  chapter_number: number;
  similarity_score: number;
}

// ============================================
// RAG相关类型
// ============================================

export interface EmbeddingRecord {
  id: string;
  novel_id: string;
  chapter_id: string;
  content: string;
  embedding: number[];
  metadata?: {
    chapter_number?: number;
    paragraph_index?: number;
    character_names?: string[];
  };
}

export interface SearchResult {
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// API响应类型
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// 导入相关类型
// ============================================

export interface ImportOptions {
  autoSplitChapters: boolean;
  chapterPattern?: string;
  generateSummaries: boolean;
  extractCharacters: boolean;
}

export interface ImportProgress {
  stage: "parsing" | "splitting" | "summarizing" | "embedding" | "complete";
  progress: number;
  message: string;
}

