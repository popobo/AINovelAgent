interface CharacterInfo {
  role: string;
  relationships: string[];
  arc: string;
}

interface WorldBuilding {
  setting: string;
  rules: string[];
  locations: string[];
}

interface RecentChapter {
  chapterIndex: number;
  title: string | null;
  summary: string;
}

interface GlobalSummaryMetadata {
  corePlot?: string;
  characters?: Record<string, CharacterInfo>;
  worldBuilding?: WorldBuilding;
  keyThemes?: string[];
  recentChapters?: RecentChapter[];
}

interface GlobalSummaryDisplayProps {
  content: string | null;
  metadata: GlobalSummaryMetadata | null;
  className?: string;
}

/**
 * 全局摘要显示组件
 * 用于展示小说的全局摘要，包括核心剧情、人物关系、世界观等信息
 */
export function GlobalSummaryDisplay({
  content,
  metadata,
  className = '',
}: GlobalSummaryDisplayProps) {
  // 优先使用metadata，如果没有metadata则使用content作为fallback
  const corePlot = metadata?.corePlot;
  const characters = metadata?.characters;
  const worldBuilding = metadata?.worldBuilding;
  const keyThemes = metadata?.keyThemes;

  // 如果没有metadata，显示原始content
  if (!metadata && content) {
    return (
      <div className={className}>
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-gray-800">{content}</div>
        </div>
      </div>
    );
  }

  // 如果既没有metadata也没有content
  if (!metadata && !content) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* 核心剧情主线 */}
        {corePlot && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">核心剧情主线</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {corePlot}
              </p>
            </div>
          </div>
        )}

        {/* 人物关系 */}
        {characters && Object.keys(characters).length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">人物关系</h3>
            <div className="space-y-4">
              {Object.entries(characters).map(([name, info]) => (
                <div
                  key={name}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">{name}</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">角色定位：</span>
                      <span className="text-gray-600">{info.role}</span>
                    </div>
                    {info.relationships && info.relationships.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">人物关系：</span>
                        <ul className="mt-1 ml-4 list-disc space-y-1">
                          {info.relationships.map((rel, index) => (
                            <li key={index} className="text-gray-600">
                              {rel}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {info.arc && (
                      <div>
                        <span className="font-medium text-gray-700">人物弧线：</span>
                        <p className="text-gray-600 mt-1">{info.arc}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 世界观设定 */}
        {worldBuilding && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">世界观设定</h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              {worldBuilding.setting && (
                <div>
                  <span className="font-medium text-gray-700">背景设定：</span>
                  <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                    {worldBuilding.setting}
                  </p>
                </div>
              )}
              {worldBuilding.rules && worldBuilding.rules.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">世界观规则：</span>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    {worldBuilding.rules.map((rule, index) => (
                      <li key={index} className="text-gray-600">
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {worldBuilding.locations && worldBuilding.locations.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">关键地点：</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {worldBuilding.locations.map((location, index) => (
                      <span
                        key={index}
                        className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                      >
                        {location}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 核心主题 */}
        {keyThemes && keyThemes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">核心主题</h3>
            <div className="flex flex-wrap gap-2">
              {keyThemes.map((theme, index) => (
                <span
                  key={index}
                  className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






