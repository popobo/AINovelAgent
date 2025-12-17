"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatWordCount } from "@/lib/utils";

interface ImportResult {
  novel: {
    id: string;
    title: string;
  };
  chaptersCount: number;
  totalWordCount: number;
  validation: {
    valid: boolean;
    issues: string[];
  };
}

export default function ImportNovelPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [chapterPattern, setChapterPattern] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      // 尝试从文件名提取书名
      const fileName = selectedFile.name.replace(/\.(txt|epub)$/i, "");
      if (!title) {
        setTitle(fileName);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".txt") || droppedFile.name.endsWith(".epub"))) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
      const fileName = droppedFile.name.replace(/\.(txt|epub)$/i, "");
      if (!title) {
        setTitle(fileName);
      }
    } else {
      setError("请上传 .txt 或 .epub 格式的文件");
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("请先选择文件");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);
      if (author) formData.append("author", author);
      if (chapterPattern) formData.append("chapterPattern", chapterPattern);

      const response = await fetch("/api/novels/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "导入失败");
      }
    } catch {
      setError("导入过程中发生错误");
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
          <div className="flex items-center gap-6">
            <Link href="/novels" className="text-primary transition-colors">
              我的书架
            </Link>
            <Link
              href="/fanfic"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              同人创作
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <Link
            href="/novels"
            className="text-foreground/50 hover:text-primary text-sm mb-4 inline-block"
          >
            ← 返回书架
          </Link>
          <h1 className="text-3xl font-display text-primary mb-2">导入小说</h1>
          <p className="text-foreground/50">
            上传TXT格式的小说文件，系统会自动识别章节结构
          </p>
        </div>

        {/* 导入成功 */}
        {result && (
          <Card className="mb-8 border-success/50">
            <CardHeader>
              <CardTitle className="text-success">✓ 导入成功</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <p>
                  <span className="text-foreground/50">书名：</span>
                  {result.novel.title}
                </p>
                <p>
                  <span className="text-foreground/50">章节数：</span>
                  {result.chaptersCount} 章
                </p>
                <p>
                  <span className="text-foreground/50">总字数：</span>
                  {formatWordCount(result.totalWordCount)}
                </p>
              </div>
              {result.validation.issues.length > 0 && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm text-warning mb-2">⚠️ 解析提示：</p>
                  <ul className="text-sm text-foreground/60 list-disc list-inside">
                    {result.validation.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={() => router.push(`/novels/${result.novel.id}`)}>
                  开始阅读
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/novels/${result.novel.id}/write`)}
                >
                  开始续写
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setTitle("");
                    setAuthor("");
                  }}
                >
                  继续导入
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 导入表单 */}
        {!result && (
          <Card>
            <CardContent className="pt-6">
              {/* 文件上传区域 */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors ${
                  file
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.epub"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-foreground mb-1">{file.name}</p>
                    <p className="text-sm text-foreground/50">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-3">📥</div>
                    <p className="text-foreground mb-1">
                      拖放文件到这里，或点击选择文件
                    </p>
                    <p className="text-sm text-foreground/50">
                      支持 .txt 格式
                    </p>
                  </div>
                )}
              </div>

              {/* 表单字段 */}
              <div className="space-y-4 mb-6">
                <Input
                  label="书名（可选）"
                  placeholder="留空将自动识别"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  label="作者（可选）"
                  placeholder="留空将自动识别"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
                <Input
                  label="自定义章节正则表达式（高级）"
                  placeholder='例如：^第[一二三四五六七八九十百千万\\d]+章'
                  value={chapterPattern}
                  onChange={(e) => setChapterPattern(e.target.value)}
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
                  {error}
                </div>
              )}

              {/* 提交按钮 */}
              <Button
                className="w-full"
                onClick={handleSubmit}
                isLoading={loading}
                disabled={!file}
              >
                {loading ? "正在解析..." : "开始导入"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 提示信息 */}
        <div className="mt-8 text-sm text-foreground/40">
          <h3 className="text-foreground/60 mb-2">支持的章节格式：</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>第X章 标题</li>
            <li>第X回 标题</li>
            <li>Chapter X: Title</li>
            <li>数字. 标题</li>
            <li>【第X章】标题</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

