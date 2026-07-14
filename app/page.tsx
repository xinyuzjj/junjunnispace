"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

interface Resource {
  id: string;
  title: string;
  desc: string;
  quarkLink?: string;
  baiduLink?: string;
  tags?: string[];
}

interface Project {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  emoji: string;
  icon: string;
}

interface Game {
  id: string;
  name: string;
  category: string;
  desc: string;
  coverImage?: string;
  quarkLink?: string;
  baiduLink?: string;
}

export default function HomePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [wechatOpen, setWechatOpen] = useState(false);
  const [showWechatModal, setShowWechatModal] = useState(false);

  // 入站弹窗：首次访问显示公众号关注（localStorage 记录，关闭后不再弹）
  useEffect(() => {
    const hidden = localStorage.getItem('wb_wechat_modal_dismissed');
    if (!hidden) {
      // 延迟1秒再弹出，让页面先渲染完
      const t = setTimeout(() => setShowWechatModal(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);
  const gameScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);

  // 检查滚动位置，控制箭头显示
  const checkScroll = useCallback(() => {
    const el = gameScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // 自动滚动（丝滑连续滚动）
  useEffect(() => {
    if (games.length === 0 || autoPaused) return;
    const el = gameScrollRef.current;
    if (!el) return;

    let rafId: number;
    let lastTime = performance.now();
    const SPEED = 45; // px/second 滚动速度，调大=更快

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000; // 秒
      lastTime = now;
      // 如果快到末尾，重置到开头（循环）
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += SPEED * dt;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [games.length, autoPaused]);

  useEffect(() => {
    checkScroll();
    const el = gameScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll, { passive: true });
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [games, checkScroll]);

  const scrollGames = (dir: 'left' | 'right') => {
    const el = gameScrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-game-card]')?.clientWidth || 176;
    const scrollAmount = dir === 'left' ? -cardWidth * 2.5 : cardWidth * 2.5;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    // 手动点击后暂停5秒再恢复自动滚动
    setAutoPaused(true);
    setTimeout(() => setAutoPaused(false), 5000);
  };

  useEffect(() => {
    Promise.all([
      fetch('/resources.json').then(res => res.json()).catch(() => []),
      fetch('/github-projects.json').then(res => res.json()).catch(() => []),
      fetch('/game-resources.json').then(res => res.json()).then(d => d.resources || []).catch(() => []),
    ])
      .then(([resourcesData, projectsData, gamesData]) => {
        setResources(resourcesData);
        setProjects(projectsData);
        // 取有封面图的游戏，优先展示，最多12个
        const withCover = gamesData.filter((g: Game) => g.coverImage && g.coverImage.startsWith('http'));
        const featured = withCover.length >= 8 ? withCover : gamesData.slice(0, 12);
        setGames(featured);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredResources = resources.filter(item => {
    if (!searchTerm) return true;
    return (
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }).sort((a, b) => {
    return sortOrder === 'asc' ? parseInt(a.id) - parseInt(b.id) : parseInt(b.id) - parseInt(a.id);
  });

  const getLangColor = (lang: string) => {
    const colors: Record<string, string> = {
      'TypeScript': '#3178c6',
      'JavaScript': '#f7df1e',
      'Python': '#3776ab',
      'Vue': '#4fc08d',
      'Shell': '#89e051',
    };
    return colors[lang] || '#6b7280';
  };

  // 统计数据
  const stats = [
    { label: 'PC 游戏', value: games.length || 276, icon: '🎮', color: 'from-purple-500 to-violet-600' },
    { label: '精选资源', value: resources.length || 76, icon: '📦', color: 'from-blue-500 to-cyan-600' },
    { label: '开源项目', value: projects.length || 8, icon: '⚡', color: 'from-emerald-500 to-teal-600' },
    { label: '夸克/百度', value: '双链', icon: '☁️', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 relative font-sans">
      {/* ========== 顶部导航栏（固定在最顶部）========== */}
      <header className="w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-red-600 flex items-center gap-2 shrink-0">
              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-2.5 py-1 rounded-lg text-sm font-extrabold shadow-sm">峻</span>
              峻峻尼分享
              <span className="text-xs text-gray-400 font-normal ml-1 hidden sm:inline">ARCHIVE</span>
            </Link>

            {/* 搜索 + 按钮 */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 min-w-0 md:w-64">
                <input
                  type="text"
                  placeholder="搜索资源..."
                  className="w-full px-4 py-2 pl-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400 text-sm bg-gray-50 hover:bg-white transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Link href="/game-resource" className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 transition-all duration-200 whitespace-nowrap text-sm font-medium shadow-md hover:shadow-lg flex items-center gap-1.5">
                🎮 游戏库
              </Link>
              <a href="https://github.com/xinyuzjj" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200 text-sm font-medium shadow-md flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ========== Hero 统计面板 ========== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 25% 40%, rgba(139,92,246,0.4) 0%, transparent 55%), radial-gradient(circle at 75% 60%, rgba(59,130,246,0.3) 0%, transparent 50%)',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
          {/* 标题 + 统计卡片 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
              峻峻尼<span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"> 资源分享</span>
            </h1>
            <p className="text-indigo-200/70 text-sm">PC 游戏 · 开源项目 · 实用工具 · 夸克 / 百度双网盘</p>
          </div>

          {/* 数据统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className={`relative rounded-2xl bg-gradient-to-br ${s.color} p-4 md:p-5 text-white shadow-lg overflow-hidden group`}>
                <div className="absolute -right-4 -top-4 text-5xl opacity-15 group-hover:opacity-25 transition-opacity">{s.icon}</div>
                <div className="text-2xl md:text-3xl font-extrabold tabular-nums">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
                <div className="text-xs md:text-sm opacity-85 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 热门游戏横向滚动轮播 */}
          {games.length > 0 && (
            <div className="relative group/carousel">
              {/* 标题行 */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white/90 flex items-center gap-2">
                  <span className="text-lg">🔥</span> 热门游戏推荐
                </h2>
                <Link href="/game-resource" className="text-xs text-purple-300 hover:text-white transition-colors flex items-center gap-1 group/link">
                  查看全部 {games.length}+ 款
                  <svg className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>

              {/* 滚动容器 */}
              <div className="relative">
                {/* 左箭头 */}
                <button
                  onClick={() => scrollGames('left')}
                  aria-label="向左滚动"
                  className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-black/70 transition-all duration-200 shadow-lg -ml-1 ${canScrollLeft ? '' : 'pointer-events-none'}`}
                  style={{ opacity: canScrollLeft ? undefined : 0 }}
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>

                {/* 右箭头 */}
                <button
                  onClick={() => scrollGames('right')}
                  aria-label="向右滚动"
                  className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-black/70 transition-all duration-200 shadow-lg -mr-1 ${canScrollRight ? '' : 'pointer-events-none'}`}
                  style={{ opacity: canScrollRight ? undefined : 0 }}
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>

                {/* 卡片列表 */}
                <div
                  ref={gameScrollRef}
                  className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' as any }}
                  onMouseEnter={() => setAutoPaused(true)}
                  onMouseLeave={() => setAutoPaused(false)}
                >
                  {games.slice(0, 12).map(game => (
                    <Link
                      key={game.id}
                      data-game-card
                      href={`/game-resource?id=${game.id}`}
                      className="shrink-0 w-36 md:w-44 snap-start rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1 overflow-hidden group/card"
                    >
                      {/* 封面图 */}
                      <div className="aspect-[3/4] relative overflow-hidden bg-black/30">
                        {game.coverImage?.startsWith('http') ? (
                          <img
                            src={game.coverImage}
                            alt={game.name}
                            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">🎮</div>
                        )}
                        {/* 渐变遮罩 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        {/* 名称浮在底部 */}
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <h3 className="text-xs md:text-sm font-bold text-white line-clamp-2 leading-tight drop-shadow">{game.name}</h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========== 开源项目紧凑展示区 ========== */}
      {projects.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 -mt-4 relative z-10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              开源项目
            </h2>
            <a href="https://github.com/xinyuzjj?tab=repositories" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-purple-600 transition-colors flex items-center gap-1">
              GitHub →
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {projects.map(p => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 ring-1 ring-gray-100">
                  <img src={p.icon} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-gray-800 truncate group-hover:text-purple-600 transition-colors">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getLangColor(p.language) }} />
                    <span className="text-[10px] text-gray-450 truncate">{p.language}</span>
                    {p.stars > 0 && (
                      <span className="text-[10px] text-gray-400 shrink-0 ml-auto flex items-center gap-0.5">
                        ★{p.stars}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ========== 主内容：最新资源（保持原有样式不变）========== */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">最新资源</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 rounded-lg text-xs bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-red-300 hover:text-red-600 transition-colors font-medium cursor-pointer"
              >
                顺序 {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <span className="text-sm text-gray-500">共 {filteredResources.length} 条记录</span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={`skeleton-${i}`} className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredResources.map(resource => (
                <div key={resource.id} className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium mt-0.5">
                      峻
                    </span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 hover:text-red-600 transition-colors mb-2">
                        {resource.title}
                      </h3>
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {resource.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-base text-gray-700 mb-4">
                        {resource.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4 border-t border-gray-100 pt-4 justify-end">
                    {resource.quarkLink && (
                      <a 
                        href={resource.quarkLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                      >
                        🔴 夸克
                      </a>
                    )}
                    {resource.baiduLink && (
                      <a 
                        href={resource.baiduLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        🔵 百度
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-gray-200 py-8 px-6 md:px-8 bg-white mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            © 2026 峻峻尼分享 | 优质资源分享平台
          </p>
        </div>
      </footer>

      {/* ========== 悬浮公众号关注窗（始终可见） ========== */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {/* 展开后的二维码卡片 */}
        {wechatOpen && (
          <div className="bg-white rounded-2xl shadow-2xl shadow-emerald-200/60 ring-1 ring-emerald-200/50 p-3 w-72 origin-bottom-right">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.5c.86.26 1.77.41 2.72.45A5.63 5.63 0 019 14c0-3.31 3.13-6 7-6 .55 0 1.09.06 1.61.16C16.79 5.18 13.47 4 9.5 4zm-2 5a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zM16 9c-3.31 0-6 2.24-6 5s2.69 5 6 5c.67 0 1.32-.1 1.93-.27L20 20l-.62-1.87C20.95 17.22 22 15.71 22 14c0-2.76-2.69-5-6-5zm-2.5 3a1 1 0 110-2 1 1 0 010 2zm5 0a1 1 0 110-2 1 1 0 010 2z"/></svg>
                <span className="text-sm font-bold text-gray-800">关注公众号</span>
              </div>
              <button
                onClick={() => setWechatOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="关闭"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <img
              src="/wechat-qr-square.png"
              alt="微信搜一搜「峻峻尼」关注公众号"
              className="w-full h-auto rounded-xl border border-gray-100"
            />
            <p className="text-xs text-center text-emerald-600 font-medium mt-2">微信搜索「峻峻尼」关注</p>
          </div>
        )}
        {/* 触发按钮 */}
        <button
          onClick={() => setWechatOpen(v => !v)}
          className="group flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full shadow-lg shadow-emerald-300/50 hover:shadow-xl px-4 py-3 transition-all duration-200"
          aria-label="关注公众号"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.5c.86.26 1.77.41 2.72.45A5.63 5.63 0 019 14c0-3.31 3.13-6 7-6 .55 0 1.09.06 1.61.16C16.79 5.18 13.47 4 9.5 4zm-2 5a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zM16 9c-3.31 0-6 2.24-6 5s2.69 5 6 5c.67 0 1.32-.1 1.93-.27L20 20l-.62-1.87C20.95 17.22 22 15.71 22 14c0-2.76-2.69-5-6-5zm-2.5 3a1 1 0 110-2 1 1 0 010 2zm5 0a1 1 0 110-2 1 1 0 010 2z"/></svg>
          <span className="text-sm font-bold pr-1 whitespace-nowrap">关注公众号</span>
        </button>
      </div>
      {/* ========== 入站公众号关注弹窗 ========== */}
      {showWechatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowWechatModal(false);
              localStorage.setItem('wb_wechat_modal_dismissed', '1');
            }}
            aria-hidden="true"
          />
          {/* 弹窗卡片 */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowWechatModal(false);
                localStorage.setItem('wb_wechat_modal_dismissed', '1');
              }}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100/80 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="关闭"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* 顶部装饰条 */}
            <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400" />

            {/* 内容区 */}
            <div className="p-7 pt-5 flex flex-col items-center">
              {/* 标题 */}
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.5c.86.26 1.77.41 2.72.45A5.63 5.63 0 019 14c0-3.31 3.13-6 7-6 .55 0 1.09.06 1.61.16C16.79 5.18 13.47 4 9.5 4zm-2 5a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zM16 9c-3.31 0-6 2.24-6 5s2.69 5 6 5c.67 0 1.32-.1 1.93-.27L20 20l-.62-1.87C20.95 17.22 22 15.71 22 14c0-2.76-2.69-5-6-5zm-2.5 3a1 1 0 110-2 1 1 0 010 2zm5 0a1 1 0 110-2 1 1 0 010 2z"/></svg>
                <h2 className="text-xl font-extrabold text-gray-900">关注公众号</h2>
              </div>
              <p className="text-base font-bold text-emerald-600 mb-0.5">峻峻尼</p>
              <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
                扫码或微信搜索「峻峻尼」关注<br/>
                每日推送最新游戏资源和更新
              </p>

              {/* 大二维码 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-3 shadow-inner border border-green-100 mb-5">
                <img
                  src="/wechat-qr-square.png"
                  alt="微信搜一搜「峻峻尼」关注"
                  className="w-56 h-auto rounded-xl shadow-sm"
                  draggable="false"
                />
              </div>

              {/* 底部按钮组 */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setShowWechatModal(false);
                    localStorage.setItem('wb_wechat_modal_dismissed', '1');
                  }}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  稍后再说
                </button>
                <button
                  onClick={() => {
                    setShowWechatModal(false);
                    localStorage.setItem('wb_wechat_modal_dismissed', '1');
                  }}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl transition-colors shadow-md shadow-green-200"
                >
                  ✅ 已关注
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-3 text-center">扫码关注后，点击「已关注」关闭</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
