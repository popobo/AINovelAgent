-- ============================================
-- 添加 API Keys 字段到 user_settings 表
-- 注意：API Keys 以明文存储，仅适用于本地开发环境
-- 生产环境应使用加密存储或环境变量
-- ============================================

ALTER TABLE user_settings
ADD COLUMN openai_api_key TEXT,
ADD COLUMN anthropic_api_key TEXT,
ADD COLUMN deepseek_api_key TEXT,
ADD COLUMN qwen_api_key TEXT,
ADD COLUMN openrouter_api_key TEXT;

-- 添加注释说明这些是敏感数据
COMMENT ON COLUMN user_settings.openai_api_key IS 'OpenAI API Key (敏感数据)';
COMMENT ON COLUMN user_settings.anthropic_api_key IS 'Anthropic Claude API Key (敏感数据)';
COMMENT ON COLUMN user_settings.deepseek_api_key IS 'DeepSeek API Key (敏感数据)';
COMMENT ON COLUMN user_settings.qwen_api_key IS '通义千问 API Key (敏感数据)';
COMMENT ON COLUMN user_settings.openrouter_api_key IS 'OpenRouter API Key (敏感数据)';

