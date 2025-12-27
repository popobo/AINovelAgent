import { countChineseWords } from "@/lib/utils";

export interface ParsedChapter {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
}

export interface ParsedNovel {
  title: string;
  author?: string;
  chapters: ParsedChapter[];
  totalWordCount: number;
}

// 常见的章节标题正则表达式
const CHAPTER_PATTERNS = [
  // 第X章 标题
  /^第[一二三四五六七八九十百千万零\d]+章[\s:：]*(.*?)$/m,
  // 第X回 标题
  /^第[一二三四五六七八九十百千万零\d]+回[\s:：]*(.*?)$/m,
  // 第X节 标题
  /^第[一二三四五六七八九十百千万零\d]+节[\s:：]*(.*?)$/m,
  // 第X卷 标题
  /^第[一二三四五六七八九十百千万零\d]+卷[\s:：]*(.*?)$/m,
  // Chapter X: Title
  /^Chapter\s+\d+[\s:：]*(.*?)$/im,
  // 数字. 标题 或 数字、标题
  /^(\d+)[.、]\s*(.*?)$/m,
  // 【第X章】标题
  /^【第[一二三四五六七八九十百千万零\d]+章】(.*?)$/m,
];

/**
 * 中文数字转阿拉伯数字
 */
function chineseToNumber(chinese: string): number {
  const numMap: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    百: 100,
    千: 1000,
    万: 10000,
  };

  if (/^\d+$/.test(chinese)) {
    return parseInt(chinese, 10);
  }

  let result = 0;
  let temp = 0;
  let lastUnit = 1;

  for (const char of chinese) {
    const num = numMap[char];
    if (num === undefined) continue;

    if (num >= 10) {
      if (temp === 0) temp = 1;
      if (num > lastUnit) {
        result = (result + temp) * num;
        temp = 0;
      } else {
        result += temp * num;
        temp = 0;
      }
      lastUnit = num;
    } else {
      temp = num;
    }
  }

  return result + temp;
}

/**
 * 解析TXT小说内容
 */
export function parseNovelText(
  content: string,
  options?: {
    customPattern?: string;
    minChapterLength?: number;
  }
): ParsedNovel {
  const minChapterLength = options?.minChapterLength || 100;
  let chapters: ParsedChapter[] = [];
  let detectedPattern: RegExp | null = null;

  // 尝试检测使用的章节模式
  if (options?.customPattern) {
    detectedPattern = new RegExp(options.customPattern, "gm");
  } else {
    for (const pattern of CHAPTER_PATTERNS) {
      const globalPattern = new RegExp(pattern.source, "gm");
      const matches = content.match(globalPattern);
      if (matches && matches.length >= 3) {
        // 至少检测到3章才认为是有效模式
        detectedPattern = globalPattern;
        break;
      }
    }
  }

  if (detectedPattern) {
    // 按章节分割
    const parts = content.split(detectedPattern);
    const titles = content.match(detectedPattern) || [];

    // 第一部分可能是前言或书名
    const preamble = parts[0]?.trim();
    let novelTitle = "未命名小说";
    let author: string | undefined;

    // 尝试从前言提取书名和作者
    if (preamble) {
      const titleMatch = preamble.match(
        /^《(.+?)》|书名[：:]\s*(.+?)(?:\n|$)|(.+?)(?:\n|$)/
      );
      if (titleMatch) {
        novelTitle = titleMatch[1] || titleMatch[2] || titleMatch[3] || novelTitle;
      }
      const authorMatch = preamble.match(/作者[：:]\s*(.+?)(?:\n|$)/);
      if (authorMatch) {
        author = authorMatch[1];
      }
    }

    // 解析每个章节
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i].trim();
      const contentPart = parts[i + 1]?.trim() || "";

      if (contentPart.length < minChapterLength) {
        continue; // 跳过过短的章节
      }

      // 提取章节号
      const numMatch = title.match(/[一二三四五六七八九十百千万零\d]+/);
      const chapterNumber = numMatch
        ? chineseToNumber(numMatch[0])
        : chapters.length + 1;

      // 提取章节标题
      const titleParts = title.split(/[\s:：]+/);
      const chapterTitle =
        titleParts.length > 1 ? titleParts.slice(1).join(" ").trim() : title;

      chapters.push({
        chapterNumber,
        title: chapterTitle || `第${chapterNumber}章`,
        content: contentPart,
        wordCount: countChineseWords(contentPart),
      });
    }

    // 重新排序并修正章节号
    chapters = chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    chapters = chapters.map((c, i) => ({ ...c, chapterNumber: i + 1 }));

    return {
      title: novelTitle,
      author,
      chapters,
      totalWordCount: chapters.reduce((sum, c) => sum + c.wordCount, 0),
    };
  }

  // 如果没有检测到章节模式，按固定字数分割
  const chunkSize = 3000;
  const contentChunks: string[] = [];
  let currentPos = 0;

  while (currentPos < content.length) {
    let endPos = currentPos + chunkSize;
    // 尝试在段落结束处分割
    if (endPos < content.length) {
      const nextParagraph = content.indexOf("\n\n", endPos);
      if (nextParagraph !== -1 && nextParagraph < endPos + 500) {
        endPos = nextParagraph;
      }
    }
    contentChunks.push(content.slice(currentPos, endPos).trim());
    currentPos = endPos;
  }

  chapters = contentChunks
    .filter((chunk) => chunk.length >= minChapterLength)
    .map((chunk, index) => ({
      chapterNumber: index + 1,
      title: `第${index + 1}章`,
      content: chunk,
      wordCount: countChineseWords(chunk),
    }));

  return {
    title: "未命名小说",
    chapters,
    totalWordCount: chapters.reduce((sum, c) => sum + c.wordCount, 0),
  };
}

/**
 * 验证解析结果
 */
export function validateParsedNovel(novel: ParsedNovel): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!novel.title) {
    issues.push("未检测到书名");
  }

  if (novel.chapters.length === 0) {
    issues.push("未检测到任何章节");
  }

  if (novel.chapters.length < 3) {
    issues.push("章节数过少，可能解析不正确");
  }

  const avgWordCount =
    novel.totalWordCount / Math.max(novel.chapters.length, 1);
  if (avgWordCount < 500) {
    issues.push("章节平均字数过少，可能分章不正确");
  }

  // 检查章节号是否连续
  const numbers = novel.chapters.map((c) => c.chapterNumber);
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      issues.push("章节编号不连续");
      break;
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

