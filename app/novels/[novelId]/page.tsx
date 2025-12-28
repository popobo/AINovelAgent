'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChapterSummaryDisplay } from '@/components/novel/ChapterSummaryDisplay';

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

interface Chapter {
  id: string;
  chapterIndex: number;
  title: string | null;
  wordCount: number | null;
  summary: string | null;
  summaryData: ChapterSummaryData | null;
}

interface Novel {
  id: string;
  title: string;
  description: string | null;
  chapters: Chapter[];
}

export default function NovelDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const novelId = params.novelId as string;

  const [novel, setNovel] = useState<Novel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [chaptersPerGroup, setChaptersPerGroup] = useState<string>('3');
  const [merging, setMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && novelId) {
      const fetchNovel = async () => {
        try {
          const response = await fetch(`/api/novels/${novelId}`);
          if (response.ok) {
            const data = await response.json();
            setNovel(data.novel);
          } else {
            const errorData = await response.json();
            setError(errorData.error || '获取小说详情失败');
          }
        } catch {
          setError('获取小说详情失败');
        } finally {
          setLoading(false);
        }
      };
      fetchNovel();
    }
  }, [status, novelId]);

  const handleMergeChapters = async () => {
    const n = parseInt(chaptersPerGroup, 10);
    if (isNaN(n) || n < 2) {
      setError('请输入大于等于2的有效数字');
      return;
    }

    if (!novel || novel.chapters.length < n) {
      setError(`章节数量（${novel?.chapters.length || 0}）少于合并数量（${n}）`);
      return;
    }

    // 确认提示
    const confirmed = window.confirm(
      `确定要将每${n}个章节合并为一个大章吗？此操作不可逆，将删除原有章节及其摘要。`
    );
    if (!confirmed) {
      return;
    }

    setMerging(true);
    setError('');
    setMergeSuccess('');

    try {
      const response = await fetch(`/api/novels/${novelId}/chapters/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chaptersPerGroup: n }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '章节合并失败');
        return;
      }

      const data = await response.json();
      setMergeSuccess(
        `合并成功！原${data.result.originalChapterCount}章合并为${data.result.mergedChapterCount}章`
      );

      // 刷新章节列表
      setTimeout(() => {
        const fetchNovel = async () => {
          try {
            const response = await fetch(`/api/novels/${novelId}`);
            if (response.ok) {
              const data = await response.json();
              setNovel(data.novel);
            }
          } catch {
            // 忽略错误，用户可以看到成功消息
          }
        };
        fetchNovel();
      }, 500);
    } catch (err) {
      setError('章节合并失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setMerging(false);
    }
  };

  // 计算合并后的章节数量预览
  const getMergedChapterCount = (): number | null => {
    if (!novel || novel.chapters.length === 0) return null;
    const n = parseInt(chaptersPerGroup, 10);
    if (isNaN(n) || n < 2) return null;
    return Math.ceil(novel.chapters.length / n);
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

  if (error || !novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '小说不存在'}</p>
          <Link
            href="/novels"
            className="text-blue-600 hover:text-blue-700"
          >
            返回小说列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/novels"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← 返回小说列表
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{novel.title}</h1>
          {novel.description && (
            <p className="text-gray-600 mt-2">{novel.description}</p>
          )}
        </div>

        {/* 章节合并功能 */}
        {novel.chapters.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">章节合并</h2>
            <p className="text-sm text-gray-600 mb-4">
              将每N个章节合并为一个大章，适用于章节字数较少的情况，可提高后续生成摘要的效率。
            </p>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
                {error}
              </div>
            )}
            {mergeSuccess && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
                {mergeSuccess}
              </div>
            )}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label
                  htmlFor="chaptersPerGroup"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  每N个章节合并（N值）
                </label>
                <input
                  id="chaptersPerGroup"
                  type="number"
                  min="2"
                  value={chaptersPerGroup}
                  onChange={(e) => setChaptersPerGroup(e.target.value)}
                  placeholder="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={merging}
                />
                {getMergedChapterCount() !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    合并后将有约 {getMergedChapterCount()} 个章节
                  </p>
                )}
              </div>
              <button
                onClick={handleMergeChapters}
                disabled={merging || !novel || novel.chapters.length < 2}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {merging ? '合并中...' : '合并章节'}
              </button>
            </div>
            <p className="mt-3 text-xs text-yellow-600">
              ⚠️ 注意：合并操作不可逆，将删除原有章节及其摘要数据。合并后可在摘要管理界面为新章节生成摘要。
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">章节列表</h2>
            <div className="flex gap-2">
              <Link
                href={`/novels/${novelId}/outline`}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                大纲管理
              </Link>
              <Link
                href={`/novels/${novelId}/summaries`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                摘要管理
              </Link>
              <Link
                href={`/novels/${novelId}/embeddings`}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                向量管理
              </Link>
            </div>
          </div>

          {novel.chapters.length === 0 ? (
            <p className="text-gray-600">还没有章节</p>
          ) : (
            <div className="space-y-4">
              {novel.chapters.map((chapter) => {
                // 优先使用 Summary 表的 content，如果没有则使用 Chapter 表的 summary
                const displaySummary = chapter.summaryData?.content || chapter.summary;
                const metadata = chapter.summaryData?.metadata;

                return (
                  <div
                    key={chapter.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          第{chapter.chapterIndex}章 {chapter.title || '未命名'}
                        </h3>

                        <ChapterSummaryDisplay
                          summary={displaySummary}
                          metadata={metadata ?? null}
                          wordCount={chapter.wordCount}
                        />
                      </div>
                      <Link
                        href={`/novels/${novelId}/chapters/${chapter.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm ml-4 whitespace-nowrap"
                      >
                        查看
                      </Link>
                    </div>
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

