'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Novel {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function NovelsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNovels();
    }
  }, [status]);

  const fetchNovels = async () => {
    try {
      const response = await fetch('/api/novels');
      if (response.ok) {
        const data = await response.json();
        setNovels(data.novels || []);
      } else {
        setError('获取小说列表失败');
      }
    } catch {
      setError('获取小说列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (novelId: string) => {
    if (!confirmDeleteId) {
      setConfirmDeleteId(novelId);
      return;
    }

    setDeletingId(novelId);
    setError('');

    try {
      const response = await fetch(`/api/novels/${novelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 删除成功，刷新列表
        await fetchNovels();
        setConfirmDeleteId(null);
      } else {
        const data = await response.json();
        setError(data.error || '删除失败');
      }
    } catch {
      setError('删除失败');
    } finally {
      setDeletingId(null);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">我的小说</h1>
          <Link
            href="/novels/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            上传新小说
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {novels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">还没有小说，开始上传第一本吧！</p>
            <Link
              href="/novels/upload"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              上传小说
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {novels.map((novel) => (
              <div
                key={novel.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 relative group"
              >
                <Link href={`/novels/${novel.id}`} className="block">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{novel.title}</h2>
                  {novel.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{novel.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    更新于 {new Date(novel.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                </Link>
                
                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(novel.id);
                  }}
                  disabled={deletingId === novel.id}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="删除小说"
                >
                  {deletingId === novel.id ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>

                {/* 确认删除对话框 */}
                {confirmDeleteId === novel.id && (
                  <div className="absolute inset-0 bg-white rounded-lg p-6 border-2 border-red-300 z-10 flex flex-col justify-center">
                    <p className="text-gray-800 mb-4 text-center">确定要删除《{novel.title}》吗？</p>
                    <p className="text-sm text-gray-500 mb-4 text-center">此操作无法撤销</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(novel.id);
                        }}
                        disabled={deletingId === novel.id}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === novel.id ? '删除中...' : '确认删除'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        disabled={deletingId === novel.id}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

