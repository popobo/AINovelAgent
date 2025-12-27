'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// 默认提示词
const defaultPrompts = [
  '继续推进当前剧情，让主角面临新的挑战',
  '展开新的情节线索，引入新的角色或事件',
  '深化人物关系，展现角色内心世界',
  '设置悬念，为后续剧情埋下伏笔',
  '描述场景细节，营造氛围',
];

export default function ContinueNovelPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const novelId = params.novelId as string;

  const [prompt, setPrompt] = useState('');
  const [strategy, setStrategy] = useState<'SUMMARY' | 'RAG' | 'HYBRID'>('HYBRID');
  const [model, setModel] = useState('openai/gpt-4o');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [continuationId, setContinuationId] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>(defaultPrompts);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchModels();
      fetchUserDefaultModel();
    }
  }, [status, router]);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/openrouter/models');
      if (response.ok) {
        const data = await response.json();
        const modelIds = data.models?.map((m: { id: string }) => m.id) || [];
        setAvailableModels(modelIds);
      }
    } catch (err) {
      console.error('获取模型列表失败:', err);
    }
  };

  const fetchUserDefaultModel = async () => {
    try {
      const response = await fetch('/api/user/default-model');
      if (response.ok) {
        const data = await response.json();
        if (data.defaultModel) {
          setModel(data.defaultModel);
        }
      }
    } catch (err) {
      console.error('获取用户默认模型失败:', err);
    }
  };

  const handleContinue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setResult('');
    setLoading(true);

    try {
      const response = await fetch(`/api/novels/${novelId}/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          strategy,
          model,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '续写失败');
        return;
      }

      setResult(data.continuation.result);
      setContinuationId(data.continuation.id);
    } catch {
      setError('续写失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrompts = async () => {
    setGeneratingPrompts(true);
    setError('');

    try {
      const response = await fetch(`/api/novels/${novelId}/continue/generate-prompt`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        // 如果生成失败，使用默认提示词
        console.warn('生成提示词失败，使用默认提示词:', data.error);
        setSuggestedPrompts(defaultPrompts);
        return;
      }

      if (data.prompts && data.prompts.length > 0) {
        setSuggestedPrompts(data.prompts);
      } else {
        setSuggestedPrompts(defaultPrompts);
      }
    } catch (err) {
      console.error('生成提示词错误:', err);
      // 如果出错，使用默认提示词
      setSuggestedPrompts(defaultPrompts);
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const handleSelectPrompt = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
  };

  const handleSave = async (saveType: 'APPEND' | 'NEW_VERSION', chapterId?: string) => {
    if (!continuationId) {
      setError('请先进行续写');
      return;
    }

    try {
      const response = await fetch(`/api/novels/${novelId}/continue/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          continuationId,
          saveType,
          chapterId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '保存失败');
        return;
      }

      router.push(`/novels/${novelId}`);
    } catch {
      setError('保存失败，请稍后重试');
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/novels/${novelId}`}
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← 返回小说详情
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">续写小说</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <label htmlFor="strategy" className="block text-sm font-medium text-gray-700 mb-2">
                续写策略
              </label>
              <select
                id="strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as 'SUMMARY' | 'RAG' | 'HYBRID')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SUMMARY">摘要方案（基于全局摘要和最近章节）</option>
                <option value="RAG">RAG方案（基于向量检索的相关章节）</option>
                <option value="HYBRID">混合方案（RAG + 摘要 + 关键信息）</option>
              </select>
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                模型
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                ) : (
                  <option value="openai/gpt-4o">openai/gpt-4o</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                续写提示词
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                required
                placeholder="请输入续写提示词，例如：主角遇到了新的挑战..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePrompts}
                  disabled={generatingPrompts || loading}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {generatingPrompts ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      生成中...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      自动生成提示词
                    </>
                  )}
                </button>
              </div>
            </div>

            {suggestedPrompts.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">提示词建议：</h3>
                <div className="space-y-2">
                  {suggestedPrompts.map((suggestedPrompt, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectPrompt(suggestedPrompt)}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {suggestedPrompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '续写中...' : '开始续写'}
            </button>
          </form>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">续写结果</h2>
            <div className="prose max-w-none mb-6">
              <div className="whitespace-pre-wrap text-gray-800">{result}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSave('NEW_VERSION')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                保存为新章节
              </button>
              <button
                onClick={() => {
                  const chapterId = window.prompt('请输入要追加的章节ID（留空将追加到最后一章）');
                  if (chapterId) {
                    handleSave('APPEND', chapterId);
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                追加到现有章节
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

