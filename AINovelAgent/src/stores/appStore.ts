import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIProviderType } from "@/types";

interface AppState {
  // AI设置
  defaultProvider: AIProviderType;
  setDefaultProvider: (provider: AIProviderType) => void;

  // 生成设置
  defaultWordCount: number;
  setDefaultWordCount: (count: number) => void;

  temperature: number;
  setTemperature: (temp: number) => void;

  // 阅读设置
  fontSize: number;
  setFontSize: (size: number) => void;

  lineHeight: number;
  setLineHeight: (height: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // AI设置
      defaultProvider: "openai",
      setDefaultProvider: (provider) => set({ defaultProvider: provider }),

      // 生成设置
      defaultWordCount: 1000,
      setDefaultWordCount: (count) => set({ defaultWordCount: count }),

      temperature: 0.7,
      setTemperature: (temp) => set({ temperature: temp }),

      // 阅读设置
      fontSize: 16,
      setFontSize: (size) => set({ fontSize: size }),

      lineHeight: 2,
      setLineHeight: (height) => set({ lineHeight: height }),
    }),
    {
      name: "ai-novel-agent-storage",
    }
  )
);

