-- 启用 pgvector 扩展（用于向量搜索）
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 小说主表
-- ============================================
CREATE TABLE novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  genre TEXT,
  summary TEXT,
  settings JSONB DEFAULT '{}',
  style_guide TEXT,
  word_count INTEGER DEFAULT 0,
  chapter_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER novels_updated_at
  BEFORE UPDATE ON novels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 章节表
-- ============================================
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(novel_id, chapter_number)
);

CREATE INDEX idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX idx_chapters_chapter_number ON chapters(novel_id, chapter_number);

CREATE TRIGGER chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 人物表
-- ============================================
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  personality TEXT,
  relationships JSONB DEFAULT '[]',
  appearance TEXT,
  first_appearance INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_characters_novel_id ON characters(novel_id);

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 向量存储表（用于RAG检索）
-- ============================================
CREATE TABLE novel_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_novel_id ON novel_embeddings(novel_id);
CREATE INDEX idx_embeddings_chapter_id ON novel_embeddings(chapter_id);

-- 创建向量索引（使用IVFFlat算法，适合大规模数据）
CREATE INDEX idx_embeddings_vector ON novel_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- 同人小说原作设定表
-- ============================================
CREATE TABLE fanfic_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('anime', 'movie', 'tv', 'game', 'novel', 'other')),
  world_setting TEXT,
  characters JSONB DEFAULT '[]',
  plot_summary TEXT,
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fanfic_sources_type ON fanfic_sources(type);

CREATE TRIGGER fanfic_sources_updated_at
  BEFORE UPDATE ON fanfic_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 同人小说表
-- ============================================
CREATE TABLE fanfic_novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES fanfic_sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  characters JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  chapter_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fanfic_novels_source_id ON fanfic_novels(source_id);

CREATE TRIGGER fanfic_novels_updated_at
  BEFORE UPDATE ON fanfic_novels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 同人小说章节表
-- ============================================
CREATE TABLE fanfic_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fanfic_id UUID NOT NULL REFERENCES fanfic_novels(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fanfic_id, chapter_number)
);

CREATE INDEX idx_fanfic_chapters_fanfic_id ON fanfic_chapters(fanfic_id);

CREATE TRIGGER fanfic_chapters_updated_at
  BEFORE UPDATE ON fanfic_chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 向量相似度搜索函数
-- ============================================
CREATE OR REPLACE FUNCTION match_novel_embeddings(
  query_embedding VECTOR(1536),
  match_novel_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ne.id,
    ne.content,
    1 - (ne.embedding <=> query_embedding) AS similarity,
    ne.metadata
  FROM novel_embeddings ne
  WHERE ne.novel_id = match_novel_id
    AND 1 - (ne.embedding <=> query_embedding) > match_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

