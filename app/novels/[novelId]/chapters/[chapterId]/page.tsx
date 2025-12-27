'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Chapter {
  id: string;
  chapterIndex: number;
  title: string | null;
  content: string;
  wordCount: number | null;
  summary: string | null;
}

export default function ChapterDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const novelId = params.novelId as string;
  const chapterId = params.chapterId as string;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && novelId && chapterId) {
      fetchChapter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, novelId, chapterId]);

  const fetchChapter = async () => {
    try {
      const response = await fetch(`/api/novels/${novelId}/chapters/${chapterId}`);
      if (response.ok) {
        const data = await response.json();
        setChapter(data.chapter);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '获取章节详情失败');
      }
    } catch {
      setError('获取章节详情失败');
    } finally {
      setLoading(false);
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

  if (error || !chapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '章节不存在'}</p>
          <Link
            href={`/novels/${novelId}`}
            className="text-blue-600 hover:text-blue-700"
          >
            返回章节列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/novels/${novelId}`}
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← 返回章节列表
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            第{chapter.chapterIndex}章 {chapter.title || '未命名'}
          </h1>
          {chapter.wordCount && (
            <p className="text-sm text-gray-500 mt-2">
              字数：{chapter.wordCount}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {chapter.content}
            </div>
          </div>
        </div>

        {chapter.summary && (
          <div className="bg-blue-50 rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">章节摘要</h2>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {chapter.summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

