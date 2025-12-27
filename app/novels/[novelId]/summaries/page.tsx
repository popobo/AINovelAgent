'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChapterSummaryDisplay } from '@/components/novel/ChapterSummaryDisplay';
import { GlobalSummaryDisplay } from '@/components/novel/GlobalSummaryDisplay';

interface ChapterSummaryMetadata {
  // 旧字段（保持兼容）
  coreEvents?: string[];
  characterActivities?: string;
  keyInformation?: string;
  emotionalClues?: string;
  // 新字段
  newAnalysis?: {
    core_events?: Array<{event: string, details: string}>;
    characters?: Array<{name: string, personality: string, description: string}>;
    sex_scenes?: Array<{type: string, details: string}>;
    text_features?: {style: string, intensity: string};
  };
}

interface ChapterSummaryData {
  content: string;
  metadata: ChapterSummaryMetadata | null;
}

interface ChapterSummary {
  id: string;
  chapterIndex: number;
  title: string | null;
  summary: string | null;
  hasSummary: boolean;
  wordCount: number | null;
  summaryData: ChapterSummaryData | null;
}

export default function SummariesPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const novelId = params.novelId as string;

  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [globalSummary, setGlobalSummary] = useState<{
    content: string | null;
    metadata: Record<string, unknown> | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generatingChapterId, setGeneratingChapterId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [maxContextLength, setMaxContextLength] = useState<number | null>(32000);
  const [savingContextLength, setSavingContextLength] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentChapterTitle: string;
  } | null>(null);

  const fetchSummaries = useCallback(async () => {
    try {
      const novelResponse = await fetch(`/api/novels/${novelId}`);
      if (novelResponse.ok) {
        const novelData = await novelResponse.json();
        interface ChapterData {
          id: string;
          chapterIndex: number;
          title: string | null;
          summary: string | null;
          wordCount: number | null;
          summaryData: ChapterSummaryData | null;
        }
        const chaptersData = novelData.novel.chapters.map((ch: ChapterData) => ({
          id: ch.id,
          chapterIndex: ch.chapterIndex,
          title: ch.title,
          summary: ch.summary,
          hasSummary: !!(ch.summaryData?.content || ch.summary),
          wordCount: ch.wordCount,
          summaryData: ch.summaryData || null,
        }));
        setChapters(chaptersData);
        // 设置上下文长度配置
        setMaxContextLength(novelData.novel.maxContextLength ?? 32000);
      }

      const globalResponse = await fetch(`/api/novels/${novelId}/summaries/global/update`);
      if (globalResponse.ok) {
        const globalData = await globalResponse.json();
        if (globalData.summary) {
          setGlobalSummary({
            content: globalData.summary.content || null,
            metadata: globalData.summary.metadata || null,
          });
        } else {
          setGlobalSummary(null);
        }
      }
    } catch {
      setError('获取摘要失败');
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchSummaries();
    }
  }, [status, router, fetchSummaries]);

  const generateChapterSummary = async (chapterId: string, isRegenerate: boolean = false) => {
    try {
      setGeneratingChapterId(chapterId);
      setError('');
      setSuccess('');
      
      const response = await fetch(`/api/novels/${novelId}/summaries/chapters/${chapterId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 不传递 model，让后端使用用户配置的默认模型
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '生成章节摘要失败');
        return;
      }

      setSuccess(isRegenerate ? '章节摘要重新生成成功' : '章节摘要生成成功');
      // 延迟一下再刷新，确保数据库已更新
      setTimeout(() => {
        fetchSummaries();
      }, 500);
    } catch (error) {
      setError('生成章节摘要失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setGeneratingChapterId(null);
    }
  };

  // 判断摘要是否可能是原始内容片段（超过1000字或包含大量原始文本特征）
  const isLikelyRawContent = (
    summary: string | null,
    summaryData: ChapterSummaryData | null,
    wordCount: number | null
  ): boolean => {
    const displaySummary = summaryData?.content || summary;
    if (!displaySummary) return false;
    // 如果摘要长度接近章节字数，可能是原始内容
    if (wordCount && displaySummary.length > wordCount * 0.8) return true;
    // 如果摘要超过1000字，可能是原始内容
    if (displaySummary.length > 1000) return true;
    return false;
  };

  const updateGlobalSummary = async () => {
    try {
      setUpdating(true);
      setError('');
      setSuccess('');
      const response = await fetch(`/api/novels/${novelId}/summaries/global/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 不传递 model，让后端使用用户配置的默认模型
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '更新全局摘要失败');
        return;
      }

      setSuccess('全局摘要更新成功');
      fetchSummaries();
    } catch {
      setError('更新全局摘要失败');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateMaxContextLength = async () => {
    try {
      setSavingContextLength(true);
      setError('');
      setSuccess('');
      
      const response = await fetch(`/api/novels/${novelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxContextLength: maxContextLength,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '更新上下文长度配置失败');
        return;
      }

      setSuccess('上下文长度配置更新成功');
    } catch {
      setError('更新上下文长度配置失败');
    } finally {
      setSavingContextLength(false);
    }
  };

  const generateAllChapterSummaries = async () => {
    if (chapters.length === 0) {
      setError('没有章节需要生成摘要');
      return;
    }

    // 按章节索引排序
    const sortedChapters = [...chapters].sort((a, b) => a.chapterIndex - b.chapterIndex);
    
    setBatchGenerating(true);
    setError('');
    setSuccess('');
    setBatchProgress({
      current: 0,
      total: sortedChapters.length,
      currentChapterTitle: '',
    });

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < sortedChapters.length; i++) {
      const chapter = sortedChapters[i];
      const chapterTitle = `第${chapter.chapterIndex}章 ${chapter.title || '未命名'}`;
      
      setBatchProgress({
        current: i + 1,
        total: sortedChapters.length,
        currentChapterTitle: chapterTitle,
      });
      setGeneratingChapterId(chapter.id);

      try {
        const response = await fetch(`/api/novels/${novelId}/summaries/chapters/${chapter.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = `${chapterTitle}: ${errorData.error || '生成失败'}`;
          errors.push(errorMsg);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        const errorMsg = `${chapterTitle}: ${err instanceof Error ? err.message : '未知错误'}`;
        errors.push(errorMsg);
        failCount++;
      }

      // 每生成一个章节后，刷新一下数据，确保后续章节能看到之前的摘要
      if (i < sortedChapters.length - 1) {
        await fetchSummaries();
        // 短暂延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setGeneratingChapterId(null);
    setBatchGenerating(false);
    setBatchProgress(null);

    // 刷新数据以显示最新结果
    await fetchSummaries();

    // 显示结果
    if (failCount === 0) {
      setSuccess(`成功生成所有 ${successCount} 个章节的摘要`);
    } else if (successCount === 0) {
      setError(`所有章节摘要生成失败。错误详情：${errors.join('; ')}`);
    } else {
      setSuccess(`批量生成完成：成功 ${successCount} 个，失败 ${failCount} 个`);
      if (errors.length > 0) {
        setError(`部分章节生成失败：${errors.join('; ')}`);
      }
    }
  };

  if (status === 'loading' || loading) {
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/novels/${novelId}`}
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← 返回小说详情
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">摘要管理</h1>
        </div>

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

        {/* 上下文长度配置 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">上下文长度配置</h2>
          <p className="text-sm text-gray-600 mb-4">
            设置章节摘要生成时使用的最大上下文长度（字符数）。当章节内容超过此值的3倍时，系统会自动分段处理。
          </p>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label
                htmlFor="maxContextLength"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                最大上下文长度
              </label>
              <input
                id="maxContextLength"
                type="number"
                value={maxContextLength ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setMaxContextLength(value === '' ? null : parseInt(value, 10));
                }}
                placeholder="32000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                留空将使用默认值 32000。建议值：8000（8K模型）、16000（16K模型）、32000（32K模型）、128000（128K模型）
              </p>
            </div>
            <button
              onClick={handleUpdateMaxContextLength}
              disabled={savingContextLength}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {savingContextLength ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>

        {/* 全局摘要 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">全局摘要</h2>
            <button
              onClick={updateGlobalSummary}
              disabled={updating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updating ? '更新中...' : '更新全局摘要'}
            </button>
          </div>
          {globalSummary ? (
            <GlobalSummaryDisplay
              content={globalSummary.content}
              metadata={globalSummary.metadata}
            />
          ) : (
            <p className="text-gray-600">还没有全局摘要，点击&ldquo;更新全局摘要&rdquo;生成</p>
          )}
        </div>

        {/* 章节摘要列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">章节摘要</h2>
            {chapters.length > 0 && (
              <button
                onClick={generateAllChapterSummaries}
                disabled={batchGenerating || generatingChapterId !== null}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {batchGenerating ? '批量生成中...' : '批量生成所有章节摘要'}
              </button>
            )}
          </div>
          
          {batchProgress && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  正在生成：{batchProgress.currentChapterTitle}
                </span>
                <span className="text-sm text-blue-700">
                  {batchProgress.current} / {batchProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {chapters.length === 0 ? (
            <p className="text-gray-600">还没有章节</p>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter) => {
                // 优先使用 Summary 表的 content，如果没有则使用 Chapter 表的 summary
                const displaySummary = chapter.summaryData?.content || chapter.summary;
                const metadata = chapter.summaryData?.metadata;

                return (
                  <div
                    key={chapter.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">
                        第{chapter.chapterIndex}章 {chapter.title || '未命名'}
                      </h3>
                      <div className="flex gap-2">
                        {chapter.hasSummary &&
                          isLikelyRawContent(
                            chapter.summary,
                            chapter.summaryData,
                            chapter.wordCount
                          ) && (
                            <button
                              onClick={() => generateChapterSummary(chapter.id, true)}
                              disabled={generatingChapterId === chapter.id || batchGenerating}
                              className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {generatingChapterId === chapter.id
                                ? '生成中...'
                                : '重新生成摘要'}
                            </button>
                          )}
                        {!chapter.hasSummary && (
                          <button
                            onClick={() => generateChapterSummary(chapter.id, false)}
                            disabled={generatingChapterId === chapter.id || batchGenerating}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {generatingChapterId === chapter.id ? '生成中...' : '生成摘要'}
                          </button>
                        )}
                        {chapter.hasSummary &&
                          !isLikelyRawContent(
                            chapter.summary,
                            chapter.summaryData,
                            chapter.wordCount
                          ) && (
                            <button
                              onClick={() => generateChapterSummary(chapter.id, true)}
                              disabled={generatingChapterId === chapter.id || batchGenerating}
                              className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {generatingChapterId === chapter.id ? '生成中...' : '重新生成'}
                            </button>
                          )}
                      </div>
                    </div>
                    {displaySummary ? (
                      <>
                        <ChapterSummaryDisplay
                          summary={displaySummary}
                          metadata={metadata ?? null}
                          wordCount={chapter.wordCount}
                        />
                        {isLikelyRawContent(
                          chapter.summary,
                          chapter.summaryData,
                          chapter.wordCount
                        ) && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            ⚠️
                            检测到此摘要可能是原始内容片段，建议点击&ldquo;重新生成摘要&rdquo;按钮生成真正的摘要。
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">还没有摘要</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

