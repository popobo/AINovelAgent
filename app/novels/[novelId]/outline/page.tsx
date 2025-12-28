'use client';

import { useState } from 'react';
import { OutlineGenerator } from '@/components/outline/OutlineGenerator';
import { OutlineList } from '@/components/outline/OutlineList';
import { useRouter } from 'next/navigation';

type View = 'list' | 'generate';

export default function OutlinePage({ params }: { params: Promise<{ novelId: string }> }) {
  const router = useRouter();
  const [novelId, setNovelId] = useState<string | null>(null);
  const [view, setView] = useState<View>('list');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED'>('ALL');

  // 当 params 解析后设置 novelId
  Promise.resolve(params).then((resolved) => {
    if (!novelId) setNovelId(resolved.novelId);
  });

  if (!novelId) {
    return <div className="p-8">加载中...</div>;
  }

  const handleGenerated = () => {
    setView('list');
    window.location.reload(); // 简单刷新，实际应该使用状态管理
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">章节大纲管理</h1>
            <button
              onClick={() => router.push(`/novels/${novelId}`)}
              className="text-gray-600 hover:text-gray-800"
            >
              返回小说详情
            </button>
          </div>

          {/* 工具栏 */}
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-md ${
                  view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                大纲列表
              </button>
              <button
                onClick={() => setView('generate')}
                className={`px-4 py-2 rounded-md ${
                  view === 'generate' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                生成大纲
              </button>
            </div>

            {/* 筛选器 */}
            {view === 'list' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setFilter('PENDING')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'PENDING' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  待处理
                </button>
                <button
                  onClick={() => setFilter('APPROVED')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'APPROVED' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  已批准
                </button>
                <button
                  onClick={() => setFilter('COMPLETED')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  已完成
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        {view === 'generate' ? (
          <OutlineGenerator novelId={novelId} onGenerated={handleGenerated} onCancel={() => setView('list')} />
        ) : (
          <OutlineList novelId={novelId} filter={filter} onRefresh={() => window.location.reload()} />
        )}
      </div>
    </div>
  );
}
