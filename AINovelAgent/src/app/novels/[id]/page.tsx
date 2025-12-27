"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import { formatWordCount } from "@/lib/utils";
import type { Novel, Chapter } from "@/types";

interface NovelPageProps {
  params: Promise<{ id: string }>;
}

export default function NovelPage({ params }: NovelPageProps) {
  const { id } = use(params);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // 获取小说信息
        const novelRes = await fetch(`/api/novels/${id}`);
        const novelData = await novelRes.json();
        if (!novelData.success) {
          setError(novelData.error);
          return;
        }
        setNovel(novelData.data);

        // 获取章节列表
        const chaptersRes = await fetch(`/api/chapters?novelId=${id}`);
        const chaptersData = await chaptersRes.json();
        if (chaptersData.success) {
          setChapters(chaptersData.data);
          if (chaptersData.data.length > 0) {
            setSelectedChapter(chaptersData.data[0]);
          }
        }
      } catch {
        setError("获取小说信息失败");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !novel) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error mb-4">{error || "小说不存在"}</p>
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
            <Link href={`/novels/${id}/write`}>
              <Button>续写</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        {/* 小说信息头部 */}
        <div className="mb-8">
          <Link
            href="/novels"
            className="text-foreground/50 hover:text-primary text-sm mb-4 inline-block"
          >
            ← 返回书架
          </Link>
          <h1 className="text-3xl font-display text-primary mb-2">
            {novel.title}
          </h1>
          <div className="flex items-center gap-4 text-foreground/50">
            {novel.author && <span>作者：{novel.author}</span>}
            <span>{formatWordCount(novel.word_count || 0)}</span>
            <span>{novel.chapter_count || chapters.length}章</span>
          </div>
        </div>

        {/* 主体内容：左侧章节目录 + 右侧阅读区 */}
        <div className="flex gap-6">
          {/* 章节目录 */}
          <div className="w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium text-foreground">目录</h3>
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => setSelectedChapter(chapter)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-border/50 last:border-0 ${
                        selectedChapter?.id === chapter.id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/70 hover:bg-card-hover hover:text-foreground"
                      }`}
                    >
                      <div className="line-clamp-1">
                        {chapter.title || `第${chapter.chapter_number}章`}
                      </div>
                      <div className="text-xs text-foreground/40 mt-1">
                        {formatWordCount(chapter.word_count)}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 阅读区 */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardContent className="p-8">
                {selectedChapter ? (
                  <>
                    <h2 className="text-2xl font-display text-primary mb-6 text-center">
                      {selectedChapter.title ||
                        `第${selectedChapter.chapter_number}章`}
                    </h2>
                    <div className="prose prose-invert max-w-none">
                      {selectedChapter.content
                        .split("\n")
                        .filter((p) => p.trim())
                        .map((paragraph, index) => (
                          <p
                            key={index}
                            className="text-foreground/80 leading-8 text-justify indent-8 mb-4"
                          >
                            {paragraph}
                          </p>
                        ))}
                    </div>

                    {/* 章节导航 */}
                    <div className="flex items-center justify-between mt-8 pt-8 border-t border-border">
                      <Button
                        variant="ghost"
                        disabled={selectedChapter.chapter_number === 1}
                        onClick={() => {
                          const prevChapter = chapters.find(
                            (c) =>
                              c.chapter_number ===
                              selectedChapter.chapter_number - 1
                          );
                          if (prevChapter) setSelectedChapter(prevChapter);
                        }}
                      >
                        ← 上一章
                      </Button>
                      <span className="text-foreground/50">
                        {selectedChapter.chapter_number} / {chapters.length}
                      </span>
                      <Button
                        variant="ghost"
                        disabled={
                          selectedChapter.chapter_number === chapters.length
                        }
                        onClick={() => {
                          const nextChapter = chapters.find(
                            (c) =>
                              c.chapter_number ===
                              selectedChapter.chapter_number + 1
                          );
                          if (nextChapter) setSelectedChapter(nextChapter);
                        }}
                      >
                        下一章 →
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-foreground/50 py-20">
                    请从左侧选择章节开始阅读
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

