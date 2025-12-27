"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardContent, Textarea, Select, Input } from "@/components/ui";
import { formatWordCount, countChineseWords } from "@/lib/utils";
import type { FanficSource, FanficCharacter, AIProviderType } from "@/types";

function FanficCreateContent() {
  const searchParams = useSearchParams();
  const sourceIdFromUrl = searchParams.get("sourceId");

  const [sources, setSources] = useState<FanficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 创作设置
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    sourceIdFromUrl || ""
  );
  const [selectedSource, setSelectedSource] = useState<FanficSource | null>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [userRequest, setUserRequest] = useState("");
  const [wordCount, setWordCount] = useState("1000");
  const [provider, setProvider] = useState<AIProviderType>("openai");

  // 自定义设定（当不使用预设原作时）
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState("other");
  const [customWorldSetting, setCustomWorldSetting] = useState("");
  const [customCharacters, setCustomCharacters] = useState<FanficCharacter[]>([
    { name: "", description: "", personality: "" },
  ]);

  // 生成的内容
  const [generatedContent, setGeneratedContent] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchSources() {
      try {
        const response = await fetch("/api/fanfic/sources");
        const result = await response.json();
        if (result.success) {
          setSources(result.data);
          // 如果URL带有sourceId，自动选中
          if (sourceIdFromUrl) {
            const source = result.data.find(
              (s: FanficSource) => s.id === sourceIdFromUrl
            );
            if (source) {
              setSelectedSource(source);
            }
          }
        }
      } catch {
        console.error("Failed to fetch sources");
      } finally {
        setLoading(false);
      }
    }

    fetchSources();
  }, [sourceIdFromUrl]);

  useEffect(() => {
    if (selectedSourceId) {
      const source = sources.find((s) => s.id === selectedSourceId);
      setSelectedSource(source || null);
      setSelectedCharacters([]);
      setCustomMode(false);
    } else {
      setSelectedSource(null);
    }
  }, [selectedSourceId, sources]);

  const addCustomCharacter = () => {
    setCustomCharacters([
      ...customCharacters,
      { name: "", description: "", personality: "" },
    ]);
  };

  const handleGenerate = async () => {
    if (!userRequest.trim()) {
      setError("请输入创作要求");
      return;
    }

    if (!customMode && !selectedSourceId) {
      setError("请选择原作或切换到自定义模式");
      return;
    }

    setGenerating(true);
    setGeneratedContent("");
    setError(null);

    try {
      const body: Record<string, unknown> = {
        userRequest,
        wordCount: parseInt(wordCount),
        provider,
      };

      if (customMode) {
        body.customSource = {
          name: customName || "自定义作品",
          type: customType,
          world_setting: customWorldSetting,
          characters: customCharacters.filter((c) => c.name.trim()),
        };
      } else {
        body.sourceId = selectedSourceId;
        if (selectedCharacters.length > 0) {
          body.selectedCharacters = selectedCharacters;
        }
      }

      const response = await fetch("/api/fanfic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("生成失败");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setGeneratedContent((prev) => prev + parsed.text);
                if (contentRef.current) {
                  contentRef.current.scrollTop = contentRef.current.scrollHeight;
                }
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* 左侧：设置面板 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-medium text-foreground mb-4">创作设置</h3>

          {/* 模式切换 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={!customMode ? "primary" : "ghost"}
              onClick={() => setCustomMode(false)}
            >
              使用预设原作
            </Button>
            <Button
              size="sm"
              variant={customMode ? "primary" : "ghost"}
              onClick={() => setCustomMode(true)}
            >
              自定义设定
            </Button>
          </div>

          {!customMode ? (
            <>
              {/* 选择原作 */}
              <div>
                <label className="block text-sm text-foreground/70 mb-2">
                  选择原作
                </label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="">请选择原作...</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 选择角色 */}
              {selectedSource && selectedSource.characters.length > 0 && (
                <div>
                  <label className="block text-sm text-foreground/70 mb-2">
                    选择角色（可多选，留空使用全部）
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(selectedSource.characters as FanficCharacter[]).map((char) => (
                      <button
                        key={char.name}
                        onClick={() => {
                          setSelectedCharacters((prev) =>
                            prev.includes(char.name)
                              ? prev.filter((n) => n !== char.name)
                              : [...prev, char.name]
                          );
                        }}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          selectedCharacters.includes(char.name)
                            ? "bg-primary text-background border-primary"
                            : "border-border text-foreground/70 hover:border-primary"
                        }`}
                      >
                        {char.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 自定义设定 */}
              <Input
                label="作品名称"
                placeholder="例如：原创世界"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <Select
                label="类型"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                options={[
                  { value: "other", label: "其他" },
                  { value: "anime", label: "动漫风" },
                  { value: "movie", label: "电影风" },
                  { value: "novel", label: "小说风" },
                ]}
              />
              <Textarea
                label="世界观设定"
                placeholder="描述背景设定..."
                value={customWorldSetting}
                onChange={(e) => setCustomWorldSetting(e.target.value)}
                rows={3}
              />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-foreground/70">角色</label>
                  <Button size="sm" variant="ghost" onClick={addCustomCharacter}>
                    +
                  </Button>
                </div>
                {customCharacters.map((char, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input
                      placeholder="名称"
                      value={char.name}
                      onChange={(e) => {
                        const updated = [...customCharacters];
                        updated[i].name = e.target.value;
                        setCustomCharacters(updated);
                      }}
                    />
                    <Input
                      placeholder="性格"
                      value={char.personality}
                      onChange={(e) => {
                        const updated = [...customCharacters];
                        updated[i].personality = e.target.value;
                        setCustomCharacters(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <Select
            label="AI模型"
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProviderType)}
            options={[
              { value: "openai", label: "OpenAI GPT-4o" },
              { value: "claude", label: "Claude 3.5" },
              { value: "deepseek", label: "DeepSeek" },
              { value: "qwen", label: "通义千问" },
            ]}
          />

          <div>
            <label className="block text-sm text-foreground/70 mb-2">
              生成字数
            </label>
            <select
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground"
            >
              <option value="500">约500字</option>
              <option value="1000">约1000字</option>
              <option value="2000">约2000字</option>
              <option value="3000">约3000字</option>
            </select>
          </div>

          <Textarea
            label="创作要求 *"
            placeholder="描述你想要的故事情节、场景、氛围等..."
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            rows={4}
          />

          <Button
            className="w-full"
            onClick={handleGenerate}
            isLoading={generating}
            disabled={generating}
          >
            {generating ? "正在创作..." : "开始创作"}
          </Button>

          {error && (
            <p className="text-sm text-error text-center">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* 右侧：生成内容预览 */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">创作内容</h3>
              {generatedContent && (
                <span className="text-sm text-foreground/50">
                  {formatWordCount(countChineseWords(generatedContent))}
                </span>
              )}
            </div>

            <div
              ref={contentRef}
              className="min-h-[500px] max-h-[700px] overflow-y-auto bg-background/50 rounded-lg p-6 border border-border"
            >
              {generating && !generatedContent && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-foreground/50">正在创作中...</p>
                  </div>
                </div>
              )}

              {!generating && !generatedContent && (
                <div className="flex items-center justify-center h-full text-foreground/40">
                  填写创作要求并点击"开始创作"
                </div>
              )}

              {generatedContent && (
                <div className="prose prose-invert max-w-none">
                  {generatedContent.split("\n").map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-foreground/80 leading-8 text-justify indent-8 mb-4"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {generating && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
                  )}
                </div>
              )}
            </div>

            {generatedContent && !generating && (
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedContent);
                    alert("已复制到剪贴板");
                  }}
                >
                  复制内容
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // 继续生成
                    setUserRequest("请继续上文的故事");
                    handleGenerate();
                  }}
                >
                  继续生成
                </Button>
                <Button variant="ghost" onClick={() => setGeneratedContent("")}>
                  清空
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FanficCreatePage() {
  return (
    <main className="min-h-screen pt-20 pb-16">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <span className="text-xl font-display text-primary">墨韵 AI</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <Link
            href="/fanfic"
            className="text-foreground/50 hover:text-primary text-sm mb-4 inline-block"
          >
            ← 返回同人创作
          </Link>
          <h1 className="text-2xl font-display text-primary">开始创作</h1>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <FanficCreateContent />
        </Suspense>
      </div>
    </main>
  );
}

