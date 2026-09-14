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

/* ======================== 派生逻辑 ======================== */

/** 票券左侧缩写：优先取标题「：」后的主名首两个字母（Mineradio → Mi） */
function stubSymbol(title: string): string {
  const main = title.includes('：') ? title.split('：').pop()!.trim() : title;
  const latin = main.match(/[A-Za-z][A-Za-z0-9+\-_.]*/);
  if (latin) {
    const w = latin[0];
    return w.length >= 2 ? w.slice(0, 2) : w.toUpperCase();
  }
  return main.slice(0, 2) || '资';
}

/** 票券左侧分类标签：优先用非 github 的首个标签 */
const TAG_LABEL: Record<string, string> = {
  github: '开源', pc: 'PC', mac: 'Mac', windows: 'Windows',
  linux: 'Linux', ios: 'iOS', android: '安卓', web: 'Web',
};
function stubLabel(tags?: string[]): string {
  if (!tags?.length) return '资源';
  const pick = tags.find(t => t.toLowerCase() !== 'github') || tags[0];
  return TAG_LABEL[pick.toLowerCase()] || pick;
}

/** 取出真实提取码（百度/夸克链接里的 pwd 参数），没有就不显示 */
function getPwd(item: Resource): string | null {
  const pick = (url?: string) => {
    if (!url) return null;
    const m = url.match(/[?&]pwd=([A-Za-z0-9]{4})/);
    return m ? m[1] : null;
  };
  return pick(item.baiduLink) || pick(item.quarkLink);
}

/* ======================== 浏览次数 ======================== */

type ViewSource = 'kv' | 'ext' | null;

interface ViewStat {
  count: number;
  today: number | null;
  source: ViewSource;
}

/** 零配置兜底服务（自建 KV 未绑定时使用） */
const EXT_NS = 'xyjunjunni-space';
const EXT_KEY = 'home';

/** 读取（不自增）：自建 KV 优先，失败则降级到第三方 */
async function readViews(): Promise<ViewStat | null> {
  try {
    const r = await fetch('/api/visits', { cache: 'no-store' });
    if (r.ok) {
      const d = await r.json();
      if (d?.ok && typeof d.count === 'number') {
        return { count: d.count, today: typeof d.today === 'number' ? d.today : null, source: 'kv' };
      }
    }
  } catch { /* 继续降级 */ }

  try {
    const r = await fetch(`https://abacus.jasoncameron.dev/get/${EXT_NS}/${EXT_KEY}`, { cache: 'no-store' });
    const d = await r.json();
    if (typeof d?.value === 'number') return { count: d.value, today: null, source: 'ext' };
  } catch { /* 放弃 */ }

  return null;
}

/** 上报一次浏览：自建 KV 优先，失败则降级到第三方 */
async function bumpViews(): Promise<ViewStat | null> {
  try {
    const r = await fetch('/api/visits', { method: 'POST' });
    if (r.ok) {
      const d = await r.json();
      if (d?.ok && typeof d.count === 'number') {
        return { count: d.count, today: typeof d.today === 'number' ? d.today : null, source: 'kv' };
      }
    }
  } catch { /* 继续降级 */ }

  try {
    const r = await fetch(`https://abacus.jasoncameron.dev/hit/${EXT_NS}/${EXT_KEY}`, { cache: 'no-store' });
    const d = await r.json();
    if (typeof d?.value === 'number') return { count: d.value, today: null, source: 'ext' };
  } catch { /* 放弃 */ }

  return null;
}

/** 数字滚动：从 0（或上一次的值）缓动到目标，rAF 驱动 */
function useCountUp(target: number | null, duration = 1500) {
  const [cur, setCur] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (target === null) return;
    const from = fromRef.current;
    if (from === target) return;

    // 第一次出现：从 0 开始滚；后续变化：从当前值滚，时长按变化量收敛
    const span = Math.max(1, Math.abs(target - from));
    const dur = Math.min(duration, Math.max(420, span * 6));

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setCur(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  // target 从 null 变成数字时，fromRef 还是 0，正好是「从 0 滚起」
  return cur;
}

const DIGITS = Array.from({ length: 10 }, (_, i) => i);

/** 单个数字滚筒 */
function DigitRoller({ d, height }: { d: number; height: string }) {
  return (
    <span className="relative inline-block overflow-hidden align-baseline" style={{ height, width: '0.62em' }}>
      <span
        className="absolute inset-x-0 top-0 will-change-transform"
        style={{ transform: `translateY(-${d * 10}%)` }}
      >
        {DIGITS.map(n => (
          <span
            key={n}
            className="block text-center tabular-nums font-black"
            style={{ height, lineHeight: height }}
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

/** 数字滚筒显示器 */
function Odometer({ value, height }: { value: number; height: string }) {
  const text = value.toLocaleString('en-US');
  return (
    <span className="inline-flex items-baseline leading-none">
      {text.split('').map((ch, i) =>
        ch === ',' ? (
          <span key={`s${i}`} className="font-black tabular-nums" style={{ height, lineHeight: height }}>,</span>
        ) : (
          <DigitRoller key={`d${i}`} d={Number(ch)} height={height} />
        )
      )}
    </span>
  );
}

/** 实时候车条：LIVE 脉冲 + 滚动的浏览次数 */
function LiveVisits({ stat, ready }: { stat: ViewStat | null; ready: boolean }) {
  const count = stat?.count ?? null;
  const shown = useCountUp(count);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (count === null) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <section className="relative overflow-hidden bg-pine text-white border-b-2 border-ink">
      {/* 背景点阵 + 顶部高光 */}
      <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'radial-gradient(#FFFFFF 0.8px, transparent 0.8px)', backgroundSize: '18px 18px' }} />
      <div className="absolute inset-x-0 top-0 h-px bg-white/25" />

      <div className="relative max-w-[1120px] mx-auto px-4 md:px-6 py-3 md:py-3.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 md:gap-x-4">
        {/* LIVE 指示 */}
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[1.6px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          LIVE
        </span>

        <span className="text-[12px] md:text-[13px] opacity-85 whitespace-nowrap">主页已被浏览</span>

        {count === null ? (
          <span className="font-mono text-[22px] md:text-[26px] font-black leading-none opacity-70">
            {ready ? '—' : '···'}
          </span>
        ) : (
          <span
            className={`text-[24px] md:text-[28px] leading-none transition-opacity duration-500 ${pulse ? 'opacity-100' : 'opacity-95'}`}
          >
            <Odometer value={shown} height="1.06em" />
          </span>
        )}

        <span className="text-[12px] md:text-[13px] opacity-85">次</span>

        {stat?.today != null && stat.today > 0 && (
          <span className="font-mono text-[10px] md:text-[11px] bg-white/15 border border-white/25 rounded-full px-2 py-[3px] tracking-wide">
            今日 +{stat.today}
          </span>
        )}
      </div>
    </section>
  );
}

/* ======================== 小组件 ======================== */

/** 区块标题：编号徽章 + 标题 + 右侧链接/说明 */
function SectionHead({ index, title, right }: { index: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="flex items-center gap-2.5 text-[19px] md:text-xl font-black tracking-tight">
        <span className="font-mono text-[11px] font-bold tracking-[1px] text-pine-deep border border-sage rounded px-1.5 py-1">
          {index}
        </span>
        {title}
      </h2>
      {right}
    </div>
  );
}

/** 游戏卡：16:10 封面 + 角标，标题在封面下方，底部虚线行 */
function GameCard({ game }: { game: Game }) {
  const hasCover = !!game.coverImage?.startsWith('http');
  return (
    <Link
      data-game-card
      href={`/game-resource?id=${game.id}`}
      className="group/card block min-w-0 bg-white border-2 border-ink rounded-[10px] shadow-hard overflow-hidden transition-colors duration-200 hover:border-pine"
    >
      <div className="relative aspect-[16/10] border-b-2 border-ink bg-pine-light overflow-hidden">
        {hasCover ? (
          <img
            src={game.coverImage}
            alt={`${game.name} 封面`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="dot-grid absolute inset-0 grid place-items-center">
            <span className="text-[42px] font-black text-pine-deep/35 select-none">{game.name.slice(0, 1)}</span>
          </div>
        )}
        <span className="absolute top-2.5 left-2.5 bg-white border-[1.5px] border-ink rounded px-2 py-[2px] text-[10px] font-extrabold text-ink">
          游戏推荐
        </span>
      </div>
      <div className="px-3.5 py-3">
        <h3 className="text-sm font-extrabold leading-[1.55] min-h-[44px] line-clamp-2">{game.name}</h3>
        <div className="flex items-center justify-between gap-2 border-t border-dashed border-sage pt-2 text-[11px]">
          <span className="text-moss truncate">{game.category}</span>
          <span className="font-bold text-pine-deep whitespace-nowrap">查看详情 ↗</span>
        </div>
      </div>
    </Link>
  );
}

/** 票券式资源卡：左侧 stub（撕票缺口）＋ 中部内容 ＋ 右侧网盘按钮列 */
function Ticket({ item, featured }: { item: Resource; featured: boolean }) {
  const pwd = getPwd(item);
  const tags = item.tags || [];
  return (
    <article className="ticket group/ticket grid grid-cols-[59px_minmax(0,1fr)] md:grid-cols-[96px_minmax(0,1fr)_165px] bg-white border-2 border-ink rounded-xl shadow-hard overflow-hidden transition-colors duration-200 hover:border-pine">
      {/* 左侧票根 */}
      <div
        className={`relative flex flex-col items-center justify-center gap-2 border-r-2 border-dashed border-ink py-4 md:py-0 row-span-2 md:row-span-1 ${
          featured ? 'bg-pine text-white' : 'bg-pine-light text-ink'
        }`}
      >
        <span className="text-[19px] md:text-[25px] leading-none font-black tracking-tight">
          {stubSymbol(item.title)}
        </span>
        <span className="font-mono text-[10px] md:text-[11px] font-bold tracking-wide">
          {stubLabel(tags)}
        </span>
        {/* 撕票缺口（配合父级 overflow-hidden 形成打孔效果） */}
        <span className="absolute w-[18px] h-[18px] rounded-full border-2 border-ink bg-paper -right-[10px] -top-[11px]" />
        <span className="absolute w-[18px] h-[18px] rounded-full border-2 border-ink bg-paper -right-[10px] -bottom-[11px]" />
      </div>

      {/* 中部内容 */}
      <div className="px-3.5 pt-3.5 md:px-6 md:pt-5 md:pb-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[15px] md:text-[18px] leading-[1.5] font-extrabold min-w-0 break-words">
            {item.title}
          </h3>
          {pwd && (
            <span className="font-mono text-[12px] text-moss whitespace-nowrap">提取码 {pwd}</span>
          )}
        </div>
        <p className="text-[12px] md:text-[13px] text-moss leading-relaxed mt-1.5 mb-2.5">
          {item.desc}
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <span
                key={t}
                className={`text-[11px] leading-[1.5] border rounded px-1.5 py-[1px] ${
                  i === 0 ? 'bg-pine-light text-pine-deep border-sage' : 'bg-paper text-moss border-sage'
                }`}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 右侧网盘按钮 */}
      <div className="col-start-2 md:col-auto flex flex-row md:flex-col md:justify-center gap-2 px-3.5 pb-3.5 md:px-0 md:py-5 md:pr-[18px]">
        {item.quarkLink && (
          <a
            href={item.quarkLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-none inline-flex items-center justify-between gap-2 rounded-md border-[1.5px] border-ink bg-pine-light text-pine-deep text-[11px] md:text-xs font-extrabold px-2.5 py-2 min-h-[36px] transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            夸克网盘 <span>↗</span>
          </a>
        )}
        {item.baiduLink && (
          <a
            href={item.baiduLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-none inline-flex items-center justify-between gap-2 rounded-md border-[1.5px] border-ink bg-white text-ink text-[11px] md:text-xs font-extrabold px-2.5 py-2 min-h-[36px] transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-pine-light"
          >
            百度网盘 <span>↗</span>
          </a>
        )}
      </div>
    </article>
  );
}

/** 开源项目卡：顶部图标 + ↗，名称，语言 */
function ProjectCard({ p }: { p: Project }) {
  const [iconOk, setIconOk] = useState(true);
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white border-2 border-ink rounded-[10px] shadow-hard-sm px-3.5 py-4 transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard-xs"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="grid place-items-center w-[30px] h-[30px] rounded-md border-[1.5px] border-ink bg-paper overflow-hidden shrink-0">
          {p.icon && iconOk ? (
            <img src={p.icon} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setIconOk(false)} />
          ) : (
            <span className="text-[15px] leading-none">{p.emoji}</span>
          )}
        </span>
        <span className="font-bold text-pine-deep">↗</span>
      </div>
      <h3 className="text-sm font-extrabold leading-[1.5] mb-2 break-words">{p.name}</h3>
      <p className="font-mono text-[11px] leading-[1.5] text-moss flex items-center gap-1.5 flex-wrap">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-pine shrink-0" />
        {p.language}
        {p.stars > 0 && <span className="text-pine-deep font-bold">· ★{p.stars}</span>}
      </p>
    </a>
  );
}

/* ======================== 主页面 ======================== */

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
  const [viewStat, setViewStat] = useState<ViewStat | null>(null);
  const [viewsReady, setViewsReady] = useState(false);

  // 入站弹窗：首次访问显示公众号关注（localStorage 记录，关闭后不再弹）
  useEffect(() => {
    const hidden = localStorage.getItem('wb_wechat_modal_dismissed');
    if (!hidden) {
      // 延迟1秒再弹出，让页面先渲染完
      const t = setTimeout(() => setShowWechatModal(true), 1000);
      return () => clearTimeout(t);
    }
  }, []);

  // 页面底色与锚点滚动跟随薄荷白主题
  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevScroll = document.documentElement.style.scrollBehavior;
    document.body.style.background = '#EFF6F0';
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.body.style.background = prevBg;
      document.documentElement.style.scrollBehavior = prevScroll;
    };
  }, []);

  /* ---- 主页浏览计数：一次加载只 POST 一次，之后定时只读刷新 ---- */
  useEffect(() => {
    let alive = true;

    const report = async () => {
      if (homeCounted) {
        const s = await readViews();
        if (alive && s) setViewStat(s);
        return;
      }
      homeCounted = true;
      const s = await bumpViews();
      if (!alive) return;
      if (s) setViewStat(s);
      setViewsReady(true);
    };

    report();

    // 定时只读刷新，让数字保持「活」的
    const timer = setInterval(report, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') report(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
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
    const cardWidth = el.querySelector('[data-game-card]')?.clientWidth || 267;
    const scrollAmount = dir === 'left' ? -cardWidth * 2 : cardWidth * 2;
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
        setGameTotal(typeof gameData?.count === 'number' ? gameData.count : gamesData.length);
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

  return (
    <div className="min-h-screen bg-paper text-ink">

      {/* ========== 顶栏 ========== */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6">
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-6 py-3.5 md:py-0 md:min-h-[78px]">
            {/* 站名 */}
            <Link href="/" className="flex items-center gap-2.5 font-black text-[18px] md:text-[23px] whitespace-nowrap">
              <span className="grid place-items-center w-[29px] h-[31px] md:w-[34px] md:h-[36px] rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs text-[17px] md:text-[21px]">
                峻
              </span>
              <span>峻峻尼分享</span>
              <span className="hidden md:inline-block font-bold text-[11px] bg-pine-light border-[1.5px] border-ink rounded px-2 py-[2px] -rotate-3 ml-1">
                发现 · 整理 · 分享
              </span>
            </Link>

            {/* 导航 */}
            <nav className="flex items-center gap-1.5 md:gap-2.5 text-[11px] md:text-sm font-bold">
              <Link
                href="/game-resource"
                className="px-[7px] md:px-3 py-[7px] md:py-2 rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs whitespace-nowrap hover:bg-pine-deep transition-colors"
              >
                游戏库 ↗
              </Link>
              <a href="#resources" className="hidden md:inline-block px-3 py-2 rounded-lg border-2 border-transparent hover:bg-paper transition-colors">
                最新资源
              </a>
              <a href="#projects" className="hidden md:inline-block px-3 py-2 rounded-lg border-2 border-transparent hover:bg-paper transition-colors">
                开源项目
              </a>
              <a
                href="https://github.com/xinyuzjj"
                target="_blank"
                rel="noopener noreferrer"
                className="px-[7px] md:px-3 py-[7px] md:py-2 rounded-lg bg-white border-2 border-ink shadow-hard-xs whitespace-nowrap hover:bg-pine-light transition-colors"
              >
                GitHub ↗
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* ========== 轻首屏 ========== */}
      <section className="dot-grid border-b border-sage">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-[1fr_278px] gap-7 md:gap-16 items-center py-8 md:py-12">
            <div>
              <p className="font-mono text-[10px] md:text-xs font-semibold tracking-[1.5px] text-moss">
                游戏资源 · 开源项目 · 实用工具
              </p>
              <h1 className="mt-3.5 mb-4 text-[33px] md:text-[46px] leading-[1.25] font-black tracking-[-1px] md:tracking-[-1.7px]">
                好玩的，好用的，
                <br />
                <span className="shadow-[inset_0_-0.35em_#B5D4B8]">都在这里发现。</span>
              </h1>
              <p className="text-[13px] md:text-[15px] text-moss leading-[1.85] max-w-[555px]">
                从值得一玩的游戏，到顺手的工具与开源项目。
                <br className="hidden md:block" />
                认真整理，简单分享。
              </p>
              <div className="flex gap-2.5 mt-5 md:mt-6">
                <a
                  href="#games"
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-pine text-white border-2 border-ink font-extrabold text-[13px] md:text-sm shadow-hard-sm transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs"
                >
                  发现热门游戏 <span>↓</span>
                </a>
                <a
                  href="#resources"
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-white border-2 border-ink font-extrabold text-[13px] md:text-sm shadow-hard-sm transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs"
                >
                  浏览实用资源 <span>↓</span>
                </a>
              </div>
            </div>

            {/* 内容定位便签 */}
            <aside className="hidden md:block bg-white border-2 border-ink rounded-[14px] px-[22px] py-[20px] shadow-[5px_5px_0_#202922] rotate-2">
              <div className="flex items-center justify-between text-xs text-moss">
                <span>峻峻尼的分享清单</span>
                <span className="w-2.5 h-2.5 rounded-full bg-pine" />
              </div>
              <div className="text-[25px] font-black mt-2.5 mb-1">好玩，也好用。</div>
              <ul className="mt-2.5 text-[13px]">
                <li className="flex justify-between border-t border-dashed border-sage pt-2 pb-1">
                  <span>游戏资源</span>
                  <span className="text-pine-deep font-bold">{loading ? '—' : `${gameTotal} 款`}</span>
                </li>
                <li className="flex justify-between border-t border-dashed border-sage pt-2 pb-1">
                  <span>实用工具</span>
                  <span className="text-pine-deep font-bold">{loading ? '—' : `${resources.length} 条`}</span>
                </li>
                <li className="flex justify-between border-t border-dashed border-sage pt-2 pb-1">
                  <span>开源项目</span>
                  <span className="text-pine-deep font-bold">{loading ? '—' : `${projects.length} 个`}</span>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      {/* ========== 实时浏览统计条 ========== */}
      <LiveVisits stat={viewStat} ready={viewsReady} />

      <main className="max-w-[1120px] mx-auto px-4 md:px-6 pt-7 md:pt-8 pb-11">

        {/* ========== 01 热门游戏 ========== */}
        <section id="games" className="scroll-mt-[88px] mb-9">
          <SectionHead
            index="01"
            title="热门游戏"
            right={
              <Link href="/game-resource" className="text-[11px] md:text-[13px] font-bold text-pine-deep whitespace-nowrap">
                查看全部游戏 ↗
              </Link>
            }
          />

          <div className="relative group/carousel">
            {/* 左箭头 */}
            <button
              onClick={() => scrollGames('left')}
              aria-label="向左滚动"
              className={`absolute left-0 top-[38%] -translate-y-1/2 z-20 grid place-items-center w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white border-2 border-ink shadow-hard-sm text-ink hover:bg-pine hover:text-white transition-colors -ml-1 ${canScrollLeft ? '' : 'pointer-events-none'}`}
              style={{ opacity: canScrollLeft ? undefined : 0 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            {/* 右箭头 */}
            <button
              onClick={() => scrollGames('right')}
              aria-label="向右滚动"
              className={`absolute right-0 top-[38%] -translate-y-1/2 z-20 grid place-items-center w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white border-2 border-ink shadow-hard-sm text-ink hover:bg-pine hover:text-white transition-colors -mr-1 ${canScrollRight ? '' : 'pointer-events-none'}`}
              style={{ opacity: canScrollRight ? undefined : 0 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.6} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>

            <div
              ref={gameScrollRef}
              role="region"
              aria-label="游戏推荐，手机端可左右滑动"
              className="flex gap-3.5 md:gap-[17px] overflow-x-auto pb-2.5 pt-0.5"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' as any, scrollSnapType: 'x mandatory' }}
              onMouseEnter={() => setAutoPaused(true)}
              onMouseLeave={() => setAutoPaused(false)}
            >
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="shrink-0 w-[76%] md:w-[calc((100%-51px)/4)] bg-white border-2 border-ink rounded-[10px] shadow-hard overflow-hidden">
                      <div className="aspect-[16/10] bg-pine-light border-b-2 border-ink animate-pulse" />
                      <div className="px-3.5 py-3 space-y-2.5">
                        <div className="h-4 bg-pine-light rounded animate-pulse" />
                        <div className="h-3 w-2/3 bg-pine-light rounded animate-pulse" />
                      </div>
                    </div>
                  ))
                : games.map(game => (
                    <div key={game.id} className="shrink-0 w-[76%] md:w-[calc((100%-51px)/4)] snap-start">
                      <GameCard game={game} />
                    </div>
                  ))}
            </div>
          </div>

          <p className="text-[11px] text-moss mt-1.5">
            保留现站游戏内容与入口 · 手机端可左右滑动 · 共 {loading ? '—' : gameTotal} 款
          </p>
        </section>

        {/* ========== 02 最新资源 ========== */}
        <section id="resources" className="scroll-mt-[88px]">
          <SectionHead
            index="02"
            title="最新资源"
            right={<span className="text-[11px] md:text-[13px] text-moss whitespace-nowrap">工具与灵感，都在这里</span>}
          />

          {/* 搜索与排序 */}
          <div className="flex gap-2.5 md:gap-3 mb-3.5">
            <label className="flex items-center gap-2.5 flex-1 min-w-0 bg-white border-2 border-ink rounded-[9px] min-h-[45px] md:min-h-[47px] px-3 md:px-4 shadow-hard-xs text-moss focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pine">
              <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                <circle cx="10" cy="10" r="6.5" />
                <path d="m15 15 5 5" />
              </svg>
              <input
                type="text"
                aria-label="搜索资源"
                placeholder="搜索资源名称、描述或标签…"
                className="border-0 outline-none bg-transparent w-full min-w-0 text-[13px] md:text-sm text-ink placeholder-moss/70"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="清空搜索"
                  className="shrink-0 text-moss hover:text-ink text-lg leading-none px-1"
                >
                  ×
                </button>
              )}
            </label>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-white border-2 border-ink rounded-lg shadow-hard-xs min-h-[45px] md:min-h-[47px] px-2.5 md:px-4 text-[11px] md:text-[13px] font-extrabold whitespace-nowrap hover:bg-pine-light transition-colors"
            >
              顺序 {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[59px_minmax(0,1fr)] md:grid-cols-[96px_minmax(0,1fr)_165px] bg-white border-2 border-ink rounded-xl shadow-hard overflow-hidden">
                  <div className="bg-pine-light border-r-2 border-dashed border-ink animate-pulse" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-5 w-3/4 bg-pine-light rounded animate-pulse" />
                    <div className="h-4 w-full bg-pine-light rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-pine-light rounded animate-pulse" />
                  </div>
                  <div className="hidden md:block p-4 space-y-2">
                    <div className="h-8 bg-paper border border-sage rounded animate-pulse" />
                    <div className="h-8 bg-paper border border-sage rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredResources.length > 0 ? (
            <div className="grid gap-4">
              {filteredResources.map((item, i) => (
                <Ticket key={item.id} item={item} featured={i === 0} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white border-2 border-ink shadow-hard-sm px-5 py-8 text-center text-sm text-moss">
              没有匹配「{searchTerm}」的资源
            </div>
          )}
        </section>

        {/* ========== 03 开源项目 ========== */}
        {projects.length > 0 && (
          <section id="projects" className="scroll-mt-[88px] mt-9">
            <SectionHead
              index="03"
              title="开源项目"
              right={
                <a
                  href="https://github.com/xinyuzjj?tab=repositories"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] md:text-[13px] font-bold text-pine-deep whitespace-nowrap"
                >
                  查看 GitHub ↗
                </a>
              }
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-3.5">
              {projects.map(p => <ProjectCard key={p.name} p={p} />)}
            </div>
            <p className="text-[11px] text-moss mt-2">只改变呈现，不改变资源本身。</p>
          </section>
        )}
      </main>

      {/* ========== 页脚 ========== */}
      <footer className="border-t-2 border-ink bg-white">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 min-h-[83px] justify-center">
          <p className="font-extrabold text-sm text-ink">峻峻尼分享</p>
          <p className="font-mono text-[11px] text-moss">
            本页已被浏览{' '}
            <span className="font-bold text-pine-deep tabular-nums">
              {viewStat ? viewStat.count.toLocaleString() : '—'}
            </span>{' '}
            次 · © 2026 · 仅供个人学习交流
          </p>
        </div>
      </footer>

      {/* ========== 悬浮公众号关注窗（始终可见） ========== */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
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
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => {
              setShowWechatModal(false);
              localStorage.setItem('wb_wechat_modal_dismissed', '1');
            }}
            aria-hidden="true"
          />
          <div className="anim-in relative bg-white rounded-2xl border-2 border-ink shadow-hard-xl max-w-sm w-full overflow-hidden">
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

            <div className="h-1.5 bg-pine" />

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
