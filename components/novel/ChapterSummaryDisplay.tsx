interface ChapterSummaryMetadata {
  coreEvents?: string[];
  characterActivities?: string;
  keyInformation?: string;
  emotionalClues?: string;
}

interface ChapterSummaryDisplayProps {
  summary: string | null;
  metadata: ChapterSummaryMetadata | null;
  wordCount?: number | null;
  className?: string;
}

/**
 * 章节摘要显示组件
 * 用于展示章节摘要内容和结构化元数据
 */
export function ChapterSummaryDisplay({
  summary,
  metadata,
  wordCount,
  className = '',
}: ChapterSummaryDisplayProps) {
  if (!summary && !metadata) {
    return null;
  }

  return (
    <div className={className}>
      {/* 完整摘要内容 */}
      {summary && (
        <div className="mt-2">
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* 结构化元数据 */}
      {metadata && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
          {/* 核心事件 */}
          {metadata.coreEvents && metadata.coreEvents.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                核心事件：
              </span>
              <ul className="mt-1 space-y-1">
                {metadata.coreEvents.map((event, index) => (
                  <li
                    key={index}
                    className="text-xs text-gray-600 flex items-start"
                  >
                    <span className="text-gray-400 mr-2">•</span>
                    <span>{event}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 人物活动 */}
          {metadata.characterActivities && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                人物活动：
              </span>
              <p className="text-xs text-gray-600 mt-1">
                {metadata.characterActivities}
              </p>
            </div>
          )}

          {/* 关键信息 */}
          {metadata.keyInformation && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                关键信息：
              </span>
              <p className="text-xs text-gray-600 mt-1">
                {metadata.keyInformation}
              </p>
            </div>
          )}

          {/* 情感线索 */}
          {metadata.emotionalClues && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                情感线索：
              </span>
              <p className="text-xs text-gray-600 mt-1">
                {metadata.emotionalClues}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 字数统计 */}
      {wordCount && (
        <p className="text-xs text-gray-500 mt-2">字数：{wordCount}</p>
      )}
    </div>
  );
}






