-- ============================================
-- 用户设置表（支持匿名用户）
-- ============================================
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 使用设备标识符支持匿名用户
  device_id TEXT NOT NULL UNIQUE,
  -- AI 设置
  default_provider TEXT DEFAULT 'openai' CHECK (
    default_provider IN ('openai', 'claude', 'deepseek', 'qwen', 'openrouter')
  ),
  openrouter_model TEXT DEFAULT 'anthropic/claude-3.5-sonnet',
  -- 生成设置
  default_word_count INTEGER DEFAULT 1000,
  temperature FLOAT DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
  -- 阅读设置
  font_size INTEGER DEFAULT 16,
  line_height FLOAT DEFAULT 2,
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_settings_device_id ON user_settings(device_id);

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

