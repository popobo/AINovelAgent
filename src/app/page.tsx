import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <span className="text-xl font-display text-primary">墨韵 AI</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/novels"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              我的书架
            </Link>
            <Link
              href="/fanfic"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              同人创作
            </Link>
            <Link
              href="/settings"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              设置
            </Link>
          </div>
        </div>
      </nav>

      {/* 主页内容 */}
      <div className="pt-24 pb-16">
        {/* Hero区域 */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-display text-primary mb-6">
              墨韵 AI
            </h1>
            <p className="text-xl md:text-2xl text-foreground/70 mb-4">
              智能小说续写与同人创作平台
            </p>
            <p className="text-foreground/50 max-w-2xl mx-auto mb-12">
              借助先进的AI技术，为您的百万字长篇小说续写精彩章节，
              或创作您喜爱作品的同人故事，让想象力自由驰骋
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/novels/import"
                className="px-8 py-4 bg-primary text-background font-medium rounded-lg hover:bg-primary-hover transition-all transform hover:scale-105 shadow-lg shadow-primary/20"
              >
                导入小说续写
              </Link>
              <Link
                href="/fanfic/create"
                className="px-8 py-4 bg-card border border-border text-foreground font-medium rounded-lg hover:bg-card-hover hover:border-primary/50 transition-all"
              >
                开始同人创作
              </Link>
            </div>
          </div>
        </section>

        {/* 功能卡片 */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-8">
            {/* 续写功能卡片 */}
            <div
              className="bg-card/50 backdrop-blur border border-border rounded-2xl p-8 hover:border-primary/50 transition-all group animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <span className="text-3xl">✍️</span>
              </div>
              <h3 className="text-2xl font-display text-primary mb-4">
                长篇小说续写
              </h3>
              <p className="text-foreground/60 mb-6">
                支持导入百万字级别的长篇小说，通过智能上下文管理和RAG技术，
                AI能够理解复杂的人物关系和情节脉络，续写出风格一致的精彩内容。
              </p>
              <ul className="space-y-3 text-sm text-foreground/50">
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  智能章节摘要与索引
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  人物关系图谱追踪
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  写作风格自动匹配
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  实时流式生成预览
                </li>
              </ul>
            </div>

            {/* 同人创作卡片 */}
            <div
              className="bg-card/50 backdrop-blur border border-border rounded-2xl p-8 hover:border-primary/50 transition-all group animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <span className="text-3xl">🎭</span>
              </div>
              <h3 className="text-2xl font-display text-primary mb-4">
                同人小说创作
              </h3>
              <p className="text-foreground/60 mb-6">
                为您喜爱的动漫、电影、电视剧创作同人故事。
                内置热门作品的角色设定，也可以自定义创建原作世界观。
              </p>
              <ul className="space-y-3 text-sm text-foreground/50">
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  热门作品设定库
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  角色性格深度还原
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  自定义世界观设定
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  多种故事类型模板
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* AI模型支持 */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div
            className="text-center mb-12 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <h2 className="text-3xl font-display text-primary mb-4">
              多模型支持
            </h2>
            <p className="text-foreground/50">
              支持主流AI模型，可根据需求自由切换
            </p>
          </div>
          <div
            className="flex flex-wrap justify-center gap-6 animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            {[
              { name: "OpenAI GPT-4o", icon: "🤖" },
              { name: "Claude 3.5", icon: "🧠" },
              { name: "DeepSeek", icon: "🔍" },
              { name: "通义千问", icon: "💬" },
            ].map((model) => (
              <div
                key={model.name}
                className="px-6 py-3 bg-card/30 border border-border rounded-full flex items-center gap-2 hover:border-primary/50 transition-colors"
              >
                <span>{model.icon}</span>
                <span className="text-foreground/70">{model.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 底部装饰 */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div
            className="text-center text-foreground/30 animate-fade-in"
            style={{ animationDelay: "0.5s" }}
          >
            <p className="font-display text-lg">笔墨生花，AI续梦</p>
          </div>
        </section>
      </div>
    </main>
  );
}

