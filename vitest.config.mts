import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'dist', 'build'],
    env: {
      // 设置测试环境
      NODE_ENV: 'test',
      // 设置测试用的数据库URL（如果没有设置环境变量）
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_novel_agent?schema=public',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/**',
        '**/*.config.{js,ts,mjs,mts}',
        '**/types/**',
        '**/*.d.ts',
        '**/tests/**',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        'app/**', // Next.js 页面文件通常不需要覆盖率测试
        'public/**',
      ],
    },
  },
  server: {
    fs: {
      // 禁止访问 .next 目录，避免 source map 错误
      deny: ['.next/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

