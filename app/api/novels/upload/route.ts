import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createNovel } from '@/lib/db/novel';
import { prisma } from '@/lib/prisma';
import { getUserById } from '@/lib/db/user';
import { identifyChapters, splitChaptersByRegex } from '@/lib/novel/chapter-parser';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * 上传txt小说文件
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const regex = formData.get('regex') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.name.endsWith('.txt')) {
      return NextResponse.json(
        { error: '只支持txt文件' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // 读取文件内容
    const text = await file.text();
    const novelTitle = title || file.name.replace('.txt', '') || '未命名小说';

    // 创建小说记录
    const novel = await createNovel({
      title: novelTitle,
      description: `上传于 ${new Date().toLocaleString('zh-CN')}`,
      userId: session.user.id,
    });

    // 优先级1: 如果用户提供了正则表达式，直接使用它切分章节
    if (regex && regex.trim()) {
      try {
        const chapters = splitChaptersByRegex(text, regex.trim(), 'gm');

        // 创建识别出的章节
        await Promise.all(
          chapters.map((chapter) =>
            prisma.chapter.create({
              data: {
                novelId: novel.id,
                chapterIndex: chapter.index,
                title: chapter.title,
                content: chapter.content,
                wordCount: chapter.content.length,
              },
            })
          )
        );

        return NextResponse.json({
          message: '文件上传成功，已使用正则表达式识别章节',
          novel: {
            id: novel.id,
            title: novel.title,
          },
          chaptersCount: chapters.length,
        });
      } catch (error) {
        console.error('正则表达式切分章节失败:', error);
        // 如果正则表达式无效，返回错误信息
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : '正则表达式无效，请检查输入',
            novel: {
              id: novel.id,
              title: novel.title,
            },
          },
          { status: 400 }
        );
      }
    }

    // 优先级2: 如果用户未提供正则表达式，检查是否有 API Key
    const user = await getUserById(session.user.id);
    
    if (user?.openRouterKey) {
      try {
        // 使用 LLM 识别章节正则表达式并切分章节
        const chapters = await identifyChapters(
          text,
          user.openRouterKey,
          'openai/gpt-4o-mini'
        );

        // 创建识别出的章节
        await Promise.all(
          chapters.map((chapter) =>
            prisma.chapter.create({
              data: {
                novelId: novel.id,
                chapterIndex: chapter.index,
                title: chapter.title,
                content: chapter.content,
                wordCount: chapter.content.length,
              },
            })
          )
        );

        return NextResponse.json({
          message: '文件上传成功，已自动识别章节',
          novel: {
            id: novel.id,
            title: novel.title,
          },
          chaptersCount: chapters.length,
        });
      } catch (error) {
        console.error('自动章节识别失败:', error);
        // 如果识别失败，创建临时章节
        await prisma.chapter.create({
          data: {
            novelId: novel.id,
            chapterIndex: 1,
            title: '待解析',
            content: text,
            wordCount: text.length,
          },
        });

        return NextResponse.json({
          message: '文件上传成功，但章节识别失败，请稍后手动识别',
          novel: {
            id: novel.id,
            title: novel.title,
          },
          warning: '章节识别失败，请前往小说详情页手动识别章节',
        });
      }
    } else {
      // 优先级3: 如果用户没有 API Key，创建临时章节
      await prisma.chapter.create({
        data: {
          novelId: novel.id,
          chapterIndex: 1,
          title: '待解析',
          content: text,
          wordCount: text.length,
        },
      });

      return NextResponse.json({
        message: '文件上传成功，请先配置 OpenRouter API Key 或输入正则表达式以自动识别章节',
        novel: {
          id: novel.id,
          title: novel.title,
        },
        warning: '未配置 API Key，请前往设置页面配置后手动识别章节',
      });
    }
  } catch (error) {
    console.error('文件上传错误:', error);
    return NextResponse.json(
      { error: '文件上传失败，请稍后重试' },
      { status: 500 }
    );
  }
}

