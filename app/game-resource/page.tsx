"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Search, Gamepad2, Cloud, HardDrive, Key,
  ChevronDown, ChevronUp, AlertTriangle, X, ImageIcon,
  Calendar, Tag, Globe, ExternalLink,
  ChevronLeft, ChevronRight,
  ZoomIn, Star, Clock, Download,
  Shield, Package, Layers, Eye, Copy, Check
} from 'lucide-react';

/* ======================== Types ======================== */

interface GameResource {
  id: string;
  name: string;
  category: string;
  desc: string;
  versionInfo?: string;
  code: string;
  quarkLink: string;
  baiduLink: string;
  tags: string[];
  netdisk: { showQuark: boolean; showBaidu: boolean };
  sourceUrl: string;
  sourcePostId?: string;
  sourceQuarkLink?: string;
  sourceBaiduLink?: string;
  coverImage?: string;
  screenshots?: string[];
  details?: string;
  info?: Record<string, string>;
}

interface GameData {
  updated: string;
  count: number;
  resources: GameResource[];
}

/* ======================== Constants ======================== */

const PAGE_SIZE = 16;

/* ======================== Helpers ======================== */

/**
 * desc 是竖线分隔的结构化字段：语言 | 版本+内容 | 解压方式
 * 例：中字-国语|V1.0.1013.34-黑龙狂袭-怒血夺命+全DLC|解压即撸|
 * 这里把它拆成「语言标签 + 特性标签」，避免整条当纯文本显示。
 */
const FEATURE_RULES: Array<[RegExp, string]> = [
  [/全\s*DLC/i, '全DLC'],
  [/pre-?order|预购/i, '预购特典'],
  [/修改器/i, '含修改器'],
  [/MOD/i, '整合MOD'],
  [/存档/i, '含存档'],
  [/手柄/i, '支持手柄'],
  [/语言包/i, '多语言包'],
  [/季票/i, '全季票'],
  [/特典/i, '特典'],
  [/DLC/i, '含DLC'],
  [/解压即撸|解压即玩/i, '解压即玩'],
  [/整合/i, '整合版'],
];

function parseDesc(desc?: string): { lang: string; features: string[] } {
  if (!desc) return { lang: '', features: [] };
  const parts = desc.split('|').map(s => s.trim()).filter(Boolean);
  const lang = parts[0] || '';
  const features: string[] = [];
  const seen = new Set<string>();
  parts.slice(1).forEach(seg => {
    seg.split(/[+\-_/、,，\s]+/).forEach(token => {
      if (!token) return;
      for (const [re, label] of FEATURE_RULES) {
        if (re.test(token) && !seen.has(label)) {
          seen.add(label);
          features.push(label);
          break;
        }
      }
    });
  });
  // 已有「全DLC」时去掉冗余的「含DLC」
  const idx = features.indexOf('全DLC');
  if (idx !== -1) {
    const dup = features.indexOf('含DLC');
    if (dup !== -1) features.splice(dup, 1);
  }
  return { lang, features };
}

/** 只有 http(s) 的封面才可用；数据里有 32 条是纯数字 ID，取不到图 */
function isUsableCover(url?: string): boolean {
  return !!url && /^https?:\/\//i.test(url);
}

/** 从网盘链接里取真正的提取码（pwd 参数） */
function getPwd(game: GameResource): string {
  const pick = (url?: string) => {
    if (!url) return '';
    try {
      return new URL(url).searchParams.get('pwd') || '';
    } catch {
      return '';
    }
  };
  return pick(game.baiduLink) || pick(game.quarkLink);
}

/* ======================== Components ======================== */

/** 骨架屏 */
function CardSkeleton() {
  return (
    <div className="rounded-xl bg-white border-2 border-ink shadow-hard overflow-hidden">
      <div className="aspect-[16/10] bg-pine-light border-b-2 border-ink animate-pulse" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-4 bg-pine-light rounded animate-pulse w-4/5" />
        <div className="h-4 bg-pine-light rounded animate-pulse w-2/5" />
        <div className="flex gap-1.5 pt-0.5">
          <div className="h-4 w-14 bg-paper rounded animate-pulse" />
          <div className="h-4 w-16 bg-paper rounded animate-pulse" />
        </div>
        <div className="flex gap-2 pt-1.5">
          <div className="h-10 flex-1 bg-paper border border-sage rounded-lg animate-pulse" />
          <div className="h-10 flex-1 bg-paper border border-sage rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** 复制按钮 */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border-2 border-ink shadow-hard-xs transition-all duration-200 ${
        copied ? 'bg-pine text-white' : 'bg-white text-ink hover:bg-pine-light'
      }`}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? '已复制' : label}
    </button>
  );
}

/** 详情弹窗里的信息小药丸 */
function InfoPill({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border-[1.5px] border-ink shadow-hard-xs">
      {Icon && <Icon size={12} className="text-pine flex-shrink-0" />}
      <span className="text-[11px] text-moss">{label}</span>
      <span className="text-[11px] font-bold text-ink">{value}</span>
    </div>
  );
}

/* ======================== Main Page ======================== */

export default function GameResourcePage() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Detail modal state
  const [selectedGame, setSelectedGame] = useState<GameResource | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'intro' | 'details' | 'screenshots'>('intro');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/game-resources.json')
      .then(res => res.json())
      .then(data => {
        setGameData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ---- 页面底色跟随薄荷白，避免回弹时露出深色 ---- */
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#EFF6F0';
    return () => { document.body.style.background = prev; };
  }, []);

  /* ---- Derived data ---- */
  const categories = useMemo(() => {
    if (!gameData) return [];
    const cats = new Map<string, number>();
    gameData.resources.forEach(r => {
      r.tags?.forEach(t => cats.set(t, (cats.get(t) || 0) + 1));
    });
    return Array.from(cats.entries()).sort((a, b) => b[1] - a[1]);
  }, [gameData]);

  const filteredResources = useMemo(() => {
    if (!gameData) return [];
    return gameData.resources.filter(item => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [gameData, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredResources.length / PAGE_SIZE);
  const pagedResources = filteredResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* ---- Reset page on filter change ---- */
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory]);

  /* ---- Reset detail state when opening new game ---- */
  useEffect(() => {
    if (selectedGame) {
      setActiveTab('intro');
      setShowFullDesc(false);
      setCopiedCode(false);
      window.document.body.style.overflow = 'hidden';
    } else {
      window.document.body.style.overflow = '';
    }
    return () => { window.document.body.style.overflow = ''; };
  }, [selectedGame]);

  /* ---- Keyboard shortcuts ---- */
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (lightboxIndex !== null) setLightboxIndex(null);
      else if (selectedGame) setSelectedGame(null);
    }
    if (lightboxIndex !== null && selectedGame?.screenshots) {
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? (i - 1 + selectedGame.screenshots!.length) % selectedGame.screenshots!.length : null);
      if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? (i + 1) % selectedGame.screenshots!.length : null);
    }
  }, [selectedGame, lightboxIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  /* ---- Helpers ---- */
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const resetFilters = () => { setSearchTerm(''); setSelectedCategory(null); };

  const currentShots = selectedGame?.screenshots || [];

  /* ======================== RENDER ======================== */

  return (
    <div className="min-h-screen bg-paper text-ink">

      {/* ============ 站内顶栏 ============ */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 min-h-[68px]">
            <Link href="/" className="flex items-center gap-2.5 font-black text-lg md:text-xl whitespace-nowrap">
              <span className="grid place-items-center w-8 h-[34px] rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs text-[18px]">
                峻
              </span>
              <span>峻峻尼分享</span>
            </Link>
            <nav className="flex items-center gap-2 text-[13px] font-bold">
              <Link href="/" className="hidden sm:inline-flex px-3 py-2 rounded-lg border-2 border-transparent hover:bg-paper transition-colors">
                首页
              </Link>
              <span className="inline-flex px-3 py-2 rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs">
                游戏资源
              </span>
              <a
                href="https://github.com/xinyuzjj"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex px-3 py-2 rounded-lg bg-white border-2 border-ink shadow-hard-xs hover:bg-pine-light transition-colors"
              >
                GitHub ↗
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* ============ 页头 ============ */}
      <section className="dot-grid border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10">
          <div className="grid lg:grid-cols-[1fr_auto] gap-7 lg:items-end">
            <div>
              <p className="font-mono text-[11px] tracking-[1.8px] text-moss font-semibold">GAME LIBRARY</p>
              <h1 className="mt-2.5 mb-3 text-[32px] md:text-[40px] leading-[1.2] font-black tracking-tight">
                <span className="shadow-[inset_0_-0.34em_#B5D4B8]">游戏资源库</span>
              </h1>
              <p className="text-sm text-moss max-w-xl">
                精选 PC 游戏合集 · 解压即玩 · 中文适配。点分类快速筛选，进详情看版本与网盘。
              </p>
            </div>
            {gameData && (
              <div className="flex flex-wrap gap-2.5">
                <StatCard value={String(gameData.count)} label="款游戏" />
                <StatCard value={String(categories.length)} label="个分类" />
                <StatCard value={gameData.updated.slice(5, 10).replace('-', '/')} label="最近更新" />
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* ---- 声明 ---- */}
        <div className="mt-6 mb-6">
          <div className="flex items-start gap-3 rounded-xl bg-white border-2 border-ink shadow-hard-sm px-4 py-3">
            <AlertTriangle size={16} className="text-warn flex-shrink-0 mt-0.5" />
            <p className="text-xs text-moss leading-relaxed">
              <span className="font-bold text-ink">声明：</span>
              本站为非商业性网站，资源转载自互联网，仅供个人学习交流使用。无充值、无会员、无售卖。
            </p>
          </div>
        </div>

        {/* ---- 搜索与筛选 ---- */}
        <section className="rounded-xl bg-white border-2 border-ink shadow-hard px-4 md:px-5 py-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pine" size={17} />
              <input
                className="w-full bg-paper border-2 border-ink rounded-lg py-3 pl-11 pr-10 text-sm font-medium text-ink placeholder-moss/70 outline-none focus:bg-white focus:ring-0 focus:border-pine transition-colors shadow-hard-xs"
                placeholder="搜索游戏名称或版本…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="清空搜索"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-moss hover:text-ink text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
            {gameData && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-paper border-2 border-ink shadow-hard-xs text-[12px] font-bold text-moss sm:w-auto">
                <Clock size={13} className="text-pine" />
                更新于 {gameData.updated.slice(0, 10)}
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3.5">
              <FilterChip
                active={!selectedCategory}
                onClick={() => setSelectedCategory(null)}
                label="全部"
                count={gameData?.count ?? 0}
              />
              {categories.map(([cat, count]) => (
                <FilterChip
                  key={cat}
                  active={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  label={cat}
                  count={count}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-4 pt-3.5 border-t border-dashed border-sage">
            <p className="text-xs text-moss">
              {selectedCategory && <span className="font-bold text-pine">{selectedCategory}</span>}
              {selectedCategory && ' · '}
              共 <span className="font-bold text-ink">{filteredResources.length}</span> 款
              {searchTerm && <span className="ml-1">「{searchTerm}」</span>}
              {!loading && totalPages > 0 && (
                <span className="ml-1">· 第 {currentPage}/{totalPages} 页</span>
              )}
            </p>
            {(searchTerm || selectedCategory) && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-pine underline underline-offset-4 hover:text-pine-deep transition-colors"
              >
                清空筛选
              </button>
            )}
          </div>
        </section>

        {/* ---- 游戏网格 ---- */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filteredResources.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {pagedResources.map((game) => (
                <GameCard key={game.id} game={game} onClick={() => setSelectedGame(game)} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        ) : (
          <EmptyState onReset={resetFilters} />
        )}

        {/* ---- 页脚 ---- */}
        <footer className="mt-14 pb-10">
          <div className="border-t-2 border-ink pt-7">
            <div className="max-w-xl mx-auto mb-5">
              <div className="rounded-xl bg-white border-2 border-ink shadow-hard-sm px-4 py-3 text-center">
                <p className="text-xs text-moss leading-relaxed">
                  <span className="font-bold text-ink">📢 网站声明：</span>
                  本站为非商业性网站，资源均转载自互联网。无充值、无会员、无售卖行为，仅供学习交流。
                </p>
              </div>
            </div>
            <p className="text-center text-xs text-moss">
              © 2026 峻峻尼游戏资源库 · 仅供个人学习交流 ·
              <Link href="/" className="ml-1 font-bold text-pine underline underline-offset-4">返回首页</Link>
            </p>
          </div>
        </footer>
      </main>

      {/* ================================================================ */}
      {/*                    GAME DETAIL MODAL                           */}
      {/* ================================================================ */}
      {selectedGame && (
        <DetailModal
          game={selectedGame}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showFullDesc={showFullDesc}
          setShowFullDesc={setShowFullDesc}
          copiedCode={copiedCode}
          copyCode={() => copyCode(selectedGame.code)}
          onClose={() => setSelectedGame(null)}
          onScreenshotClick={(idx) => setLightboxIndex(idx)}
          ref={detailRef}
        />
      )}

      {/* ================================================================ */}
      {/*                        LIGHTBOX                                 */}
      {/* ================================================================ */}
      {lightboxIndex !== null && selectedGame && currentShots[lightboxIndex] && (
        <Lightbox
          images={currentShots}
          currentIndex={lightboxIndex}
          onNavigate={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

/* ======================== Sub-Components ======================== */

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-ink shadow-hard-sm px-3.5 py-2 text-center min-w-[84px]">
      <span className="block text-[21px] leading-tight font-black tracking-tight">{value}</span>
      <span className="text-[10.5px] text-moss">{label}</span>
    </div>
  );
}

function FilterChip({
  active, onClick, label, count,
}: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold border-[1.5px] transition-all duration-200 ${
        active
          ? 'bg-pine text-white border-ink shadow-hard-xs'
          : 'bg-white text-moss border-sage hover:border-ink hover:text-ink'
      }`}
    >
      {label}
      <span
        className={`font-mono text-[10px] rounded-full px-1.5 py-[1px] ${
          active ? 'bg-white/25 text-white' : 'bg-paper text-pine-deep'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/** 游戏卡片 */
function GameCard({ game, onClick }: { game: GameResource; onClick: () => void }) {
  const hasCover = isUsableCover(game.coverImage);
  const shotCount = game.screenshots?.length ?? 0;
  const hasShots = shotCount > 0;
  const hasQuark = !!game.quarkLink && game.netdisk?.showQuark !== false;
  const hasBaidu = !!game.baiduLink && game.netdisk?.showBaidu !== false;
  const { lang, features } = parseDesc(game.desc);

  const chips: string[] = [];
  if (lang) chips.push(lang);
  chips.push(...features);
  const visible = chips.slice(0, 3);
  const restCount = chips.length - visible.length;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-xl bg-white border-2 border-ink shadow-hard overflow-hidden cursor-pointer transition-all duration-200 hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-hard-lg"
    >
      {/* 封面 */}
      <div className="relative aspect-[16/10] overflow-hidden bg-pine-light border-b-2 border-ink">
        {hasCover && (
          <img
            src={game.coverImage}
            alt={game.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
              const fb = el.nextElementSibling as HTMLElement | null;
              if (fb) fb.classList.remove('hidden');
            }}
          />
        )}
        {/* 封面缺失：游戏名首字 + 点阵底，不留白块 */}
        <div className={`${hasCover ? 'hidden' : ''} dot-grid absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-pine-light`}>
          <span className="text-[40px] leading-none font-black text-pine-deep/35 select-none">{game.name.slice(0, 1)}</span>
          <span className="text-[10px] font-bold tracking-widest text-pine-deep/45">暂无封面</span>
        </div>

        {/* 分类角标 */}
        <span className="absolute top-2.5 left-2.5 z-10 rounded-md bg-pine text-white border-[1.5px] border-ink shadow-hard-xs px-2 py-[3px] text-[11px] font-bold">
          {game.category}
        </span>

        {/* 截图数 */}
        {hasShots && (
          <span className="absolute top-2.5 right-2.5 z-10 rounded-md bg-white text-ink border-[1.5px] border-ink shadow-hard-xs px-2 py-[3px] text-[10px] font-bold inline-flex items-center gap-1">
            <ImageIcon size={9} /> {shotCount}
          </span>
        )}

        {/* 悬停提示 */}
        <div className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-white text-pine border-[1.5px] border-ink shadow-hard-xs px-2 py-1 text-[10px] font-bold opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <Eye size={10} /> 查看详情
        </div>
      </div>

      {/* 内容 */}
      <div className="flex flex-col flex-1 p-3.5">
        <h3 className="text-[14px] font-extrabold leading-snug line-clamp-2 min-h-[40px] group-hover:text-pine transition-colors">
          {game.name}
        </h3>

        {/* 版本信息拆成标签 */}
        {visible.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {visible.map((c, i) => (
              <span
                key={c}
                className={`rounded px-1.5 py-[2px] text-[10px] font-bold border whitespace-nowrap ${
                  i === 0 && lang
                    ? 'bg-pine-light text-pine-deep border-pine-deep/40'
                    : 'bg-paper text-moss border-sage'
                }`}
              >
                {c}
              </span>
            ))}
            {restCount > 0 && (
              <span className="rounded px-1.5 py-[2px] text-[10px] font-bold bg-paper text-moss border border-sage">
                +{restCount}
              </span>
            )}
          </div>
        )}

        {/* 解压密码 */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-dashed border-sage">
          <span className="text-[10px] font-bold text-moss whitespace-nowrap">解压密码</span>
          <code className="font-mono text-[10px] font-bold text-pine truncate">{game.code}</code>
        </div>

        {/* 网盘按钮 */}
        <div className="flex gap-2 mt-2.5">
          {hasQuark ? (
            <a
              href={game.quarkLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-ink bg-pine text-white shadow-hard-sm px-2 py-2.5 text-[12px] font-bold transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs"
            >
              <Cloud size={13} /> 夸克网盘
            </a>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center rounded-lg border-[1.5px] border-sage bg-paper px-2 py-2.5 text-[12px] font-bold text-moss/60">
              夸克暂无
            </span>
          )}
          {hasBaidu ? (
            <a
              href={game.baiduLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-ink bg-white text-ink shadow-hard-sm px-2 py-2.5 text-[12px] font-bold transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs hover:bg-pine-light"
            >
              <HardDrive size={13} /> 百度网盘
            </a>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center rounded-lg border-[1.5px] border-sage bg-paper px-2 py-2.5 text-[12px] font-bold text-moss/60">
              百度暂无
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** 分页 */
function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  const pages = Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
    if (totalPages <= 9) return i + 1;
    if (currentPage <= 4) return i + 1;
    if (currentPage >= totalPages - 3) return totalPages - 8 + i;
    return currentPage - 4 + i;
  });

  const navBtn = 'inline-flex items-center gap-1 rounded-lg border-2 border-ink bg-white px-3.5 py-2 text-xs font-bold shadow-hard-xs transition-all hover:bg-pine-light disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white';

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-10">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={navBtn}
      >
        <ChevronLeft size={14} /> 上一页
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`grid place-items-center w-9 h-9 rounded-lg text-xs font-bold border-2 border-ink transition-all ${
            p === currentPage
              ? 'bg-pine text-white shadow-hard-xs'
              : 'bg-white text-moss shadow-hard-xs hover:bg-pine-light hover:text-ink'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={navBtn}
      >
        下一页 <ChevronRight size={14} />
      </button>
    </div>
  );
}

/** 空状态 */
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="grid place-items-center w-[72px] h-[72px] rounded-xl bg-pine-light border-2 border-ink shadow-hard mb-4">
        <Gamepad2 size={28} className="text-pine-deep" />
      </div>
      <p className="text-ink text-[15px] font-extrabold mb-1">没有匹配的游戏</p>
      <p className="text-moss text-xs mb-5">试试更短的关键词，或换个分类看看。</p>
      <button
        onClick={onReset}
        className="rounded-lg border-2 border-ink bg-pine text-white px-4 py-2 text-xs font-bold shadow-hard-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs"
      >
        清空筛选条件
      </button>
    </div>
  );
}

/* ============================================================ */
/*                     DETAIL MODAL                             */
/* ============================================================ */

interface DetailModalProps {
  game: GameResource;
  activeTab: 'intro' | 'details' | 'screenshots';
  setActiveTab: (t: 'intro' | 'details' | 'screenshots') => void;
  showFullDesc: boolean;
  setShowFullDesc: (v: boolean) => void;
  copiedCode: boolean;
  copyCode: () => void;
  onClose: () => void;
  onScreenshotClick: (idx: number) => void;
  ref: React.RefObject<HTMLDivElement | null>;
}

const DetailModal = ({
  game,
  activeTab, setActiveTab, showFullDesc, setShowFullDesc, copiedCode, copyCode,
  onClose, onScreenshotClick, ref: detailRef,
}: DetailModalProps) => {

  const shots = game.screenshots || [];
  const hasDetails = !!game.details;
  const hasShots = shots.length > 0;
  const hasCover = isUsableCover(game.coverImage);
  const infoEntries = game.info ? Object.entries(game.info) : [];
  const pwd = getPwd(game);
  const { lang, features } = parseDesc(game.desc);

  // Determine which tabs are available
  const tabs = [
    { key: 'intro' as const, label: '简介', available: true },
    ...(hasDetails ? [{ key: 'details' as const, label: '详细介绍', available: true }] : []),
    ...(hasShots ? [{ key: 'screenshots' as const, label: `截图 (${shots.length})`, available: true }] : []),
  ];

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-4 pb-10 px-3 md:px-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={detailRef}
        className="anim-in relative w-full max-w-4xl bg-white rounded-2xl border-2 border-ink shadow-hard-xl overflow-hidden my-4 md:my-8"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ========== HERO BANNER ========== */}
        <div className="relative w-full aspect-[21/9] md:aspect-[2.5/1] bg-[#202922] overflow-hidden">
          {hasCover && (
            <img
              src={game.coverImage}
              alt={game.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
                const fb = el.nextElementSibling as HTMLElement | null;
                if (fb) fb.classList.remove('hidden');
              }}
            />
          )}
          {/* 封面缺失：深色底 + 首字，保证白色标题依然可读 */}
          <div className={`${hasCover ? 'hidden' : ''} dot-grid absolute inset-0 grid place-items-center`}>
            <span className="text-[64px] font-black text-white/20 select-none">{game.name.slice(0, 1)}</span>
          </div>
          {/* 功能性遮罩：保证标题可读 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

          {/* 关闭 */}
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-3 right-3 z-20 grid place-items-center w-9 h-9 rounded-lg bg-white border-2 border-ink shadow-hard-sm text-ink hover:bg-pine-light transition-colors"
          >
            <X size={17} />
          </button>

          {/* 标题 */}
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="rounded-md px-2.5 py-1 text-[11px] font-bold bg-pine text-white border-[1.5px] border-ink shadow-hard-xs">
                {game.category}
              </span>
              {lang && (
                <span className="rounded-md px-2.5 py-1 text-[11px] font-bold bg-white text-pine-deep border-[1.5px] border-ink shadow-hard-xs">
                  {lang}
                </span>
              )}
              {hasShots && (
                <span className="rounded-md px-2.5 py-1 text-[11px] font-bold bg-white/90 text-ink border-[1.5px] border-ink inline-flex items-center gap-1">
                  <ImageIcon size={10} /> {shots.length} 张截图
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-lg">
              {game.name}
            </h2>
          </div>
        </div>

        {/* ========== BODY ========== */}
        <div className="p-5 md:p-7 space-y-5">

          {/* ---- 特性标签 ---- */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {features.map(f => (
                <span key={f} className="rounded px-2 py-1 text-[11px] font-bold bg-paper text-moss border border-sage">
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* ---- 信息栏 ---- */}
          {infoEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {infoEntries.map(([key, val]) => (
                <InfoPill
                  key={key}
                  label={key}
                  value={val}
                  icon={
                    key.includes('日期') ? Calendar :
                    key.includes('类型') ? Tag :
                    key.includes('语言') ? Globe :
                    key.includes('大小') ? Package :
                    undefined
                  }
                />
              ))}
            </div>
          )}

          {/* ---- 版本信息 ---- */}
          {game.versionInfo && (
            <div className="rounded-xl bg-pine-light border-2 border-ink shadow-hard-xs p-4">
              <div className="flex items-start gap-2">
                <Package size={14} className="text-pine-deep flex-shrink-0 mt-0.5" />
                <p className="text-xs text-ink leading-relaxed break-all">{game.versionInfo}</p>
              </div>
            </div>
          )}

          {/* ---- Tabs ---- */}
          {(hasDetails && hasShots) && (
            <div className="flex items-center gap-1 border-b-2 border-ink">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-xs font-bold transition-all relative ${
                    activeTab === tab.key ? 'text-pine' : 'text-moss hover:text-ink'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute -bottom-[2px] left-2 right-2 h-[3px] bg-pine rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ---- 简介 ---- */}
          {(activeTab === 'intro' || !hasDetails) && game.desc && (
            <div className="space-y-3">
              <SectionTitle icon={<Star size={15} />} title="游戏简介" />
              <div className="relative">
                <p className={`text-sm text-moss leading-relaxed whitespace-pre-line ${!showFullDesc ? 'line-clamp-4' : ''}`}>
                  {game.desc}
                </p>
                {game.desc.length > 180 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-pine hover:text-pine-deep transition-colors"
                  >
                    {showFullDesc ? <>收起 <ChevronUp size={12} /></> : <>展开全文 <ChevronDown size={12} /></>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ---- 详细介绍 ---- */}
          {hasDetails && (activeTab === 'details' || (!hasShots && activeTab === 'intro')) && (
            <div className="space-y-3">
              <SectionTitle icon={<Layers size={15} />} title="关于此游戏" />
              <div className="text-sm text-moss leading-relaxed max-h-[500px] overflow-y-auto pr-3 green-scroll whitespace-pre-line space-y-3">
                {game.details}
              </div>
            </div>
          )}

          {/* ---- 截图 ---- */}
          {hasShots && (
            <div className="space-y-3">
              <SectionTitle icon={<ImageIcon size={15} />} title="游戏截图" extra={`(${shots.length})`} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {shots.map((shot, i) => (
                  <div
                    key={i}
                    onClick={() => onScreenshotClick(i)}
                    className="relative aspect-video rounded-lg overflow-hidden bg-pine-light border-2 border-ink cursor-pointer group/shot"
                  >
                    <img
                      src={shot}
                      alt={`截图 ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover/shot:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/shot:bg-black/25 transition-all duration-200 flex items-center justify-center">
                      <div className="grid place-items-center w-9 h-9 rounded-full bg-white border-2 border-ink shadow-hard-xs opacity-0 group-hover/shot:opacity-100 scale-75 group-hover/shot:scale-100 transition-all duration-200">
                        <ZoomIn size={16} className="text-ink" />
                      </div>
                    </div>
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-ink/80 text-white text-[10px] font-bold">
                      {i + 1}/{shots.length}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- 下载区 ---- */}
          <div className="pt-5 border-t-2 border-ink space-y-4">
            <SectionTitle icon={<Download size={15} />} title="下载资源" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {game.quarkLink ? (
                <a
                  href={game.quarkLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-ink bg-pine text-white shadow-hard-sm px-5 py-3.5 text-sm font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs"
                >
                  <Cloud size={17} /> 夸克网盘下载
                </a>
              ) : (
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border-[1.5px] border-sage bg-paper px-5 py-3.5 text-sm font-bold text-moss/60">
                  夸克暂无
                </span>
              )}
              {game.baiduLink ? (
                <a
                  href={game.baiduLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-ink bg-white text-ink shadow-hard-sm px-5 py-3.5 text-sm font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-xs hover:bg-pine-light"
                >
                  <HardDrive size={17} /> 百度网盘下载
                </a>
              ) : (
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border-[1.5px] border-sage bg-paper px-5 py-3.5 text-sm font-bold text-moss/60">
                  百度暂无
                </span>
              )}
            </div>

            {/* 密码 / 提取码 */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <Key size={13} className="text-pine" />
                <span className="text-xs font-bold text-moss">解压密码：</span>
                <code className="rounded-md border-[1.5px] border-ink bg-pine-light px-2.5 py-1 font-mono text-xs font-bold text-pine-deep select-all">
                  {game.code}
                </code>
                <button
                  onClick={copyCode}
                  className={`inline-flex items-center gap-1 rounded-md border-2 border-ink shadow-hard-xs px-2.5 py-1 text-[11px] font-bold transition-all ${
                    copiedCode ? 'bg-pine text-white' : 'bg-white text-ink hover:bg-pine-light'
                  }`}
                >
                  {copiedCode ? <><Check size={10} /> 已复制</> : <><Copy size={10} /> 复制</>}
                </button>
              </div>

              {pwd && (
                <div className="flex items-center gap-2">
                  <Key size={13} className="text-pine" />
                  <span className="text-xs font-bold text-moss">网盘提取码：</span>
                  <code className="rounded-md border-[1.5px] border-ink bg-white px-2.5 py-1 font-mono text-xs font-bold text-ink select-all">
                    {pwd}
                  </code>
                  <CopyButton text={pwd} label="复制" />
                </div>
              )}
            </div>

            {/* 来源 */}
            {game.sourceUrl && (
              <a
                href={game.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-moss hover:text-pine transition-colors"
              >
                <ExternalLink size={11} /> 来源页面
              </a>
            )}

            {/* 提示 */}
            <div className="rounded-lg bg-pine-light border-l-4 border-pine px-3.5 py-3">
              <div className="flex items-start gap-2">
                <Shield size={13} className="text-pine-deep flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-moss leading-relaxed">
                  提示：解压前请关闭杀毒软件；如遇解压报错请尝试使用 WinRAR 或 7-Zip；部分游戏需要安装运行库。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================ */
/*                         LIGHTBOX                              */
/* ============================================================ */

function Lightbox({
  images, currentIndex, onNavigate, onClose
}: {
  images: string[];
  currentIndex: number;
  onNavigate: (i: number) => void;
  onClose: () => void;
}) {
  const ctrl = 'absolute z-10 grid place-items-center w-11 h-11 rounded-lg bg-white border-2 border-ink shadow-hard-sm text-ink hover:bg-pine-light transition-colors';

  return (
    <div
      className="anim-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/92 backdrop-blur-md"
      onClick={onClose}
    >
      <button onClick={onClose} aria-label="关闭" className={`${ctrl} top-4 right-4`}>
        <X size={22} />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex - 1 + images.length) % images.length); }}
        aria-label="上一张"
        className={`${ctrl} left-4`}
      >
        <ChevronLeft size={24} />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex + 1) % images.length); }}
        aria-label="下一张"
        className={`${ctrl} right-4`}
      >
        <ChevronRight size={24} />
      </button>

      <img
        src={images[currentIndex]}
        alt={`截图 ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg border-2 border-ink shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <span className="rounded-md bg-white border-2 border-ink px-2.5 py-1 text-xs font-bold text-ink shadow-hard-xs">
          {currentIndex + 1} / {images.length}
        </span>
        <span className="text-white/50 text-xs">← → 切换 · ESC 关闭</span>
      </div>
    </div>
  );
}

/* ============================================================ */
/*                       SECTION TITLE                          */
/* ============================================================ */

function SectionTitle({
  icon, title, extra
}: {
  icon: React.ReactNode;
  title: string;
  extra?: string;
}) {
  return (
    <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
      <span className="w-1 h-4 bg-pine rounded-full" />
      <span className="text-pine">{icon}</span>
      {title}
      {extra && <span className="text-[11px] font-normal text-moss ml-0.5">{extra}</span>}
    </h3>
  );
}
