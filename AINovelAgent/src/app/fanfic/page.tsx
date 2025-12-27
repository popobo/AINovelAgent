"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";
import type { FanficSource, FanficCharacter } from "@/types";

export default function FanficPage() {
  const [sources, setSources] = useState<FanficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSources() {
      try {
        const response = await fetch("/api/fanfic/sources");
        const result = await response.json();
        if (result.success) {
          setSources(result.data);
        } else {
          setError(result.error);
        }
      } catch {
        setError("获取原作设定失败");
      } finally {
        setLoading(false);
      }
    }

    fetchSources();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个原作设定吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/fanfic/sources/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        setSources(sources.filter((s) => s.id !== id));
      } else {
        alert("删除失败：" + result.error);
      }
    } catch {
      alert("删除失败");
    }
  };

  const typeLabels: Record<string, string> = {
    anime: "动漫",
    movie: "电影",
    tv: "电视剧",
    game: "游戏",
    novel: "小说",
    other: "其他",
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
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              我的书架
            </Link>
            <Link href="/fanfic" className="text-primary transition-colors">
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
            <h1 className="text-3xl font-display text-primary mb-2">同人创作</h1>
            <p className="text-foreground/50">
              为您喜爱的作品创作同人故事
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/fanfic/sources/new">
              <Button variant="secondary">添加原作设定</Button>
            </Link>
            <Link href="/fanfic/create">
              <Button>开始创作</Button>
            </Link>
          </div>
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
        {!loading && !error && sources.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎭</div>
            <h2 className="text-xl text-foreground/70 mb-2">还没有原作设定</h2>
            <p className="text-foreground/50 mb-6">
              添加您喜爱作品的设定，或直接开始自由创作
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/fanfic/sources/new">
                <Button variant="secondary">添加原作设定</Button>
              </Link>
              <Link href="/fanfic/create">
                <Button>自由创作</Button>
              </Link>
            </div>
          </div>
        )}

        {/* 原作设定列表 */}
        {!loading && !error && sources.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources.map((source) => (
              <Card key={source.id} hover className="group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="line-clamp-1">{source.name}</CardTitle>
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {typeLabels[source.type] || source.type}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {source.world_setting && (
                    <p className="text-sm text-foreground/60 line-clamp-2 mb-3">
                      {source.world_setting}
                    </p>
                  )}

                  {source.characters && source.characters.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(source.characters as FanficCharacter[]).slice(0, 5).map((char, i) => (
                        <span
                          key={i}
                          className="text-xs bg-card px-2 py-1 rounded border border-border"
                        >
                          {char.name}
                        </span>
                      ))}
                      {source.characters.length > 5 && (
                        <span className="text-xs text-foreground/40 px-2 py-1">
                          +{source.characters.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-xs text-foreground/40">
                      {formatRelativeTime(source.created_at)}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/fanfic/create?sourceId=${source.id}`}>
                        <Button size="sm">创作</Button>
                      </Link>
                      <Link href={`/fanfic/sources/${source.id}`}>
                        <Button size="sm" variant="ghost">
                          编辑
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(source.id)}
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

