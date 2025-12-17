"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Textarea, Select } from "@/components/ui";
import type { FanficCharacter } from "@/types";

export default function NewFanficSourcePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("anime");
  const [worldSetting, setWorldSetting] = useState("");
  const [plotSummary, setPlotSummary] = useState("");
  const [characters, setCharacters] = useState<FanficCharacter[]>([
    { name: "", description: "", personality: "", catchphrases: [] },
  ]);

  const addCharacter = () => {
    setCharacters([
      ...characters,
      { name: "", description: "", personality: "", catchphrases: [] },
    ]);
  };

  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  const updateCharacter = (
    index: number,
    field: keyof FanficCharacter,
    value: string | string[]
  ) => {
    const updated = [...characters];
    if (field === "catchphrases") {
      updated[index][field] = value as string[];
    } else {
      updated[index][field] = value as string;
    }
    setCharacters(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("请输入作品名称");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validCharacters = characters.filter((c) => c.name.trim());

      const response = await fetch("/api/fanfic/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          world_setting: worldSetting,
          plot_summary: plotSummary,
          characters: validCharacters,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push("/fanfic");
      } else {
        setError(result.error || "创建失败");
      }
    } catch {
      setError("创建失败");
    } finally {
      setLoading(false);
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
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <Link
            href="/fanfic"
            className="text-foreground/50 hover:text-primary text-sm mb-4 inline-block"
          >
            ← 返回同人创作
          </Link>
          <h1 className="text-3xl font-display text-primary mb-2">
            添加原作设定
          </h1>
          <p className="text-foreground/50">
            添加您喜爱作品的世界观和角色设定
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* 基本信息 */}
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="作品名称 *"
                placeholder="例如：火影忍者"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Select
                label="作品类型"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { value: "anime", label: "动漫" },
                  { value: "movie", label: "电影" },
                  { value: "tv", label: "电视剧" },
                  { value: "game", label: "游戏" },
                  { value: "novel", label: "小说" },
                  { value: "other", label: "其他" },
                ]}
              />
            </div>

            <Textarea
              label="世界观设定"
              placeholder="描述作品的背景设定、时代背景、特殊规则等..."
              value={worldSetting}
              onChange={(e) => setWorldSetting(e.target.value)}
              rows={4}
            />

            <Textarea
              label="剧情概要（可选）"
              placeholder="简要描述主要剧情..."
              value={plotSummary}
              onChange={(e) => setPlotSummary(e.target.value)}
              rows={3}
            />

            {/* 角色设定 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">角色设定</h3>
                <Button size="sm" variant="secondary" onClick={addCharacter}>
                  + 添加角色
                </Button>
              </div>

              <div className="space-y-4">
                {characters.map((char, index) => (
                  <div
                    key={index}
                    className="p-4 bg-background/50 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-foreground/50">
                        角色 {index + 1}
                      </span>
                      {characters.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCharacter(index)}
                          className="text-error hover:text-error"
                        >
                          删除
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        placeholder="角色名称"
                        value={char.name}
                        onChange={(e) =>
                          updateCharacter(index, "name", e.target.value)
                        }
                      />
                      <Input
                        placeholder="性格特点"
                        value={char.personality}
                        onChange={(e) =>
                          updateCharacter(index, "personality", e.target.value)
                        }
                      />
                    </div>
                    <div className="mt-3">
                      <Input
                        placeholder="角色简介（外貌、身份等）"
                        value={char.description}
                        onChange={(e) =>
                          updateCharacter(index, "description", e.target.value)
                        }
                      />
                    </div>
                    <div className="mt-3">
                      <Input
                        placeholder="口头禅（用逗号分隔多个）"
                        value={char.catchphrases?.join(", ") || ""}
                        onChange={(e) =>
                          updateCharacter(
                            index,
                            "catchphrases",
                            e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex gap-3">
              <Button onClick={handleSubmit} isLoading={loading}>
                保存设定
              </Button>
              <Link href="/fanfic">
                <Button variant="ghost">取消</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

