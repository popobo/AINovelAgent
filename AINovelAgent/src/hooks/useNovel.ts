"use client";

import { useState, useEffect, useCallback } from "react";
import type { Novel, Chapter } from "@/types";

export function useNovel(novelId: string | null) {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNovel = useCallback(async () => {
    if (!novelId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/novels/${novelId}`);
      const result = await response.json();

      if (result.success) {
        setNovel(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("获取小说信息失败");
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  const fetchChapters = useCallback(async () => {
    if (!novelId) return;

    try {
      const response = await fetch(`/api/chapters?novelId=${novelId}`);
      const result = await response.json();

      if (result.success) {
        setChapters(result.data);
      }
    } catch {
      console.error("获取章节失败");
    }
  }, [novelId]);

  useEffect(() => {
    fetchNovel();
    fetchChapters();
  }, [fetchNovel, fetchChapters]);

  const updateNovel = async (data: Partial<Novel>) => {
    if (!novelId) return;

    try {
      const response = await fetch(`/api/novels/${novelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        setNovel(result.data);
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch {
      setError("更新失败");
      return false;
    }
  };

  const addChapter = async (chapter: Partial<Chapter>) => {
    if (!novelId) return null;

    try {
      const response = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...chapter, novel_id: novelId }),
      });
      const result = await response.json();

      if (result.success) {
        await fetchChapters();
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch {
      setError("添加章节失败");
      return null;
    }
  };

  return {
    novel,
    chapters,
    loading,
    error,
    updateNovel,
    addChapter,
    refresh: () => {
      fetchNovel();
      fetchChapters();
    },
  };
}

export function useNovels() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNovels = useCallback(async () => {
    try {
      setLoading(true);
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
  }, []);

  useEffect(() => {
    fetchNovels();
  }, [fetchNovels]);

  const deleteNovel = async (id: string) => {
    try {
      const response = await fetch(`/api/novels/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setNovels(novels.filter((n) => n.id !== id));
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch {
      setError("删除失败");
      return false;
    }
  };

  return {
    novels,
    loading,
    error,
    deleteNovel,
    refresh: fetchNovels,
  };
}

