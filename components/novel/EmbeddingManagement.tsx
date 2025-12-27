'use client';

import { useState, useEffect } from 'react';

interface SearchResult {
  chapterIndex: number;
  chapterTitle: string | null;
  similarity: number;
  contentPreview: string;
}

interface ChapterEmbeddingInfo {
  id: string;
  chapterIndex: number;
  title: string | null;
  hasEmbedding: boolean;
  embeddingId: string | null;
  createdAt: string | null;
}

interface EmbeddingStatus {
  novelId: string;
  totalChapters: number;
  chaptersWithEmbeddings: number;
  chaptersWithoutEmbeddings: number;
  chapters: ChapterEmbeddingInfo[];
}

interface BatchProgress {
  current: number;
  total: number;
  currentChapterTitle: string;
  generated: number;
  skipped: number;
  failed: number;
}

interface EmbeddingManagementProps {
  novelId: string;
}

export function EmbeddingManagement({ novelId }: EmbeddingManagementProps) {
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generatingChapterId, setGeneratingChapterId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // 向量搜索相关状态
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/novels/${novelId}/embeddings`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch {
      setError('获取向量状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId]);

  const handleGenerateAll = async () => {
    if (!status || status.chaptersWithoutEmbeddings === 0) {
      setError('没有需要生成向量的章节');
      return;
    }

    setBatchGenerating(true);
    setError('');
    setSuccess('');
    setBatchProgress({
      current: 0,
      total: status.chaptersWithoutEmbeddings,
      currentChapterTitle: '准备中...',
      generated: 0,
      skipped: 0,
      failed: 0,
    });

    try {
      const response = await fetch(`/api/novels/${novelId}/embeddings/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '批量生成失败');
        return;
      }

      const data = await response.json();
      setSuccess(data.message);

      if (data.stats.errors.length > 0) {
        setError(
          `部分章节生成失败：${data.stats.errors
            .map((e: { chapterTitle: string; error: string }) => `${e.chapterTitle}: ${e.error}`)
            .join('; ')}`
        );
      }
    } catch (err) {
      setError('批量生成失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setBatchGenerating(false);
      setBatchProgress(null);
      setTimeout(() => fetchStatus(), 500);
    }
  };

  const handleDeleteAll = async () => {
    if (!status || status.chaptersWithEmbeddings === 0) {
      setError('没有向量可删除');
      return;
    }

    if (!confirm(`确定要删除所有 ${status.chaptersWithEmbeddings} 个章节的向量吗？`)) {
      return;
    }

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/novels/${novelId}/embeddings`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '删除失败');
        return;
      }

      const data = await response.json();
      setSuccess(`成功删除 ${data.deletedCount} 个向量`);
    } catch {
      setError('删除失败');
    } finally {
      setDeleting(false);
      setTimeout(() => fetchStatus(), 500);
    }
  };

  const handleGenerateChapter = async (chapterId: string, chapterTitle: string, force: boolean) => {
    setGeneratingChapterId(chapterId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '生成失败');
        return;
      }

      setSuccess(force ? `重新生成成功：${chapterTitle}` : `生成成功：${chapterTitle}`);
      setTimeout(() => fetchStatus(), 500);
    } catch (err) {
      setError('生成失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setGeneratingChapterId(null);
    }
  };

  const handleDeleteChapter = async (chapterId: string, chapterTitle: string) => {
    if (!confirm(`确定要删除 ${chapterTitle} 的向量吗？`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/embedding`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '删除失败');
        return;
      }

      setSuccess(`删除成功：${chapterTitle}`);
      setTimeout(() => fetchStatus(), 500);
    } catch {
      setError('删除失败');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('请输入搜索内容');
      return;
    }

    if (status?.chaptersWithEmbeddings === 0) {
      setError('请先生成章节向量');
      return;
    }

    setSearching(true);
    setError('');
    setSearchResults([]);

    try {
      const response = await fetch(`/api/novels/${novelId}/embeddings/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '搜索失败');
        return;
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      setSuccess(`找到 ${data.resultsCount || 0} 个相关章节`);
    } catch (err) {
      setError('搜索失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">加载失败</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">向量管理</h2>

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

      {/* 状态概览 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">总章节数：</span>
          <span className="font-semibold text-gray-900">{status.totalChapters}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">已生成向量：</span>
          <span className="font-semibold text-green-600">{status.chaptersWithEmbeddings}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">未生成向量：</span>
          <span className="font-semibold text-orange-600">{status.chaptersWithoutEmbeddings}</span>
        </div>
      </div>

      {/* 批量操作 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleGenerateAll}
          disabled={batchGenerating || generatingChapterId !== null || status.chaptersWithoutEmbeddings === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {batchGenerating ? '生成中...' : `生成所有向量 (${status.chaptersWithoutEmbeddings})`}
        </button>
        <button
          onClick={handleDeleteAll}
          disabled={deleting || batchGenerating || status.chaptersWithEmbeddings === 0}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {deleting ? '删除中...' : `删除所有向量 (${status.chaptersWithEmbeddings})`}
        </button>
      </div>

      {/* 进度条 */}
      {batchProgress && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              正在处理：{batchProgress.currentChapterTitle}
            </span>
            <span className="text-sm text-blue-700">
              已生成：{batchProgress.generated} | 跳过：{batchProgress.skipped} | 失败：{batchProgress.failed}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(batchProgress.current / batchProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 向量搜索测试 */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="text-sm font-semibold text-purple-900 mb-3">向量搜索测试</h3>
        <p className="text-xs text-gray-600 mb-3">
          测试语义搜索功能，输入与小说内容相关的文本，查看能否找到相关章节。
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="例如：主角遇到了什么困难"
            disabled={searching || status.chaptersWithEmbeddings === 0}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={searching || status.chaptersWithEmbeddings === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {searching ? '搜索中...' : '搜索'}
          </button>
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700">搜索结果：</h4>
            {searchResults.map((result, index) => (
              <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">
                      第{result.chapterIndex}章 {result.chapterTitle || '未命名'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      相似度: {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{result.contentPreview}</p>
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !searching && (
          <p className="text-xs text-gray-500 text-center">未找到相关章节</p>
        )}
      </div>

      {/* 章节列表 */}
      {status.chapters.length === 0 ? (
        <p className="text-gray-600">还没有章节</p>
      ) : (
        <div className="space-y-2">
          {status.chapters.map((chapter) => (
            <div key={chapter.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">
                    第{chapter.chapterIndex}章 {chapter.title || '未命名'}
                  </h3>
                  {chapter.hasEmbedding ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      已生成
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      未生成
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {chapter.hasEmbedding ? (
                    <>
                      <button
                        onClick={() =>
                          handleGenerateChapter(
                            chapter.id,
                            `第${chapter.chapterIndex}章`,
                            true
                          )
                        }
                        disabled={generatingChapterId === chapter.id || batchGenerating}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {generatingChapterId === chapter.id ? '处理中...' : '重新生成'}
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteChapter(
                            chapter.id,
                            `第${chapter.chapterIndex}章`
                          )
                        }
                        disabled={generatingChapterId === chapter.id || batchGenerating}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        删除
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        handleGenerateChapter(
                          chapter.id,
                          `第${chapter.chapterIndex}章`,
                          false
                        )
                      }
                      disabled={generatingChapterId === chapter.id || batchGenerating}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {generatingChapterId === chapter.id ? '处理中...' : '生成向量'}
                    </button>
                  )}
                </div>
              </div>
              {chapter.createdAt && (
                <p className="text-xs text-gray-500 mt-1">
                  创建时间：{new Date(chapter.createdAt).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
