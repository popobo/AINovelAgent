"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Input, Select } from "@/components/ui";
import type { AIProviderType } from "@/types";

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

// 按厂商分组模型
function groupModelsByProvider(models: OpenRouterModel[]) {
  const groups: Record<string, OpenRouterModel[]> = {};
  
  for (const model of models) {
    // 从 model.id 提取厂商名称 (例如 "anthropic/claude-3.5-sonnet" -> "anthropic")
    const provider = model.id.split("/")[0];
    const providerName = getProviderDisplayName(provider);
    
    if (!groups[providerName]) {
      groups[providerName] = [];
    }
    groups[providerName].push(model);
  }
  
  // 按厂商优先级排序
  const providerOrder = ["Anthropic", "OpenAI", "Google", "Meta", "DeepSeek", "Mistral", "Qwen"];
  const sortedGroups: Record<string, OpenRouterModel[]> = {};
  
  for (const provider of providerOrder) {
    if (groups[provider]) {
      sortedGroups[provider] = groups[provider];
      delete groups[provider];
    }
  }
  
  // 其他厂商按字母排序
  const otherProviders = Object.keys(groups).sort();
  for (const provider of otherProviders) {
    sortedGroups[provider] = groups[provider];
  }
  
  return sortedGroups;
}

function getProviderDisplayName(provider: string): string {
  const nameMap: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google",
    "meta-llama": "Meta",
    mistralai: "Mistral",
    deepseek: "DeepSeek",
    qwen: "Qwen",
    cohere: "Cohere",
    perplexity: "Perplexity",
    "01-ai": "01.AI",
    nvidia: "NVIDIA",
  };
  return nameMap[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

// 格式化价格显示
function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (num === 0) return "免费";
  if (num < 0.000001) return `$${(num * 1000000).toFixed(4)}/M`;
  if (num < 0.001) return `$${(num * 1000).toFixed(4)}/K`;
  return `$${num.toFixed(6)}`;
}

export default function SettingsPage() {
  const [defaultProvider, setDefaultProvider] = useState<AIProviderType>("openai");
  const [saved, setSaved] = useState(false);

  // API Keys（仅显示是否已配置，不显示实际值）
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    anthropic: "",
    deepseek: "",
    qwen: "",
    openrouter: "",
  });
  
  // OpenRouter 模型选择
  const [openrouterModel, setOpenrouterModel] = useState("anthropic/claude-3.5-sonnet");
  const [openrouterModels, setOpenrouterModels] = useState<OpenRouterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 获取 OpenRouter 模型列表
  const fetchOpenRouterModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    
    try {
      const response = await fetch("/api/openrouter/models");
      const result = await response.json();
      
      if (result.success) {
        setOpenrouterModels(result.data);
      } else {
        setModelsError(result.error || "获取模型列表失败");
      }
    } catch {
      setModelsError("网络错误，无法获取模型列表");
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // 当选择 OpenRouter 时加载模型列表
  useEffect(() => {
    if (defaultProvider === "openrouter" && openrouterModels.length === 0) {
      fetchOpenRouterModels();
    }
  }, [defaultProvider, openrouterModels.length, fetchOpenRouterModels]);

  const handleSave = () => {
    // 在实际应用中，这里应该调用API保存设置
    // 由于我们不使用认证，设置将保存在localStorage
    localStorage.setItem("defaultProvider", defaultProvider);
    if (defaultProvider === "openrouter") {
      localStorage.setItem("openrouterModel", openrouterModel);
    }

    // API Keys应该保存到服务端环境变量，这里只是演示
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 过滤模型
  const filteredModels = searchQuery
    ? openrouterModels.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : openrouterModels;

  const groupedModels = groupModelsByProvider(filteredModels);

  return (
    <main className="min-h-screen pt-20 pb-16">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <span className="text-xl font-display text-primary">墨韵 AI</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/novels"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              我的书架
            </Link>
            <Link
              href="/fanfic"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              同人创作
            </Link>
            <Link href="/settings" className="text-primary transition-colors">
              设置
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-display text-primary mb-2">设置</h1>
          <p className="text-foreground/50">配置AI模型和API密钥</p>
        </div>

        {/* AI模型设置 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-medium text-foreground mb-4">默认AI模型</h3>
            <Select
              value={defaultProvider}
              onChange={(e) => setDefaultProvider(e.target.value as AIProviderType)}
              options={[
                { value: "openai", label: "OpenAI GPT-4o" },
                { value: "claude", label: "Anthropic Claude 3.5" },
                { value: "deepseek", label: "DeepSeek" },
                { value: "qwen", label: "通义千问" },
                { value: "openrouter", label: "OpenRouter（多模型聚合）" },
              ]}
            />
            <p className="text-sm text-foreground/50 mt-2">
              选择默认使用的AI模型，可在创作时临时切换
            </p>
          </CardContent>
        </Card>

        {/* API密钥配置 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-medium text-foreground mb-4">API密钥配置</h3>
            <p className="text-sm text-foreground/50 mb-4">
              API密钥应配置在服务器环境变量中。以下输入框仅用于演示。
            </p>

            <div className="space-y-4">
              <Input
                label="OpenAI API Key"
                type="password"
                placeholder="sk-..."
                value={apiKeys.openai}
                onChange={(e) =>
                  setApiKeys({ ...apiKeys, openai: e.target.value })
                }
              />
              <Input
                label="Anthropic API Key"
                type="password"
                placeholder="sk-ant-..."
                value={apiKeys.anthropic}
                onChange={(e) =>
                  setApiKeys({ ...apiKeys, anthropic: e.target.value })
                }
              />
              <Input
                label="DeepSeek API Key"
                type="password"
                placeholder="sk-..."
                value={apiKeys.deepseek}
                onChange={(e) =>
                  setApiKeys({ ...apiKeys, deepseek: e.target.value })
                }
              />
              <Input
                label="通义千问 API Key"
                type="password"
                placeholder="sk-..."
                value={apiKeys.qwen}
                onChange={(e) =>
                  setApiKeys({ ...apiKeys, qwen: e.target.value })
                }
              />
              
              <div className="pt-4 border-t border-border">
                <Input
                  label="OpenRouter API Key"
                  type="password"
                  placeholder="sk-or-..."
                  value={apiKeys.openrouter}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, openrouter: e.target.value })
                  }
                />
                <p className="text-xs text-foreground/50 mt-1">
                  OpenRouter 支持多种 AI 模型，获取 API Key：
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
                
                {defaultProvider === "openrouter" && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-foreground/70">
                        OpenRouter 模型
                      </label>
                      <button
                        onClick={fetchOpenRouterModels}
                        disabled={modelsLoading}
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        {modelsLoading ? "加载中..." : "🔄 刷新模型列表"}
                      </button>
                    </div>
                    
                    {/* 搜索框 */}
                    <input
                      type="text"
                      placeholder="搜索模型..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-card/50 border border-border rounded-lg text-foreground text-sm placeholder:text-foreground/40"
                    />
                    
                    {modelsError && (
                      <p className="text-xs text-red-400">{modelsError}</p>
                    )}
                    
                    {modelsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                        <span className="ml-2 text-sm text-foreground/50">正在获取模型列表...</span>
                      </div>
                    ) : (
                      <select
                        value={openrouterModel}
                        onChange={(e) => setOpenrouterModel(e.target.value)}
                        className="w-full px-4 py-2.5 bg-card/50 border border-border rounded-lg text-foreground"
                        size={8}
                      >
                        {Object.entries(groupedModels).map(([provider, models]) => (
                          <optgroup key={provider} label={provider}>
                            {models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name} ({formatPrice(model.pricing.prompt)}/输入)
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    
                    {/* 当前选择的模型信息 */}
                    {openrouterModel && (
                      <div className="p-3 bg-card/30 rounded-lg border border-border/50">
                        <p className="text-sm font-medium text-foreground">
                          当前选择: {openrouterModels.find(m => m.id === openrouterModel)?.name || openrouterModel}
                        </p>
                        <p className="text-xs text-foreground/50 mt-1">
                          模型 ID: {openrouterModel}
                        </p>
                        {openrouterModels.find(m => m.id === openrouterModel)?.description && (
                          <p className="text-xs text-foreground/50 mt-1">
                            {openrouterModels.find(m => m.id === openrouterModel)?.description}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-foreground/50">
                      共 {openrouterModels.length} 个可用模型，通过 OpenRouter 可以访问多家厂商的模型，按使用量计费
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning">
                ⚠️ 安全提示：在生产环境中，API密钥应通过环境变量配置在服务器端。
                请参考 ENV_CONFIG.md 文件进行配置。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 生成设置 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-medium text-foreground mb-4">生成设置</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">
                  默认生成字数
                </label>
                <select className="w-full px-4 py-2.5 bg-card/50 border border-border rounded-lg text-foreground">
                  <option value="500">约500字</option>
                  <option value="1000">约1000字</option>
                  <option value="2000">约2000字</option>
                  <option value="3000">约3000字</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">
                  创作温度（创意度）
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="70"
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-foreground/50 mt-1">
                  <span>保守</span>
                  <span>平衡</span>
                  <span>创意</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave}>保存设置</Button>
          {saved && (
            <span className="text-success text-sm">✓ 设置已保存</span>
          )}
        </div>
      </div>
    </main>
  );
}
