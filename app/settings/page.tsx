'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { OpenRouterModel } from '@/lib/openrouter/types';
import { SearchableSelect } from '@/components/SearchableSelect';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // 模型相关状态
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingDefaultModel, setLoadingDefaultModel] = useState(false);
  const [modelError, setModelError] = useState<string>('');
  const [modelSuccess, setModelSuccess] = useState<string>('');

  // Embedding模型相关状态
  const [embeddingModels, setEmbeddingModels] = useState<OpenRouterModel[]>([]);
  const [loadingEmbeddingModels, setLoadingEmbeddingModels] = useState(false);
  const [defaultEmbeddingModel, setDefaultEmbeddingModel] = useState<string>('');
  const [loadingDefaultEmbeddingModel, setLoadingDefaultEmbeddingModel] = useState(false);
  const [embeddingModelError, setEmbeddingModelError] = useState<string>('');
  const [embeddingModelSuccess, setEmbeddingModelSuccess] = useState<string>('');

  // 章节摘要参数相关状态
  const [summaryTemperature, setSummaryTemperature] = useState<number | null>(null);
  const [summaryMaxTokens, setSummaryMaxTokens] = useState<number | null>(null);
  const [loadingSummaryTemperature, setLoadingSummaryTemperature] = useState(false);
  const [loadingSummaryMaxTokens, setLoadingSummaryMaxTokens] = useState(false);
  const [summaryTemperatureError, setSummaryTemperatureError] = useState<string>('');
  const [summaryTemperatureSuccess, setSummaryTemperatureSuccess] = useState<string>('');
  const [summaryMaxTokensError, setSummaryMaxTokensError] = useState<string>('');
  const [summaryMaxTokensSuccess, setSummaryMaxTokensSuccess] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchApiKeyStatus();
      fetchDefaultModel();
      fetchDefaultEmbeddingModel();
      fetchSummaryTemperature();
      fetchSummaryMaxTokens();
    }
  }, [status]);

  const fetchApiKeyStatus = async () => {
    try {
      const response = await fetch('/api/user/api-key');
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasApiKey);
      }
    } catch (err) {
      console.error('获取API Key状态失败:', err);
    }
  };

  const fetchDefaultModel = async () => {
    try {
      const response = await fetch('/api/user/default-model');
      if (response.ok) {
        const data = await response.json();
        setDefaultModel(data.defaultModel || '');
      }
    } catch (err) {
      console.error('获取默认模型失败:', err);
    }
  };

  const fetchDefaultEmbeddingModel = async () => {
    try {
      const response = await fetch('/api/user/default-embedding-model');
      if (response.ok) {
        const data = await response.json();
        setDefaultEmbeddingModel(data.defaultEmbeddingModel || '');
      }
    } catch (err) {
      console.error('获取默认Embedding模型失败:', err);
    }
  };

  const fetchSummaryTemperature = async () => {
    try {
      const response = await fetch('/api/user/summary-temperature');
      if (response.ok) {
        const data = await response.json();
        setSummaryTemperature(data.summaryTemperature ?? null);
      }
    } catch (err) {
      console.error('获取章节摘要temperature参数失败:', err);
    }
  };

  const fetchSummaryMaxTokens = async () => {
    try {
      const response = await fetch('/api/user/summary-max-tokens');
      if (response.ok) {
        const data = await response.json();
        setSummaryMaxTokens(data.summaryMaxTokens ?? null);
      }
    } catch (err) {
      console.error('获取章节摘要max_tokens参数失败:', err);
    }
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    setModelError('');
    setModelSuccess('');

    try {
      const response = await fetch('/api/openrouter/models');
      if (!response.ok) {
        const data = await response.json();
        setModelError(data.error || '获取模型列表失败');
        return;
      }

      const data = await response.json();
      setModels(data.models || []);
      setModelSuccess(`成功获取 ${data.models?.length || 0} 个可用模型`);
    } catch (err) {
      setModelError('获取模型列表失败，请稍后重试');
      console.error('获取模型列表失败:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchEmbeddingModels = async () => {
    setLoadingEmbeddingModels(true);
    setEmbeddingModelError('');

    try {
      const response = await fetch('/api/openrouter/embedding-models');
      if (!response.ok) {
        const data = await response.json();
        setEmbeddingModelError(data.error || '获取Embedding模型列表失败');
        return;
      }

      const data = await response.json();
      setEmbeddingModels(data.models || []);
      setEmbeddingModelSuccess(`成功获取 ${data.models?.length || 0} 个Embedding模型`);
    } catch (err) {
      setEmbeddingModelError('获取Embedding模型列表失败，请稍后重试');
      console.error('获取Embedding模型列表失败:', err);
    } finally {
      setLoadingEmbeddingModels(false);
    }
  };

  const handleSetDefaultModel = async () => {
    setLoadingDefaultModel(true);
    setModelError('');
    setModelSuccess('');
    
    try {
      const response = await fetch('/api/user/default-model', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultModel: defaultModel || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setModelError(data.error || '设置默认模型失败');
        return;
      }

      setModelSuccess('默认模型设置成功');
    } catch (err) {
      setModelError('设置默认模型失败，请稍后重试');
      console.error('设置默认模型失败:', err);
    } finally {
      setLoadingDefaultModel(false);
    }
  };

  const handleSetDefaultEmbeddingModel = async () => {
    setLoadingDefaultEmbeddingModel(true);
    setEmbeddingModelError('');
    setEmbeddingModelSuccess('');

    try {
      const response = await fetch('/api/user/default-embedding-model', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultEmbeddingModel: defaultEmbeddingModel || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmbeddingModelError(data.error || '设置默认Embedding模型失败');
        return;
      }

      setEmbeddingModelSuccess('默认Embedding模型设置成功');
    } catch (err) {
      setEmbeddingModelError('设置默认Embedding模型失败，请稍后重试');
      console.error('设置默认Embedding模型失败:', err);
    } finally {
      setLoadingDefaultEmbeddingModel(false);
    }
  };

  const handleSetSummaryTemperature = async () => {
    setLoadingSummaryTemperature(true);
    setSummaryTemperatureError('');
    setSummaryTemperatureSuccess('');

    try {
      const response = await fetch('/api/user/summary-temperature', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryTemperature: summaryTemperature ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSummaryTemperatureError(data.error || '设置章节摘要temperature参数失败');
        return;
      }

      setSummaryTemperatureSuccess('章节摘要temperature参数设置成功');
    } catch (err) {
      setSummaryTemperatureError('设置章节摘要temperature参数失败，请稍后重试');
      console.error('设置章节摘要temperature参数失败:', err);
    } finally {
      setLoadingSummaryTemperature(false);
    }
  };

  const handleSetSummaryMaxTokens = async () => {
    setLoadingSummaryMaxTokens(true);
    setSummaryMaxTokensError('');
    setSummaryMaxTokensSuccess('');

    try {
      const response = await fetch('/api/user/summary-max-tokens', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryMaxTokens: summaryMaxTokens ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSummaryMaxTokensError(data.error || '设置章节摘要max_tokens参数失败');
        return;
      }

      setSummaryMaxTokensSuccess('章节摘要max_tokens参数设置成功');
    } catch (err) {
      setSummaryMaxTokensError('设置章节摘要max_tokens参数失败，请稍后重试');
      console.error('设置章节摘要max_tokens参数失败:', err);
    } finally {
      setLoadingSummaryMaxTokens(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/user/api-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openRouterKey: apiKey || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '更新失败');
        return;
      }

      setSuccess('API Key更新成功');
      setHasApiKey(!!apiKey);
      setApiKey(''); // 清空输入框，不显示实际值
    } catch {
      setError('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">设置</h1>
          </div>

          <div className="px-6 py-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                OpenRouter API Key
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                配置您的OpenRouter API Key以使用AI模型服务。
                {hasApiKey && (
                  <span className="ml-2 text-green-600 font-medium">✓ 已配置</span>
                )}
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="apiKey"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    API Key
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasApiKey ? '输入新API Key以更新' : '请输入您的OpenRouter API Key'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    留空可删除现有API Key
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </form>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                默认模型设置
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                选择您默认使用的AI模型。配置API Key后可以获取可用模型列表。
              </p>

              {modelError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
                  {modelError}
                </div>
              )}

              {modelSuccess && (
                <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                  {modelSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fetchModels}
                    disabled={loadingModels || !hasApiKey}
                    className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingModels ? '加载中...' : '获取可用模型'}
                  </button>
                  {!hasApiKey && (
                    <span className="text-xs text-gray-500 self-center">
                      请先配置API Key
                    </span>
                  )}
                </div>

                {models.length > 0 && (
                  <div>
                    <label
                      htmlFor="defaultModel"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      选择默认模型
                    </label>
                    <SearchableSelect
                      options={models}
                      value={defaultModel}
                      onChange={setDefaultModel}
                      getOptionValue={(model) => model.id}
                      getOptionLabel={(model) => {
                        const name = model.name || model.id;
                        return model.description ? `${name} - ${model.description}` : name;
                      }}
                      placeholder="-- 请选择模型 -- (支持搜索)"
                      disabled={!hasApiKey}
                      className="w-full"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSetDefaultModel}
                  disabled={loadingDefaultModel || !hasApiKey}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingDefaultModel ? '保存中...' : '保存默认模型'}
                </button>

                {defaultModel && (
                  <div className="text-sm text-gray-600">
                    当前默认模型: <span className="font-medium text-gray-900">{defaultModel}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                默认Embedding模型设置
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                选择向量生成使用的Embedding模型。常见的Embedding模型包括：
                <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">openai/text-embedding-3-small</code>
                <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">openai/text-embedding-3-large</code>
              </p>

              {embeddingModelError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
                  {embeddingModelError}
                </div>
              )}

              {embeddingModelSuccess && (
                <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                  {embeddingModelSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fetchEmbeddingModels}
                    disabled={loadingEmbeddingModels || !hasApiKey}
                    className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingEmbeddingModels ? '加载中...' : '获取可用Embedding模型'}
                  </button>
                  {!hasApiKey && (
                    <span className="text-xs text-gray-500 self-center">
                      请先配置API Key
                    </span>
                  )}
                </div>

                {embeddingModels.length > 0 && (
                  <div>
                    <label
                      htmlFor="defaultEmbeddingModel"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      选择默认Embedding模型
                    </label>
                    <SearchableSelect
                      options={embeddingModels}
                      value={defaultEmbeddingModel}
                      onChange={setDefaultEmbeddingModel}
                      getOptionValue={(model) => model.id}
                      getOptionLabel={(model) => {
                        const name = model.name || model.id;
                        return model.description ? `${name} - ${model.description}` : name;
                      }}
                      placeholder="-- 请选择Embedding模型 -- (支持搜索)"
                      disabled={!hasApiKey}
                      className="w-full"
                    />
                  </div>
                )}

                {embeddingModels.length === 0 && (
                  <div className="text-sm text-gray-500">
                    请先点击上方按钮获取可用Embedding模型列表
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSetDefaultEmbeddingModel}
                  disabled={loadingDefaultEmbeddingModel || !hasApiKey}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingDefaultEmbeddingModel ? '保存中...' : '保存默认Embedding模型'}
                </button>

                {defaultEmbeddingModel && (
                  <div className="text-sm text-gray-600">
                    当前默认Embedding模型: <span className="font-medium text-gray-900">{defaultEmbeddingModel}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                章节摘要参数设置
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                配置章节摘要生成时使用的AI参数。这些参数会影响摘要生成的质量和长度。
              </p>

              <div className="space-y-6">
                {/* Temperature 设置 */}
                <div>
                  <label
                    htmlFor="summaryTemperature"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Temperature（温度参数）
                  </label>
                  <input
                    id="summaryTemperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={summaryTemperature ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSummaryTemperature(value === '' ? null : parseFloat(value));
                    }}
                    placeholder="0.3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    控制输出的随机性。范围：0-2。默认值：0.3。较低的值使输出更确定，较高的值使输出更随机。
                  </p>

                  {summaryTemperatureError && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
                      {summaryTemperatureError}
                    </div>
                  )}

                  {summaryTemperatureSuccess && (
                    <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                      {summaryTemperatureSuccess}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSetSummaryTemperature}
                    disabled={loadingSummaryTemperature}
                    className="mt-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingSummaryTemperature ? '保存中...' : '保存Temperature设置'}
                  </button>

                  {summaryTemperature !== null && (
                    <div className="mt-2 text-sm text-gray-600">
                      当前Temperature: <span className="font-medium text-gray-900">{summaryTemperature}</span>
                    </div>
                  )}
                </div>

                {/* Max Tokens 设置 */}
                <div>
                  <label
                    htmlFor="summaryMaxTokens"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Max Tokens（最大令牌数）
                  </label>
                  <input
                    id="summaryMaxTokens"
                    type="number"
                    min="100"
                    max="10000"
                    value={summaryMaxTokens ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSummaryMaxTokens(value === '' ? null : parseInt(value, 10));
                    }}
                    placeholder="2000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    控制生成摘要的最大长度。范围：100-10000。默认值：2000。较大的值允许生成更长的摘要。
                  </p>

                  {summaryMaxTokensError && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
                      {summaryMaxTokensError}
                    </div>
                  )}

                  {summaryMaxTokensSuccess && (
                    <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                      {summaryMaxTokensSuccess}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSetSummaryMaxTokens}
                    disabled={loadingSummaryMaxTokens}
                    className="mt-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingSummaryMaxTokens ? '保存中...' : '保存Max Tokens设置'}
                  </button>

                  {summaryMaxTokens !== null && (
                    <div className="mt-2 text-sm text-gray-600">
                      当前Max Tokens: <span className="font-medium text-gray-900">{summaryMaxTokens}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                账户信息
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">用户名：</span>
                  <span className="text-gray-900 font-medium">{session?.user?.name}</span>
                </div>
                {session?.user?.email && (
                  <div>
                    <span className="text-gray-600">邮箱：</span>
                    <span className="text-gray-900 font-medium">{session.user.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

