'use client';

import { useState } from 'react';

interface OutlineGeneratorProps {
  novelId: string;
  onGenerated: (outlines: unknown[], summary: unknown) => void;
  onCancel: () => void;
}

export function OutlineGenerator({ novelId, onGenerated, onCancel }: OutlineGeneratorProps) {
  const [chapterCount, setChapterCount] = useState(10);
  const [overallDirection, setOverallDirection] = useState('');
  const [specificRequirements, setSpecificRequirements] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const requirements = specificRequirements
        ? specificRequirements.split('\n').filter((r) => r.trim())
        : undefined;

      const response = await fetch(`/api/novels/${novelId}/outlines/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterCount,
          startingContext: {
            overallDirection: overallDirection || undefined,
            specificRequirements: requirements,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || '生成大纲失败');
      }

      const data = await response.json();
      onGenerated(data.outlines, data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成大纲失败');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">生成章节大纲</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 章节数量 */}
        <div>
          <label htmlFor="chapterCount" className="block text-sm font-medium text-gray-700 mb-2">
            生成章节数
          </label>
          <input
            type="number"
            id="chapterCount"
            min={1}
            max={50}
            value={chapterCount}
            onChange={(e) => setChapterCount(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">建议一次生成 10-20 章，最多 50 章</p>
        </div>

        {/* 整体创作方向 */}
        <div>
          <label htmlFor="overallDirection" className="block text-sm font-medium text-gray-700 mb-2">
            整体创作方向（可选）
          </label>
          <textarea
            id="overallDirection"
            value={overallDirection}
            onChange={(e) => setOverallDirection(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：这是一部关于成长和勇气的冒险故事，主角通过一系列挑战逐渐发现自己的使命..."
          />
        </div>

        {/* 特殊要求 */}
        <div>
          <label htmlFor="specificRequirements" className="block text-sm font-medium text-gray-700 mb-2">
            特殊要求（可选）
          </label>
          <textarea
            id="specificRequirements"
            value={specificRequirements}
            onChange={(e) => setSpecificRequirements(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="每行一个要求，例如：&#10;- 增加更多的对话场景&#10;- 突出人物内心冲突&#10;- 加入反转情节"
          />
          <p className="mt-1 text-sm text-gray-500">每行输入一个要求</p>
        </div>

        {/* 按钮 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isGenerating}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '生成中...' : '生成大纲'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isGenerating}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
