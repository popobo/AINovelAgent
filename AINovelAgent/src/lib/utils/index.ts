/**
 * 计算中文字数（包括标点）
 */
export function countChineseWords(text: string): number {
  if (!text) return 0;
  // 移除所有空白字符后计算长度
  return text.replace(/\s/g, "").length;
}

/**
 * 格式化字数显示
 */
export function formatWordCount(count: number): string {
  if (count < 1000) return `${count}字`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}千字`;
  return `${(count / 10000).toFixed(1)}万字`;
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(d);
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return "刚刚";
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * 将文本分割成段落
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * 将文本分割成适合向量化的chunks
 */
export function splitIntoChunks(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const paragraphs = splitIntoParagraphs(text);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= chunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // 保留overlap部分
        const words = currentChunk.split("");
        currentChunk = words.slice(-overlap).join("");
      }
      // 如果单个段落超过chunkSize，强制分割
      if (paragraph.length > chunkSize) {
        const parts = [];
        for (let i = 0; i < paragraph.length; i += chunkSize - overlap) {
          parts.push(paragraph.slice(i, i + chunkSize));
        }
        chunks.push(...parts.slice(0, -1));
        currentChunk = parts[parts.length - 1] || "";
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成UUID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 类名合并工具
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

