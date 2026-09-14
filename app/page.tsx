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

/** 模块级标记：一次页面加载只上报一次浏览，避免 React 重渲染重复计数 */
let homeCounted = false;

/* ======================== 小组件 ======================== */

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-ink shadow-hard-sm px-3.5 py-2 text-center min-w-[88px]">
      <span className="block text-[21px] leading-tight font-black tracking-tight tabular-nums text-ink">{value}</span>
      <span className="text-[10.5px] text-moss">{label}</span>
    </div>
  );
}

/** 主页浏览次数卡片（松针绿填充，视觉上独立于其他统计） */
function VisitCard({ value }: { value: number | null }) {
  return (
    <div
      className="rounded-xl bg-pine text-white border-2 border-ink shadow-hard-sm px-3.5 py-2 text-center min-w-[104px]"
      title={value === null ? '统计服务待启用' : '主页累计被浏览的次数'}
    >
      <span className="flex items-center justify-center gap-1 text-[21px] leading-tight font-black tracking-tight tabular-nums">
        <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.04 12.32a1 1 0 010-.64C3.42 7.51 7.36 4.5 12 4.5s8.58 3.01 9.96 7.18a1 1 0 010 .64C20.58 16.49 16.64 19.5 12 19.5s-8.58-3.01-9.96-7.18z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {value === null ? '—' : value.toLocaleString()}
      </span>
      <span className="text-[10.5px] opacity-85">主页浏览次数</span>
    </div>
  );
}

export default function HomePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gameTotal, setGameTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [wechatOpen, setWechatOpen] = useState(false);
  const [showWechatModal, setShowWechatModal] = useState(false);
  const [homeViews, setHomeViews] = useState<number | null>(null);

  // 入站弹窗：首次访问显示公众号关注（localStorage 记录，关闭后不再弹）
  useEffect(() => {
    const hidden = localStorage.getItem('wb_wechat_modal_dismissed');
    if (!hidden) {
      // 延迟1秒再弹出，让页面先渲染完
      const t = setTimeout(() => setShowWechatModal(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  // 页面底色跟随薄荷白，避免回弹时露出深色
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#EFF6F0';
    return () => { document.body.style.background = prev; };
  }, []);

  /* ---- 主页浏览计数：一次加载只 POST 一次 ---- */
  useEffect(() => {
    if (homeCounted) return;
    homeCounted = true;
    fetch('/api/visits', { method: 'POST' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setHomeViews(d && d.ok && typeof d.count === 'number' ? d.count : null))
      .catch(() => setHomeViews(null));
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
      fetch('/game-resources.json').then(res => res.json()).catch(() => null),
    ])
      .then(([resourcesData, projectsData, gameData]) => {
        setResources(Array.isArray(resourcesData) ? resourcesData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        const gamesData: Game[] = gameData?.resources || [];
        if (typeof gameData?.count === 'number') setGameTotal(gameData.count);
        else setGameTotal(gamesData.length);
        // 取有封面图的游戏，优先展示，最多12个
        const withCover = gamesData.filter((g: Game) => g.coverImage && g.coverImage.startsWith('http'));
        const featured = withCover.length >= 8 ? withCover : gamesData.slice(0, 12);
        setGames(featured.slice(0, 12));
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
    return colors[lang] || '#586A5D';
  };

  const num = (n: number) => (loading ? '—' : n.toLocaleString());

  return (
    <div className="min-h-screen bg-paper text-ink">

      {/* ========== 顶部导航栏（固定在最顶部）========== */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 py-2.5 md:py-0 md:min-h-[68px]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 font-black text-lg md:text-xl whitespace-nowrap">
              <span className="grid place-items-center w-8 h-[34px] rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs text-[18px]">
                峻
              </span>
              <span>峻峻尼分享</span>
              <span className="font-mono text-[10px] tracking-[1.4px] text-moss font-semibold hidden sm:inline">ARCHIVE</span>
            </Link>

            {/* 搜索 + 按钮 */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 min-w-0 md:w-60">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pine pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索资源…"
                  className="w-full bg-paper border-2 border-ink rounded-lg py-2.5 pl-10 pr-3 text-sm font-medium text-ink placeholder-moss/70 outline-none focus:bg-white focus:border-pine shadow-hard-xs transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <nav className="flex items-center gap-2 text-[13px] font-bold">
                <Link
                  href="/game-resource"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs hover:bg-pine-deep transition-colors whitespace-nowrap"
                >
                  🎮 游戏资源
                </Link>
                <a
                  href="https://github.com/xinyuzjj"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex px-3 py-2 rounded-lg bg-white border-2 border-ink shadow-hard-xs hover:bg-pine-light transition-colors whitespace-nowrap"
                >
                  GitHub ↗
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* ========== Hero ========== */}
      <section className="dot-grid border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-11">
          <div className="grid lg:grid-cols-[1fr_auto] gap-7 lg:items-end">
            <div>
              <p className="font-mono text-[11px] tracking-[1.8px] text-moss font-semibold">RESOURCE ARCHIVE</p>
              <h1 className="mt-2.5 mb-3 text-[32px] md:text-[40px] leading-[1.2] font-black tracking-tight">
                <span className="shadow-[inset_0_-0.34em_#B5D4B8]">峻峻尼资源分享</span>
              </h1>
              <p className="text-sm text-moss max-w-xl leading-relaxed">
                PC 游戏 · 开源项目 · 实用工具 · 夸克 / 百度双网盘。全部免费直链，无充值、无会员。
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <StatCard value={num(gameTotal)} label="款 PC 游戏" />
              <StatCard value={num(resources.length)} label="条精选资源" />
              <StatCard value={num(projects.length)} label="个开源项目" />
              <VisitCard value={homeViews} />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* ========== 热门游戏横向滚动轮播 ========== */}
        {games.length > 0 && (
          <section className="pt-7">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <span className="text-lg">🔥</span> 热门游戏推荐
              </h2>
              <Link
                href="/game-resource"
                className="text-xs font-bold text-pine underline underline-offset-4 hover:text-pine-deep transition-colors flex items-center gap-1 group/link"
              >
                查看全部
                <svg className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="relative group/carousel">
              {/* 左箭头 */}
              <button
                onClick={() => scrollGames('left')}
                aria-label="向左滚动"
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white border-2 border-ink shadow-hard-sm text-ink hover:bg-pine hover:text-white transition-colors duration-200 -ml-1 ${canScrollLeft ? '' : 'pointer-events-none'}`}
                style={{ opacity: canScrollLeft ? undefined : 0 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>

              {/* 右箭头 */}
              <button
                onClick={() => scrollGames('right')}
                aria-label="向右滚动"
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white border-2 border-ink shadow-hard-sm text-ink hover:bg-pine hover:text-white transition-colors duration-200 -mr-1 ${canScrollRight ? '' : 'pointer-events-none'}`}
                style={{ opacity: canScrollRight ? undefined : 0 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>

              {/* 卡片列表 */}
              <div
                ref={gameScrollRef}
                className="flex gap-3.5 overflow-x-auto pb-4 -mx-4 px-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' as any }}
                onMouseEnter={() => setAutoPaused(true)}
                onMouseLeave={() => setAutoPaused(false)}
              >
                {games.map(game => (
                  <Link
                    key={game.id}
                    data-game-card
                    href={`/game-resource?id=${game.id}`}
                    className="group/card shrink-0 w-36 md:w-44 snap-start rounded-xl bg-white border-2 border-ink shadow-hard overflow-hidden cursor-pointer transition-all duration-200 hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-hard-lg"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-pine-light border-b-2 border-ink">
                      {game.coverImage?.startsWith('http') ? (
                        <img
                          src={game.coverImage}
                          alt={game.name}
                          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 ease-out"
                          loading="lazy"
                        />
                      ) : (
                        <div className="dot-grid absolute inset-0 grid place-items-center">
                          <span className="text-[40px] font-black text-pine-deep/35 select-none">{game.name.slice(0, 1)}</span>
                        </div>
                      )}
                      {/* 分类角标 */}
                      <span className="absolute top-2 left-2 z-10 rounded-md bg-pine text-white border-[1.5px] border-ink shadow-hard-xs px-1.5 py-[2px] text-[10px] font-bold">
                        {game.category}
                      </span>
                      {/* 渐变遮罩 + 名称 */}
                      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                      <h3 className="absolute bottom-0 left-0 right-0 p-2 text-[11px] md:text-xs font-bold text-white line-clamp-2 leading-tight">
                        {game.name}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ========== 开源项目 ========== */}
        {projects.length > 0 && (
          <section className="pt-5">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-pine" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                开源项目
              </h2>
              <a
                href="https://github.com/xinyuzjj?tab=repositories"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-pine underline underline-offset-4 hover:text-pine-deep transition-colors"
              >
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
                  className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-white border-2 border-ink shadow-hard-sm hover:bg-pine-light hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border-2 border-ink bg-paper">
                    <img src={p.icon} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-ink truncate group-hover:text-pine-deep transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 ring-1 ring-ink/25" style={{ backgroundColor: getLangColor(p.language) }} />
                      <span className="text-[10px] text-moss truncate">{p.language}</span>
                      {p.stars > 0 && (
                        <span className="text-[10px] text-moss shrink-0 ml-auto">★{p.stars}</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ========== 最新资源 ========== */}
        <section className="pt-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black tracking-tight">最新资源</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border-2 border-ink shadow-hard-xs hover:bg-pine-light transition-colors cursor-pointer"
              >
                顺序 {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <span className="text-xs text-moss">共 {filteredResources.length} 条记录</span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={`skeleton-${i}`} className="p-5 rounded-xl bg-white border-2 border-ink shadow-hard">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-pine-light animate-pulse" />
                    <div className="flex-1">
                      <div className="w-3/4 h-5 bg-pine-light rounded animate-pulse mb-3" />
                      <div className="h-4 bg-pine-light rounded animate-pulse mb-2" />
                      <div className="h-4 w-2/3 bg-pine-light rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex gap-2.5 justify-end pt-3.5 border-t border-dashed border-sage">
                    <div className="w-20 h-8 bg-paper border border-sage rounded-lg animate-pulse" />
                    <div className="w-20 h-8 bg-paper border border-sage rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResources.map(resource => (
                <div
                  key={resource.id}
                  className="rounded-xl bg-white border-2 border-ink shadow-hard p-5 transition-all duration-200 hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-hard-lg"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid place-items-center w-7 h-7 rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs text-[13px] font-black shrink-0 mt-0.5">
                      峻
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-extrabold leading-snug mb-2">
                        {resource.title}
                      </h3>
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {resource.tags.map(tag => (
                            <span key={tag} className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-paper text-moss border border-sage">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-moss leading-relaxed">
                        {resource.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 mt-4 pt-3.5 border-t border-dashed border-sage justify-end">
                    {resource.quarkLink && (
                      <a
                        href={resource.quarkLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-pine text-white shadow-hard-sm px-4 py-2 text-xs font-bold transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs"
                      >
                        🔴 夸克网盘
                      </a>
                    )}
                    {resource.baiduLink && (
                      <a
                        href={resource.baiduLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-white text-ink shadow-hard-sm px-4 py-2 text-xs font-bold transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs hover:bg-pine-light"
                      >
                        🔵 百度网盘
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========== 页脚 ========== */}
        <footer className="mt-14 pb-10">
          <div className="border-t-2 border-ink pt-7">
            <p className="text-center text-xs text-moss">
              © 2026 峻峻尼分享 · 优质资源分享平台 · 仅供个人学习交流
            </p>
            <p className="text-center font-mono text-[11px] tracking-wider text-moss/80 mt-2">
              本页已被浏览 <span className="font-bold text-pine tabular-nums">{homeViews === null ? '—' : homeViews.toLocaleString()}</span> 次
            </p>
          </div>
        </footer>
      </main>

      {/* ========== 悬浮公众号关注窗（始终可见） ========== */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {/* 展开后的二维码卡片 */}
        {wechatOpen && (
          <div className="anim-in bg-white rounded-xl border-2 border-ink shadow-hard-lg p-3 w-72 origin-bottom-right">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-pine" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.5c.86.26 1.77.41 2.72.45A5.63 5.63 0 019 14c0-3.31 3.13-6 7-6 .55 0 1.09.06 1.61.16C16.79 5.18 13.47 4 9.5 4zm-2 5a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zM16 9c-3.31 0-6 2.24-6 5s2.69 5 6 5c.67 0 1.32-.1 1.93-.27L20 20l-.62-1.87C20.95 17.22 22 15.71 22 14c0-2.76-2.69-5-6-5zm-2.5 3a1 1 0 110-2 1 1 0 010 2zm5 0a1 1 0 110-2 1 1 0 010 2z"/></svg>
                <span className="text-sm font-bold text-ink">关注公众号</span>
              </div>
              <button
                onClick={() => setWechatOpen(false)}
                className="grid place-items-center w-6 h-6 rounded-md border-[1.5px] border-ink bg-white shadow-hard-xs text-ink hover:bg-pine-light transition-colors"
                aria-label="关闭"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <img
              src="/wechat-qr-square.png"
              alt="微信搜一搜「峻峻尼」关注公众号"
              className="w-full h-auto rounded-lg border-2 border-ink"
            />
            <p className="text-xs text-center text-pine-deep font-bold mt-2">微信搜索「峻峻尼」关注</p>
          </div>
        )}
        {/* 触发按钮 */}
        <button
          onClick={() => setWechatOpen(v => !v)}
          className="group flex items-center gap-2 bg-pine hover:bg-pine-deep text-white rounded-xl border-2 border-ink shadow-hard px-4 py-3 transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-sm"
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
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => {
              setShowWechatModal(false);
              localStorage.setItem('wb_wechat_modal_dismissed', '1');
            }}
            aria-hidden="true"
          />
          {/* 弹窗卡片 */}
          <div className="anim-in relative bg-white rounded-2xl border-2 border-ink shadow-hard-xl max-w-sm w-full overflow-hidden">
            {/* 关闭按钮 */}
            <button
              onClick={() => {
                setShowWechatModal(false);
                localStorage.setItem('wb_wechat_modal_dismissed', '1');
              }}
              className="absolute top-3 right-3 z-10 grid place-items-center w-8 h-8 rounded-lg bg-white border-2 border-ink shadow-hard-xs text-ink hover:bg-pine-light transition-colors"
              aria-label="关闭"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* 顶部装饰条 */}
            <div className="h-1.5 bg-pine" />

            {/* 内容区 */}
            <div className="p-7 pt-5 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-7 h-7 text-pine" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 4C5.36 4 2 6.69 2 10c0 1.89 1.08 3.56 2.78 4.66L4 17l2.5-1.5c.86.26 1.77.41 2.72.45A5.63 5.63 0 019 14c0-3.31 3.13-6 7-6 .55 0 1.09.06 1.61.16C16.79 5.18 13.47 4 9.5 4zm-2 5a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2zM16 9c-3.31 0-6 2.24-6 5s2.69 5 6 5c.67 0 1.32-.1 1.93-.27L20 20l-.62-1.87C20.95 17.22 22 15.71 22 14c0-2.76-2.69-5-6-5zm-2.5 3a1 1 0 110-2 1 1 0 010 2zm5 0a1 1 0 110-2 1 1 0 010 2z"/></svg>
                <h2 className="text-xl font-black text-ink">关注公众号</h2>
              </div>
              <p className="text-base font-black text-pine mb-0.5">峻峻尼</p>
              <p className="text-sm text-moss text-center mb-5 leading-relaxed">
                扫码或微信搜索「峻峻尼」关注<br/>
                每日推送最新游戏资源和更新
              </p>

              <div className="bg-paper rounded-xl p-3 border-2 border-ink shadow-hard-sm mb-5">
                <img
                  src="/wechat-qr-square.png"
                  alt="微信搜一搜「峻峻尼」关注"
                  className="w-56 h-auto rounded-lg"
                  draggable="false"
                />
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setShowWechatModal(false);
                    localStorage.setItem('wb_wechat_modal_dismissed', '1');
                  }}
                  className="flex-1 py-2.5 px-4 text-sm font-bold text-moss bg-paper border-2 border-ink shadow-hard-xs rounded-lg hover:bg-pine-light transition-colors"
                >
                  稍后再说
                </button>
                <button
                  onClick={() => {
                    setShowWechatModal(false);
                    localStorage.setItem('wb_wechat_modal_dismissed', '1');
                  }}
                  className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-pine rounded-lg border-2 border-ink shadow-hard-sm hover:bg-pine-deep transition-colors"
                >
                  ✅ 已关注
                </button>
              </div>

              <p className="text-xs text-moss mt-3 text-center">扫码关注后，点击「已关注」关闭</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
