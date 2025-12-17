"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Textarea, Select } from "@/components/ui";
import { formatWordCount, countChineseWords } from "@/lib/utils";
import type { Novel, Chapter, AIProviderType } from "@/types";

interface WritePageProps {
  params: Promise<{ id: string }>;
}

export default function WritePage({ params }: WritePageProps) {
  const { id } = use(params);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 续写设置
  const [selectedChapter, setSelectedChapter] = useState<number>(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [wordCount, setWordCount] = useState("1000");
  const [provider, setProvider] = useState<AIProviderType>("openai");

  // 生成的内容
  const [generatedContent, setGeneratedContent] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [novelRes, chaptersRes] = await Promise.all([
          fetch(`/api/novels/${id}`),
          fetch(`/api/chapters?novelId=${id}`),
        ]);

        const novelData = await novelRes.json();
        const chaptersData = await chaptersRes.json();

        if (novelData.success) {
          setNovel(novelData.data);
        }
        if (chaptersData.success) {
          setChapters(chaptersData.data);
          if (chaptersData.data.length > 0) {
            setSelectedChapter(
              chaptersData.data[chaptersData.data.length - 1].chapter_number
            );
          }
        }
      } catch {
        setError("获取数据失败");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const handleGenerate = async () => {
    if (!selectedChapter) {
      setError("请先选择要续写的章节");
      return;
    }

    setGenerating(true);
    setGeneratedContent("");
    setError(null);

    try {
      const response = await fetch("/api/ai/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId: id,
          chapterNumber: selectedChapter,
          userPrompt: userPrompt || undefined,
          wordCount: parseInt(wordCount),
          provider,
        }),
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
                // 自动滚动到底部
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

  const handleSave = async () => {
    if (!generatedContent.trim()) {
      setError("没有内容可保存");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_id: id,
          chapter_number: selectedChapter + 1,
          title: `第${selectedChapter + 1}章`,
          content: generatedContent,
          word_count: countChineseWords(generatedContent),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 刷新章节列表
        const chaptersRes = await fetch(`/api/chapters?novelId=${id}`);
        const chaptersData = await chaptersRes.json();
        if (chaptersData.success) {
          setChapters(chaptersData.data);
          setSelectedChapter(selectedChapter + 1);
        }
        setGeneratedContent("");
        alert("保存成功！");
      } else {
        setError(result.error || "保存失败");
      }
    } catch {
      setError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!novel) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error mb-4">小说不存在</p>
          <Link href="/novels">
            <Button variant="secondary">返回书架</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-16">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <span className="text-xl font-display text-primary">墨韵 AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`/novels/${id}`}>
              <Button variant="ghost">返回阅读</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <Link
            href={`/novels/${id}`}
            className="text-foreground/50 hover:text-primary text-sm mb-4 inline-block"
          >
            ← 返回阅读
          </Link>
          <h1 className="text-2xl font-display text-primary">
            续写：{novel.title}
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左侧：设置面板 */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-medium text-foreground mb-4">续写设置</h3>

              <div>
                <label className="block text-sm text-foreground/70 mb-2">
                  从哪一章续写
                </label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground"
                >
                  {chapters.map((chapter) => (
                    <option
                      key={chapter.id}
                      value={chapter.chapter_number}
                      className="bg-card"
                    >
                      第{chapter.chapter_number}章{" "}
                      {chapter.title && `- ${chapter.title}`}
                    </option>
                  ))}
                </select>
              </div>

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
                  续写字数
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
                label="创作指导（可选）"
                placeholder="例如：让主角发现一个惊人的秘密..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={4}
              />

              <Button
                className="w-full"
                onClick={handleGenerate}
                isLoading={generating}
                disabled={generating}
              >
                {generating ? "正在生成..." : "开始续写"}
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
                  <h3 className="font-medium text-foreground">生成内容</h3>
                  {generatedContent && (
                    <span className="text-sm text-foreground/50">
                      {formatWordCount(countChineseWords(generatedContent))}
                    </span>
                  )}
                </div>

                <div
                  ref={contentRef}
                  className="min-h-[400px] max-h-[600px] overflow-y-auto bg-background/50 rounded-lg p-6 border border-border"
                >
                  {generating && !generatedContent && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-foreground/50">正在构建上下文并生成...</p>
                      </div>
                    </div>
                  )}

                  {!generating && !generatedContent && (
                    <div className="flex items-center justify-center h-full text-foreground/40">
                      点击"开始续写"生成新内容
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
                    <Button onClick={handleSave} isLoading={saving}>
                      保存为新章节
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedContent);
                        alert("已复制到剪贴板");
                      }}
                    >
                      复制内容
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setGeneratedContent("")}
                    >
                      清空
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

