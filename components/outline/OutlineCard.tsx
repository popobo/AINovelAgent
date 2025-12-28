'use client';

import { useState } from 'react';

interface OutlineCardProps {
  outline: {
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
  };
  onEdit: (outlineId: string) => void;
  onApprove: (outlineId: string) => void;
  onSkip: (outlineId: string) => void;
  onDelete: (outlineId: string) => void;
  onGenerateChapter: (outlineId: string) => void;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  PENDING: '待处理',
  APPROVED: '已批准',
  COMPLETED: '已完成',
  SKIPPED: '已跳过',
};

export function OutlineCard({
  outline,
  onEdit,
  onApprove,
  onSkip,
  onDelete,
  onGenerateChapter,
}: OutlineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApprove = () => {
    if (confirm(`确认批准第${outline.chapterIndex}章大纲吗？`)) {
      onApprove(outline.id);
    }
  };

  const handleSkip = () => {
    if (confirm(`确认跳过第${outline.chapterIndex}章大纲吗？`)) {
      onSkip(outline.id);
    }
  };

  const handleDelete = () => {
    if (
      confirm(`确认删除第${outline.chapterIndex}章大纲吗？${outline.status === 'COMPLETED' ? '\n这将同时删除已生成的章节！' : ''}`
    )
    ) {
      onDelete(outline.id);
    }
  };

  const handleGenerateChapter = () => {
    if (confirm(`确认根据第${outline.chapterIndex}章大纲生成章节内容吗？\n这将消耗 API 配额。`)) {
      onGenerateChapter(outline.id);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      {/* 头部：章节号和标题 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">第{outline.chapterIndex}章</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[outline.status]}`}>
              {statusLabels[outline.status]}
            </span>
            {outline.version > 1 && (
              <span className="text-xs text-gray-500">v{outline.version}</span>
            )}
          </div>
          <p className="text-md font-medium mt-1">{outline.title}</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '收起' : '展开'}
        </button>
      </div>

      {/* 展开的详细内容 */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {/* 剧情摘要 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">剧情摘要</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{outline.plotSummary}</p>
          </div>

          {/* 人物目标 */}
          {outline.characterGoals && outline.characterGoals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">人物目标</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {outline.characterGoals.map((goal, idx) => (
                  <li key={idx}>
                    <strong>{goal.character}</strong>: {goal.goal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 冲突设定 */}
          {outline.conflicts && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">冲突设定</h4>
              {outline.conflicts.internal && outline.conflicts.internal.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500">内部冲突：</p>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {outline.conflicts.internal.map((conflict, idx) => (
                      <li key={idx}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              )}
              {outline.conflicts.external && outline.conflicts.external.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500">外部冲突：</p>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {outline.conflicts.external.map((conflict, idx) => (
                      <li key={idx}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 情感弧线 */}
          {outline.emotionalArc && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">情感弧线</h4>
              <p className="text-sm text-gray-600">{outline.emotionalArc}</p>
            </div>
          )}

          {/* 关键场景 */}
          {outline.keyScenes && outline.keyScenes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">关键场景</h4>
              <div className="space-y-2">
                {outline.keyScenes.map((scene, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium text-gray-500">[{scene.position}]</span>{' '}
                    <span className="text-gray-600">{scene.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 用户备注 */}
          {outline.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">备注</h4>
              <p className="text-sm text-gray-600 italic">{outline.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {outline.status === 'PENDING' && (
          <>
            <button
              onClick={() => onEdit(outline.id)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              编辑
            </button>
            <button
              onClick={handleApprove}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              批准
            </button>
            <button
              onClick={handleSkip}
              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            >
              跳过
            </button>
          </>
        )}

        {outline.status === 'APPROVED' && (
          <>
            <button
              onClick={handleGenerateChapter}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              生成章节
            </button>
            <button
              onClick={() => onEdit(outline.id)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              编辑
            </button>
          </>
        )}

        {outline.status === 'COMPLETED' && (
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded cursor-not-allowed">
            已完成
          </button>
        )}

        <button
          onClick={handleDelete}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          删除
        </button>
      </div>
    </div>
  );
}
