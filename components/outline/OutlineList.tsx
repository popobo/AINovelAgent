'use client';

import { useState, useEffect } from 'react';
import { OutlineCard } from './OutlineCard';

interface Outline {
  id: string;
  chapterIndex: number;
  title: string;
  plotSummary: string;
  characterGoals?: Array<{ character: string; goal: string }>;
  conflicts?: { internal?: string[]; external?: string[] };
  emotionalArc?: string;
  keyScenes?: Array<{ description: string; position: string }>;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'SKIPPED';
  version: number;
  notes?: string;
}

interface OutlineListProps {
  novelId: string;
  filter?: 'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED';
  onRefresh: () => void;
}

export function OutlineList({ novelId, filter = 'ALL', onRefresh }: OutlineListProps) {
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchOutlines = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/novels/${novelId}/outlines${filter !== 'ALL' ? `?status=${filter}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('获取大纲列表失败');
      }

      const data = await response.json();
      setOutlines(data.outlines);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取大纲列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlines();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelId, filter]);

  const handleSelect = (outlineId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(outlineId)) {
      newSelected.delete(outlineId);
    } else {
      newSelected.add(outlineId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === outlines.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(outlines.map((o) => o.id)));
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`确认批准选中的 ${selectedIds.size} 个大纲吗？`)) return;

    try {
      const response = await fetch(`/api/novels/${novelId}/outlines/batch?operation=approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlineIds: Array.from(selectedIds) }),
      });

      if (!response.ok) throw new Error('批量批准失败');

      setSelectedIds(new Set());
      fetchOutlines();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '批量批准失败');
    }
  };

  const handleBatchSkip = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`确认跳过选中的 ${selectedIds.size} 个大纲吗？`)) return;

    try {
      const response = await fetch(`/api/novels/${novelId}/outlines/batch?operation=skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlineIds: Array.from(selectedIds) }),
      });

      if (!response.ok) throw new Error('批量跳过失败');

      setSelectedIds(new Set());
      fetchOutlines();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '批量跳过失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    if (
      !confirm(
        `确认删除选中的 ${selectedIds.size} 个大纲吗？\n${outlines.filter((o) => selectedIds.has(o.id) && o.status === 'COMPLETED').length > 0 ? '注意：包含已完成的章节，将同时删除这些章节！' : ''}`
      )
    )
      return;

    try {
      const response = await fetch(`/api/novels/${novelId}/outlines/batch?operation=delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlineIds: Array.from(selectedIds) }),
      });

      if (!response.ok) throw new Error('批量删除失败');

      setSelectedIds(new Set());
      fetchOutlines();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '批量删除失败');
    }
  };

  const handleEdit = (outlineId: string) => {
    // TODO: 打开编辑弹窗
    alert('编辑功能：' + outlineId);
  };

  const handleApprove = async (outlineId: string) => {
    try {
      const response = await fetch(`/api/novels/${novelId}/outlines/${outlineId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('批准失败');

      fetchOutlines();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '批准失败');
    }
  };

  const handleSkip = async (outlineId: string) => {
    try {
      const response = await fetch(`/api/novels/${novelId}/outlines/batch?operation=skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlineIds: [outlineId] }),
      });

      if (!response.ok) throw new Error('跳过失败');

      fetchOutlines();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '跳过失败');
    }
  };

  const handleDelete = async (outlineId: string) => {
    try {
      const response = await fetch(`/api/novels/${novelId}/outlines/${outlineId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      fetchOutlines();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleGenerateChapter = async (outlineId: string) => {
    try {
      console.log('生成章节，outlineId:', outlineId);

      const response = await fetch(`/api/novels/${novelId}/outlines/${outlineId}/generate-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('响应状态:', response.status);

      if (!response.ok) {
        const data = await response.json();
        console.error('生成章节失败:', data);
        throw new Error(data.error || data.message || '生成章节失败');
      }

      const data = await response.json();
      console.log('生成章节成功:', data);
      alert(data.message);
      fetchOutlines();
      onRefresh();
    } catch (err) {
      console.error('生成章节错误:', err);
      alert(err instanceof Error ? err.message : '生成章节失败');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button onClick={fetchOutlines} className="mt-2 text-sm text-red-600 underline">
          重试
        </button>
      </div>
    );
  }

  if (outlines.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">暂无大纲</p>
        <p className="text-sm text-gray-400 mt-1">请先生成章节大纲</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-blue-800">已选择 {selectedIds.size} 个大纲</span>
          <div className="flex gap-2">
            <button
              onClick={handleBatchApprove}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              批量批准
            </button>
            <button
              onClick={handleBatchSkip}
              className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            >
              批量跳过
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              批量删除
            </button>
          </div>
        </div>
      )}

      {/* 全选按钮 */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.size === outlines.length && outlines.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">全选</span>
        </label>
        <span className="text-sm text-gray-500">共 {outlines.length} 个大纲</span>
      </div>

      {/* 大纲卡片列表 */}
      {outlines.map((outline) => (
        <div key={outline.id} className="flex gap-4">
          <input
            type="checkbox"
            checked={selectedIds.has(outline.id)}
            onChange={() => handleSelect(outline.id)}
            className="mt-4 w-4 h-4 text-blue-600 rounded"
          />
          <div className="flex-1">
            <OutlineCard
              outline={outline}
              onEdit={handleEdit}
              onApprove={handleApprove}
              onSkip={handleSkip}
              onDelete={handleDelete}
              onGenerateChapter={handleGenerateChapter}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
