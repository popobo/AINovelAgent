# 环境变量配置

创建 `.env.local` 文件并配置以下环境变量：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic Claude 配置
ANTHROPIC_API_KEY=your_anthropic_api_key

# DeepSeek 配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# 通义千问配置
QWEN_API_KEY=your_qwen_api_key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# OpenRouter 配置（支持多种模型的聚合平台）
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet  # 可选的模型名称
OPENROUTER_SITE_URL=http://localhost:3000      # 可选，用于排行榜显示
OPENROUTER_SITE_NAME=墨韵 AI                   # 可选，用于排行榜显示

# 默认AI模型 (openai | claude | deepseek | qwen | openrouter)
DEFAULT_AI_PROVIDER=openai
```

## 获取API密钥

1. **Supabase**: 访问 https://supabase.com 创建项目，在项目设置中获取URL和Key
2. **OpenAI**: 访问 https://platform.openai.com/api-keys
3. **Anthropic Claude**: 访问 https://console.anthropic.com
4. **DeepSeek**: 访问 https://platform.deepseek.com
5. **通义千问**: 访问 https://dashscope.console.aliyun.com
6. **OpenRouter**: 访问 https://openrouter.ai/keys

## OpenRouter 支持的模型

OpenRouter 是一个 AI 模型聚合平台，通过单一 API 访问多家厂商的模型：

- **Anthropic**: claude-3.5-sonnet, claude-3-opus, claude-3-haiku
- **OpenAI**: gpt-4o, gpt-4-turbo, gpt-3.5-turbo
- **Google**: gemini-pro-1.5, gemini-flash-1.5
- **Meta**: llama-3.1-405b-instruct, llama-3.1-70b-instruct
- **Mistral**: mistral-large, mixtral-8x22b-instruct
- **其他**: deepseek-chat, qwen-2-72b-instruct

完整模型列表请访问: https://openrouter.ai/models

