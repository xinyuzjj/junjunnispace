"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Gamepad2, Cloud, HardDrive, Key,
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

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; gradient: string }> = {
  '动作': { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '⚔️', gradient: 'from-red-500 to-orange-500' },
  '角色扮演': { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: '🧙', gradient: 'from-purple-500 to-pink-500' },
  '策略': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '♟️', gradient: 'from-blue-500 to-cyan-500' },
  '模拟': { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: '🏗️', gradient: 'from-green-500 to-emerald-500' },
  '竞速': { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '🏎️', gradient: 'from-yellow-500 to-amber-500' },
  '射击': { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🔫', gradient: 'from-orange-500 to-red-500' },
  '格斗': { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: '🥊', gradient: 'from-rose-500 to-pink-500' },
  '解谜': { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: '🧩', gradient: 'from-indigo-500 to-violet-500' },
  '恐怖': { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300', icon: '👻', gradient: 'from-gray-700 to-slate-800' },
  '冒险': { color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', icon: '🗺️', gradient: 'from-cyan-500 to-sky-500' },
  '独立': { color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', icon: '💎', gradient: 'from-pink-500 to-rose-400' },
  '休闲': { color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', icon: '🎯', gradient: 'from-teal-500 to-cyan-500' },
  '其他': { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: '🎮', gradient: 'from-slate-500 to-gray-500' },
};

const CARD_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-cyan-5 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-fuchsia-500 to-pink-600',
];

function getCardGradient(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

/* ======================== Components ======================== */

/** Skeleton loader for cards */
function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-50 rounded w-full" />
        <div className="h-3 bg-slate-50 rounded w-2/3" />
        <div className="flex gap-2 mt-2">
          <div className="h-9 flex-1 bg-slate-50 rounded-xl" />
          <div className="h-9 flex-1 bg-slate-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Copy button component */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all duration-200 ${
        copied ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent'
      }`}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? '已复制' : label}
    </button>
  );
}

/** Info tag pill */
function InfoPill({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
      {Icon && <Icon size={12} className="text-purple-400 flex-shrink-0" />}
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-[11px] font-medium text-slate-700">{value}</span>
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
  const catConfig = (cat: string) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['其他'];

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const currentShots = selectedGame?.screenshots || [];
  const hasDetails = !!selectedGame?.details;
  const hasScreenshots = currentShots.length > 0;

  /* ======================== RENDER ======================== */

  return (
    <div className="min-h-screen bg-[#f8f7fc]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-200/25 via-pink-150/15 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-200/20 via-indigo-150/10 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-purple-50/30 to-transparent blur-2xl" />
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">

        {/* ---- Header ---- */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-purple-500 transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
            返回主页
          </Link>
          {gameData && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock size={12} /> 更新于 {gameData.updated}
            </span>
          )}
        </header>

        {/* ---- Title Section ---- */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-300/40 mb-5">
            <Gamepad2 size={28} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-3 tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              PC 游戏资源库
            </span>
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">精选 PC 游戏合集 · 解压即玩 · 持续更新</p>
          {gameData && (
            <div className="inline-flex items-center gap-4 px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-purple-100 shadow-sm shadow-purple-100/30">
              <StatBadge value={String(gameData.count)} label="款游戏" color="purple" />
              <div className="w-px h-4 bg-purple-100" />
              <StatBadge value={String(categories.length)} label="个分类" color="pink" />
              <div className="w-px h-4 bg-purple-100" />
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Key size={11} />
                <code className="text-amber-500 font-mono font-semibold">laoquzhang.com</code>
              </div>
            </div>
          )}
        </div>

        {/* ---- Disclaimer ---- */}
        <div className="mb-10 mx-auto max-w-2xl">
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/60 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-amber-700">声明：</span>本站为非商业性网站，资源转载自互联网，仅供个人学习交流使用。
              </p>
            </div>
          </div>
        </div>

        {/* ---- Search & Filter ---- */}
        <div className="space-y-4 mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl py-3 pl-11 pr-10 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-purple-400 focus:ring-3 focus:ring-purple-100/60 focus:bg-white transition-all shadow-sm"
              placeholder="搜索游戏名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            )}
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <FilterChip active={!selectedCategory} onClick={() => setSelectedCategory(null)} label="全部" count={filteredResources.length} />
              {categories.map(([cat, count]) => (
                <FilterChip
                  key={cat}
                  active={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  label={`${CATEGORY_CONFIG[cat]?.icon || ''} ${cat}`}
                  count={count}
                  color={catConfig(cat).color}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---- Game Grid ---- */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filteredResources.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-5 px-1">
              <p className="text-xs text-slate-400">
                {selectedCategory && <span className="font-medium text-purple-500">{selectedCategory}</span>}
                {selectedCategory && ' · '}
                共 <span className="font-semibold text-slate-600">{filteredResources.length}</span> 款游戏
                {searchTerm && <span className="ml-1 text-slate-400">「{searchTerm}」</span>}
              </p>
              <p className="text-xs text-slate-400">{currentPage}/{totalPages} 页</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {pagedResources.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  catConfig={catConfig(game.category)}
                  gradient={getCardGradient(game.id)}
                  onClick={() => setSelectedGame(game)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </>
        ) : (
          <EmptyState onReset={() => { setSearchTerm(''); setSelectedCategory(null); }} />
        )}

        {/* ---- Footer ---- */}
        <footer className="mt-16 pb-8">
          <div className="border-t border-slate-200/80 pt-8">
            <div className="max-w-xl mx-auto mb-6">
              <div className="rounded-xl bg-amber-50/70 border border-amber-200/50 p-4 text-center">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <span className="text-amber-600 font-medium">📢 网站声明：</span>
                  本站为非商业性网站，资源均转载自互联网。无充值、无会员、无售卖行为，仅供学习交流。
                </p>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400">© 2026 峻峻尼游戏资源库 · 仅供个人学习交流</p>
          </div>
        </footer>
      </main>

      {/* ================================================================ */}
      {/*                    GAME DETAIL MODAL                           */}
      {/* ================================================================ */}
      {selectedGame && (
        <DetailModal
          game={selectedGame}
          catConfig={catConfig(selectedGame.category)}
          gradient={getCardGradient(selectedGame.id)}
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

function StatBadge({ value, label, color }: { value: string; label: string; color: 'purple' | 'pink' }) {
  const colors = color === 'purple'
    ? { num: 'text-purple-600', ring: 'ring-purple-100' }
    : { num: 'text-pink-500', ring: 'ring-pink-100' };
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`font-extrabold text-lg ${colors.num}`}>{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

function FilterChip({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count: number; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-200/50 scale-105'
          : 'bg-white/80 backdrop-blur-sm text-slate-500 border border-slate-200 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50/50'
      }`}
    >
      {label}
      {!active && <span className="ml-1 opacity-50">({count})</span>}
    </button>
  );
}

/** Game card component */
function GameCard({
  game, catConfig, gradient, onClick
}: {
  game: GameResource;
  catConfig: typeof CATEGORY_CONFIG[string];
  gradient: string;
  onClick: () => void;
}) {
  const hasCover = !!game.coverImage;
  const hasShots = (game.screenshots?.length ?? 0) > 0;
  const shotCount = game.screenshots?.length ?? 0;
  const hasQuark = !!game.quarkLink;
  const hasBaidu = !!game.baiduLink;
  const descPreview = game.desc?.slice(0, 60) || game.versionInfo?.slice(0, 60) || '';

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl bg-white border border-slate-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-100/40 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Cover area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {hasCover ? (
          <>
            <img
              src={game.coverImage!}
              alt={game.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                el.nextElementSibling!.classList.remove('hidden');
              }}
            />
            <div className={`hidden absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Gamepad2 size={36} className="text-white/70" />
            </div>
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Gamepad2 size={36} className="text-white/70" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top-left category badge */}
        <div className="absolute top-2 left-2 flex gap-1.5 z-10">
          {game.tags?.slice(0, 1).map(tag => (
            <span
              key={tag}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${catConfig.bg} ${catConfig.color} ${catConfig.border} border backdrop-blur-sm shadow-sm`}
            >
              {catConfig.icon} {tag}
            </span>
          ))}
        </div>

        {/* Screenshot count */}
        {hasShots && (
          <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/45 text-white/95 backdrop-blur-sm flex items-center gap-1 shadow-sm">
            <ImageIcon size={9} /> {shotCount}
          </div>
        )}

        {/* "View details" hint on hover */}
        <div className="absolute bottom-2 right-2 z-10 px-2.5 py-1 rounded-lg bg-white/90 text-[10px] font-medium text-purple-600 shadow-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1">
          <Eye size={9} /> 查看详情
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 min-h-0">
        {/* Name & desc */}
        <h3 className="text-[13px] font-bold text-slate-800 mb-1 group-hover:text-purple-600 transition-colors leading-snug line-clamp-1">
          {game.name}
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-2.5 flex-shrink-0 min-h-[32px]">
          {descPreview}{descPreview.length >= 60 ? '...' : ''}
        </p>

        {/* Netdisk buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          {hasQuark ? (
            <a
              href={game.quarkLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-50/80 border border-rose-200/70 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all text-xs font-medium"
            >
              <Cloud size={13} /> 夸克网盘
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-350 text-xs">
              夸克 暂无
            </div>
          )}
          {hasBaidu ? (
            <a
              href={game.baiduLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-sky-50/80 border border-sky-200/70 text-sky-600 hover:bg-sky-100 hover:border-sky-300 transition-all text-xs font-medium"
            >
              <HardDrive size={13} /> 百度网盘
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-350 text-xs">
              百度 暂无
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
          <code className="text-amber-500/80 font-mono text-[10px]">{game.code}</code>
          {game.versionInfo && (
            <span className="truncate max-w-[120px]" title={game.versionInfo}>
              {game.versionInfo.split('|')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pagination component */
function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  const pages = Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
    if (totalPages <= 9) return i + 1;
    if (currentPage <= 4) return i + 1;
    if (currentPage >= totalPages - 3) return totalPages - 8 + i;
    return currentPage - 4 + i;
  });

  return (
    <div className="flex items-center justify-center gap-1.5 mt-10">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={14} className="-mr-0.5" />上一页
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 rounded-xl text-xs font-medium transition-all ${
            p === currentPage
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-200/40'
              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
      >
        下一页<ChevronRight size={14} className="-ml-0.5" />
      </button>
    </div>
  );
}

/** Empty state */
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-18 h-18 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
        <Search size={26} className="text-slate-300" />
      </div>
      <p className="text-slate-500 text-sm font-medium mb-1">未找到匹配的游戏</p>
      <p className="text-slate-400 text-xs mb-4">试试其他关键词或切换分类</p>
      <button onClick={onReset} className="text-xs text-purple-500 hover:text-purple-700 font-medium transition-colors">
        清除筛选条件
      </button>
    </div>
  );
}

/* ============================================================ */
/*                     DETAIL MODAL                             */
/* ============================================================ */

interface DetailModalProps {
  game: GameResource;
  catConfig: typeof CATEGORY_CONFIG[string];
  gradient: string;
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
  game, catConfig, gradient,
  activeTab, setActiveTab, showFullDesc, setShowFullDesc, copiedCode, copyCode,
  onClose, onScreenshotClick, ref: detailRef,
}: DetailModalProps) => {

  const shots = game.screenshots || [];
  const hasDetails = !!game.details;
  const hasShots = shots.length > 0;
  const infoEntries = game.info ? Object.entries(game.info) : [];

  // Determine which tabs are available
  const tabs = [
    { key: 'intro' as const, label: '简介', available: true },
    ...(hasDetails ? [{ key: 'details' as const, label: '详细介绍', available: true }] : []),
    ...(hasShots ? [{ key: 'screenshots' as const, label: `截图 (${shots.length})`, available: true }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm pt-4 pb-10 px-3 md:px-6"
      onClick={(e) => { if ((e.target as HTMLElement).classList.contains('fixed')) onClose(); }}
    >
      <div
        ref={detailRef}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-4 md:my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========== HERO BANNER ========== */}
        <div className="relative w-full aspect-[21/9] md:aspect-[2.5/1] bg-slate-900 overflow-hidden">
          {game.coverImage ? (
            <img
              src={game.coverImage}
              alt={game.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-all backdrop-blur-sm"
          >
            <X size={17} />
          </button>

          {/* Title overlay at bottom of banner */}
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
            {/* Category tags */}
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              {game.tags?.map(tag => (
                <span
                  key={tag}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${catConfig.bg} ${catConfig.color} ${catConfig.border} border backdrop-blur-sm shadow-sm`}
                >
                  {catConfig.icon} {tag}
                </span>
              ))}
              {hasShots && (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/30 text-white/90 backdrop-blur-sm flex items-center gap-1">
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

          {/* ---- Info bar ---- */}
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

          {/* ---- Version info box ---- */}
          {game.versionInfo && (
            <div className="rounded-xl bg-gradient-to-r from-purple-50/80 to-indigo-50/60 border border-purple-100/80 p-4">
              <div className="flex items-start gap-2">
                <Package size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed break-all">{game.versionInfo}</p>
              </div>
            </div>
          )}

          {/* ---- Tabs (when both details and screenshots exist) ---- */}
          {(hasDetails && hasShots) && (
            <div className="flex items-center gap-1 border-b border-slate-100">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-xs font-medium transition-all relative ${
                    activeTab === tab.key
                      ? 'text-purple-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ---- TAB: Intro / Brief Description ---- */}
          {(activeTab === 'intro' || !hasDetails) && game.desc && (
            <div className="space-y-3">
              <SectionTitle icon={<Star size={15} />} title="游戏简介" color="purple" />
              <div className="relative">
                <p className={`text-sm text-slate-600 leading-relaxed whitespace-pre-line ${!showFullDesc ? 'line-clamp-4' : ''}`}>
                  {game.desc}
                </p>
                {game.desc.length > 180 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-500 hover:text-purple-700 transition-colors"
                  >
                    {showFullDesc ? <>收起 <ChevronUp size={12} /></> : <>展开全文 <ChevronDown size={12} /></>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ---- TAB: Details ---- */}
          {hasDetails && (activeTab === 'details' || (!hasShots && activeTab === 'intro')) && (
            <div className="space-y-3">
              <SectionTitle icon={<Layers size={15} />} title="关于此游戏" color="blue" />
              <div className="prose prose-sm max-w-none">
                <div className="text-sm text-slate-600 leading-relaxed max-h-[500px] overflow-y-auto pr-3 custom-scrollbar whitespace-pre-line space-y-3">
                  {game.details}
                </div>
              </div>
            </div>
          )}

          {/* ---- TAB: Screenshots Gallery ---- */}
          {hasShots && (
            <div className="space-y-3">
              <SectionTitle icon={<ImageIcon size={15} />} title="游戏截图" color="pink" extra={`(${shots.length})`} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {shots.map((shot, i) => (
                  <div
                    key={i}
                    onClick={() => onScreenshotClick(i)}
                    className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 cursor-pointer group/shot"
                  >
                    <img
                      src={shot}
                      alt={`截图 ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover/shot:scale-105 transition-transform duration-300 ease-out"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/shot:bg-black/25 transition-all duration-200 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover/shot:opacity-100 transform group-hover/shot:scale-100 scale-75 transition-all duration-200">
                        <ZoomIn size={16} className="text-slate-700" />
                      </div>
                    </div>
                    {/* Shot index indicator */}
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/50 text-white/90 text-[10px] font-medium backdrop-blur-sm">
                      {i + 1}/{shots.length}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- DOWNLOAD SECTION ---- */}
          <div className="pt-5 border-t border-slate-100 space-y-4">
            <SectionTitle icon={<Download size={15} />} title="下载资源" color="emerald" />

            {/* Main download buttons */}
            <div className="grid grid-cols-2 gap-3">
              {game.quarkLink ? (
                <a
                  href={game.quarkLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 transition-all text-sm font-bold shadow-lg shadow-rose-200/50"
                >
                  <Cloud size={17} /> 夸克网盘下载
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-sm">
                  夸克暂无
                </div>
              )}
              {game.baiduLink ? (
                <a
                  href={game.baiduLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:from-sky-600 hover:to-blue-600 transition-all text-sm font-bold shadow-lg shadow-sky-200/50"
                >
                  <HardDrive size={17} /> 百度网盘下载
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-sm">
                  百度暂无
                </div>
              )}
            </div>

            {/* Password & Source row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {/* Password */}
              <div className="flex items-center gap-2">
                <Key size={13} className="text-slate-400" />
                <span className="text-xs text-slate-400">解压密码：</span>
                <code className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 font-mono text-xs font-semibold select-all">
                  {game.code}
                </code>
                <button
                  onClick={copyCode}
                  className={`ml-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    copiedCode
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {copiedCode ? <><Check size={10} /> 已复制</> : <><Copy size={10} /> 复制</>}
                </button>
              </div>

              {/* Source link */}
              {game.sourceUrl && (
                <a
                  href={game.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-purple-500 transition-colors"
                >
                  <ExternalLink size={11} /> 来源页面
                </a>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-lg bg-blue-50/60 border border-blue-100/60 p-3">
              <div className="flex items-start gap-2">
                <Shield size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
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
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
      >
        <X size={22} />
      </button>

      {/* Prev */}
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex - 1 + images.length) % images.length); }}
        className="absolute left-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Next */}
      <button
        onClick={(e) => { e.stopPropagation(); onNavigate((currentIndex + 1) % images.length); }}
        className="absolute right-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
      >
        <ChevronRight size={24} />
      </button>

      {/* Image */}
      <img
        src={images[currentIndex]}
        alt={`截图 ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Counter & hints */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <span className="text-white/70 text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
        <span className="text-white/40 text-xs">← → 切换 · ESC 关闭</span>
      </div>
    </div>
  );
}

/* ============================================================ */
/*                       SECTION TITLE                          */
/* ============================================================ */

function SectionTitle({
  icon, title, color, extra
}: {
  icon: React.ReactNode;
  title: string;
  color: 'purple' | 'blue' | 'pink' | 'emerald';
  extra?: string;
}) {
  const barColor = {
    purple: 'bg-purple-400',
    blue: 'bg-blue-400',
    pink: 'bg-pink-400',
    emerald: 'bg-emerald-400',
  }[color];

  const textColor = {
    purple: 'text-purple-700',
    blue: 'text-blue-700',
    pink: 'text-pink-700',
    emerald: 'text-emerald-700',
  }[color];

  return (
    <h3 className={`text-sm font-bold ${textColor} flex items-center gap-2`}>
      <span className={`w-1 h-4 ${barColor} rounded-full`} />
      {icon}
      {title}
      {extra && <span className="text-[11px] font-normal text-slate-400 ml-0.5">{extra}</span>}
    </h3>
  );
}
