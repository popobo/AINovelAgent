#!/bin/bash

# 测试环境设置脚本

set -e

echo "🚀 开始设置测试环境..."

# 检查docker是否运行
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 启动数据库
echo "📦 启动PostgreSQL数据库..."
docker-compose up -d

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 5

# 检查数据库是否就绪
until docker exec ai_novel_agent_postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "等待数据库..."
    sleep 2
done

echo "✅ 数据库已就绪"

# 检查.env.local是否存在
if [ ! -f .env.local ]; then
    echo "📝 创建.env.local文件..."
    cp env.example .env.local
    echo "⚠️  请编辑.env.local文件，设置必要的环境变量（特别是NEXTAUTH_SECRET）"
fi

# 运行数据库迁移
echo "🔄 运行数据库迁移..."
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_novel_agent?schema=public"
pnpm db:migrate

echo "✅ 测试环境设置完成！"
echo ""
echo "下一步："
echo "1. 编辑 .env.local 文件，设置 NEXTAUTH_SECRET"
echo "2. 运行 'pnpm test' 执行单元测试"
echo "3. 运行 'pnpm dev' 启动开发服务器"

