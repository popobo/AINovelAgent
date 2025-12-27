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
        <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
          {/* 新格式：核心事件（带详情） */}
          {metadata.newAnalysis?.core_events && metadata.newAnalysis.core_events.length > 0 ? (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                核心事件：
              </span>
              <ul className="mt-1 space-y-2">
                {metadata.newAnalysis.core_events.map((item, index) => (
                  <li key={index} className="text-xs text-gray-600">
                    <div className="font-medium text-gray-700">{item.event}</div>
                    {item.details && (
                      <div className="text-gray-500 mt-0.5 ml-2">{item.details}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            /* 旧格式：核心事件 */
            metadata.coreEvents && metadata.coreEvents.length > 0 && (
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
            )
          )}

          {/* 新格式：人物详情 */}
          {metadata.newAnalysis?.characters && metadata.newAnalysis.characters.length > 0 ? (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                人物：
              </span>
              <ul className="mt-1 space-y-2">
                {metadata.newAnalysis.characters.map((char, index) => (
                  <li key={index} className="text-xs text-gray-600">
                    <div className="font-medium text-gray-700">
                      {char.name}
                      {char.personality && (
                        <span className="text-gray-500 ml-2">（{char.personality}）</span>
                      )}
                    </div>
                    {char.description && (
                      <div className="text-gray-500 mt-0.5 ml-2">{char.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            /* 旧格式：人物活动 */
            metadata.characterActivities && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  人物活动：
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  {metadata.characterActivities}
                </p>
              </div>
            )
          )}

          {/* 新格式：性爱场景 */}
          {metadata.newAnalysis?.sex_scenes && metadata.newAnalysis.sex_scenes.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                性爱场景：
              </span>
              <ul className="mt-1 space-y-2">
                {metadata.newAnalysis.sex_scenes.map((scene, index) => (
                  <li key={index} className="text-xs text-gray-600">
                    <div className="font-medium text-gray-700">{scene.type}</div>
                    {scene.details && (
                      <div className="text-gray-500 mt-0.5 ml-2">{scene.details}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 新格式：文本特点 */}
          {metadata.newAnalysis?.text_features && (
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase">
                文本特点：
              </span>
              <div className="mt-1 space-y-1 text-xs text-gray-600">
                {metadata.newAnalysis.text_features.style && (
                  <div>
                    <span className="font-medium">风格：</span>
                    {metadata.newAnalysis.text_features.style}
                  </div>
                )}
                {metadata.newAnalysis.text_features.intensity && (
                  <div>
                    <span className="font-medium">强度：</span>
                    {metadata.newAnalysis.text_features.intensity}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 关键信息（兼容旧格式或新格式中未单独展示的部分） */}
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






