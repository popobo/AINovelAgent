"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatWordCount, formatRelativeTime } from "@/lib/utils";
import type { Novel } from "@/types";

export default function NovelsPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNovels() {
      try {
        const response = await fetch("/api/novels");
        const result = await response.json();
        if (result.success) {
          setNovels(result.data);
        } else {
          setError(result.error);
        }
      } catch {
        setError("获取小说列表失败");
      } finally {
        setLoading(false);
      }
    }

    fetchNovels();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这本小说吗？此操作不可恢复。")) {
      return;
    }

    try {
      const response = await fetch(`/api/novels/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        setNovels(novels.filter((n) => n.id !== id));
      } else {
        alert("删除失败：" + result.error);
      }
    } catch {
      alert("删除失败");
    }
  };

  return (
    <main className="min-h-screen pt-20 pb-16">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <span className="text-xl font-display text-primary">墨韵 AI</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/novels"
              className="text-primary transition-colors"
            >
              我的书架
            </Link>
            <Link
              href="/fanfic"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              同人创作
            </Link>
            <Link
              href="/settings"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              设置
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display text-primary mb-2">我的书架</h1>
            <p className="text-foreground/50">
              管理您导入的小说，点击续写开始创作
            </p>
          </div>
          <Link href="/novels/import">
            <Button>导入小说</Button>
          </Link>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="text-center py-20">
            <p className="text-error mb-4">{error}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              重试
            </Button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && novels.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl text-foreground/70 mb-2">书架空空如也</h2>
            <p className="text-foreground/50 mb-6">
              导入您的第一本小说，开始AI续写之旅
            </p>
            <Link href="/novels/import">
              <Button>导入小说</Button>
            </Link>
          </div>
        )}

        {/* 小说列表 */}
        {!loading && !error && novels.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {novels.map((novel) => (
              <Card key={novel.id} hover className="group">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{novel.title}</CardTitle>
                  {novel.author && (
                    <p className="text-sm text-foreground/50">{novel.author}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-foreground/50 mb-4">
                    <span>{formatWordCount(novel.word_count || 0)}</span>
                    <span>{novel.chapter_count || 0}章</span>
                  </div>
                  {novel.summary && (
                    <p className="text-sm text-foreground/60 line-clamp-3 mb-4">
                      {novel.summary}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-xs text-foreground/40">
                      {formatRelativeTime(novel.updated_at || novel.created_at)}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/novels/${novel.id}`}>
                        <Button size="sm" variant="ghost">
                          阅读
                        </Button>
                      </Link>
                      <Link href={`/novels/${novel.id}/write`}>
                        <Button size="sm">续写</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(novel.id)}
                        className="text-error hover:text-error"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

