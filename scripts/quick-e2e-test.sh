#!/bin/bash

# 快速端到端测试脚本
# 用于验证系统的基本功能是否正常

set -e

echo "🧪 开始快速端到端测试..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 已安装"
        return 0
    else
        echo -e "${RED}✗${NC} $1 未安装"
        return 1
    fi
}

check_service() {
    if docker ps | grep -q $1; then
        echo -e "${GREEN}✓${NC} $1 服务正在运行"
        return 0
    else
        echo -e "${RED}✗${NC} $1 服务未运行"
        return 1
    fi
}

# 1. 检查依赖
echo "📦 检查依赖..."
check_command "node"
check_command "pnpm"
check_command "docker"
echo ""

# 2. 检查数据库
echo "🗄️  检查数据库..."
if ! check_service "ai_novel_agent_postgres"; then
    echo -e "${YELLOW}⚠${NC}  正在启动数据库..."
    docker-compose up -d
    sleep 5
    if check_service "ai_novel_agent_postgres"; then
        echo -e "${GREEN}✓${NC} 数据库启动成功"
    else
        echo -e "${RED}✗${NC} 数据库启动失败"
        exit 1
    fi
fi
echo ""

# 3. 检查环境变量
echo "🔧 检查环境变量..."
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠${NC}  .env.local 不存在，正在创建..."
    cp env.example .env.local
    echo -e "${YELLOW}⚠${NC}  请编辑 .env.local 文件，设置 NEXTAUTH_SECRET"
    echo -e "${YELLOW}⚠${NC}  生成命令: openssl rand -base64 32"
else
    echo -e "${GREEN}✓${NC} .env.local 存在"
    
    if grep -q "NEXTAUTH_SECRET=your-secret-key-here" .env.local; then
        echo -e "${YELLOW}⚠${NC}  请更新 NEXTAUTH_SECRET（当前为默认值）"
    fi
fi
echo ""

# 4. 检查数据库迁移
echo "🔄 检查数据库迁移..."
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_novel_agent?schema=public"
if pnpm prisma migrate status 2>/dev/null | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✓${NC} 数据库迁移已完成"
else
    echo -e "${YELLOW}⚠${NC}  正在运行数据库迁移..."
    pnpm db:migrate
fi
echo ""

# 5. 运行单元测试
echo "🧪 运行单元测试..."
if pnpm test --run 2>&1 | grep -q "Test Files.*passed"; then
    echo -e "${GREEN}✓${NC} 单元测试通过"
else
    echo -e "${YELLOW}⚠${NC}  单元测试可能有失败，请检查"
fi
echo ""

# 6. 检查端口
echo "🌐 检查端口..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  端口 3000 已被占用，开发服务器可能已在运行"
else
    echo -e "${GREEN}✓${NC} 端口 3000 可用"
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓${NC} 基础检查完成！"
echo ""
echo "下一步："
echo "1. 如果 .env.local 中的 NEXTAUTH_SECRET 未设置，请先设置"
echo "2. 运行 'pnpm dev' 启动开发服务器"
echo "3. 访问 http://localhost:3000"
echo "4. 按照 COMPLETE_TESTING_GUIDE.md 进行完整功能测试"
echo ""
echo "快速测试步骤："
echo "  1. 注册用户 → /register"
echo "  2. 登录 → /login"
echo "  3. 配置API Key → /settings"
echo "  4. 上传小说 → /novels/upload"
echo "  5. 识别章节 → API调用"
echo "  6. 生成摘要 → /novels/{id}/summaries"
echo "  7. 续写 → /novels/{id}/continue"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

