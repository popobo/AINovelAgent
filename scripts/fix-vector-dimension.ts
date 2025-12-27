import { prisma } from '../lib/prisma';

async function fixVectorDimension() {
  try {
    console.log('开始修改向量列定义...');

    // 1. 清空现有向量数据
    console.log('清空现有向量数据...');
    await prisma.$executeRaw`TRUNCATE TABLE embeddings CASCADE;`;
    console.log('✓ 已清空 embeddings 表');

    // 2. 修改列定义
    console.log('修改 vector 列为可变长度...');
    await prisma.$executeRaw`ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector;`;
    console.log('✓ 已修改 embedding 列为可变长度');

    console.log('\n✅ 迁移完成！');
    console.log('现在可以创建任意维度的 embedding 向量了。');
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixVectorDimension();
