#!/bin/bash

# 快速测试脚本

set -e

echo "🧪 开始运行测试..."

# 检查数据库是否运行
if ! docker ps | grep -q ai_novel_agent_postgres; then
    echo "⚠️  数据库未运行，正在启动..."
    docker-compose up -d
    sleep 5
fi

# 设置环境变量
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_novel_agent?schema=public"

# 运行测试
echo "运行单元测试..."
pnpm test --run

echo "✅ 测试完成！"

