-- 修改 embeddings 表的 embedding 列为可变长度向量
-- 首先需要删除已有的向量数据（因为维度会改变）
TRUNCATE TABLE embeddings CASCADE;

-- 修改列定义从 vector(1536) 改为 vector
ALTER TABLE embeddings ALTER COLUMN embedding DROP DEFAULT;
ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector USING embedding::vector;
