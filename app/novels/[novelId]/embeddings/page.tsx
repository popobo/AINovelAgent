'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { EmbeddingManagement } from '@/components/novel/EmbeddingManagement';

export default function EmbeddingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const novelId = params.novelId as string;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/novels/${novelId}`}
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← 返回小说详情
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">向量管理</h1>
          <p className="mt-2 text-gray-600">
            为章节生成向量，以便在RAG续写策略中检索相关内容
          </p>
        </div>

        <EmbeddingManagement novelId={novelId} />
      </div>
    </div>
  );
}
