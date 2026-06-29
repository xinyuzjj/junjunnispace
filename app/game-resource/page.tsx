"use client";
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Gamepad2, Cloud, HardDrive, Key, ChevronDown, ChevronUp, AlertTriangle, Info, ExternalLink } from 'lucide-react';

interface GameResource {
  id: string;
  name: string;
  category: string;
  desc: string;
  code: string;
  quarkLink: string;
  baiduLink: string;
  tags: string[];
  netdisk: { showQuark: boolean; showBaidu: boolean };
  sourceUrl: string;
}

interface GameData {
  updated: string;
  count: number;
  resources: GameResource[];
}

const PAGE_SIZE = 12;

const CATEGORY_COLORS: Record<string, string> = {
  '动作': 'from-red-500/20 to-orange-500/10 border-red-500/30 text-red-300',
  '角色扮演': 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-300',
  '策略': 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300',
  '模拟': 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-300',
  '竞速': 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-300',
  '休闲': 'from-teal-500/20 to-cyan-500/10 border-teal-500/30 text-teal-300',
  '其他': 'from-slate-500/20 to-zinc-500/10 border-slate-500/30 text-slate-300',
};

const CATEGORY_ICON: Record<string, string> = {
  '动作': '⚔️',
  '角色扮演': '🧙',
  '策略': '♟️',
  '模拟': '🏗️',
  '竞速': '🏎️',
  '休闲': '🎯',
  '其他': '🎮',
};

const RANK_COLORS = ['text-yellow-300', 'text-slate-300', 'text-amber-400'];

export default function GameResourcePage() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    fetch('/game-resources.json')
      .then(res => res.json())
      .then(data => {
        setGameData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Collect all categories from tags
  const categories = useMemo(() => {
    if (!gameData) return [];
    const cats = new Map<string, number>();
    gameData.resources.forEach(r => {
      r.tags?.forEach(t => {
        cats.set(t, (cats.get(t) || 0) + 1);
      });
    });
    return Array.from(cats.entries()).sort((a, b) => b[1] - a[1]);
  }, [gameData]);

  const filteredResources = useMemo(() => {
    if (!gameData) return [];
    return gameData.resources.filter(item => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory ? item.tags?.includes(selectedCategory) : true;
      return matchesSearch && matchesCategory;
    });
  }, [gameData, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredResources.length / PAGE_SIZE);
  const pagedResources = filteredResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* 背景 */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,50,255,0.12),transparent)]" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] bg-[size:60px_60px]" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* === 顶部导航 === */}
        <header className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">返回主页</span>
          </Link>
          {gameData && (
            <span className="text-xs text-zinc-600">
              更新于 {gameData.updated}
            </span>
          )}
        </header>

        {/* === 标题区域 === */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/20 mb-4">
            <Gamepad2 size={28} className="text-purple-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400 bg-clip-text text-transparent">
              PC 游戏资源库
            </span>
          </h1>
          <p className="text-zinc-500 text-sm max-w-lg mx-auto">
            精选 PC 游戏合集，解压即玩 · 持续更新
          </p>

          {/* 统计条 */}
          {gameData && (
            <div className="inline-flex items-center gap-5 mt-4 px-5 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-purple-400 font-bold text-lg">{gameData.count}</span>
                <span className="text-zinc-500">款游戏</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-pink-400 font-bold text-lg">{categories.length}</span>
                <span className="text-zinc-500">个分类</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Key size={12} />
                <code className="text-yellow-500/80 font-mono text-[11px]">laoquzhang.com</code>
              </div>
            </div>
          )}
        </div>

        {/* === 免责声明 === */}
        <div className="mb-8 mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/5 via-amber-500/[0.02] to-amber-500/5 border border-amber-500/15 p-4 md:p-5">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500/60 via-amber-500/30 to-transparent rounded-l-2xl" />
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-amber-300/90">网站声明</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  小站为非商业性盈利网站，资源信息均转载自互联网
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  小站没有充值，也没有售卖会员及 VIP 账号，更没有购买、打赏、捐赠等相关行为
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* === 搜索与分类筛选 === */}
        <div className="space-y-4 mb-8">
          {/* 搜索框 */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all"
              placeholder="搜索游戏名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                ×
              </button>
            )}
          </div>

          {/* 分类标签 */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  !selectedCategory
                    ? 'bg-purple-600/80 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-zinc-300'
                }`}
              >
                全部 ({gameData?.count || 0})
              </button>
              {categories.map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-purple-600/80 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-zinc-300'
                  }`}
                >
                  {CATEGORY_ICON[cat] || '🎮'} {cat} ({count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* === 游戏列表 === */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin" />
              <Gamepad2 size={20} className="absolute inset-0 m-auto text-purple-400/60" />
            </div>
            <p className="text-zinc-500 text-sm mt-4">加载游戏资源中...</p>
          </div>
        ) : filteredResources.length > 0 ? (
          <>
            {/* 结果统计 */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-zinc-500">
                {selectedCategory && `分类「${selectedCategory}」· `}
                共 {filteredResources.length} 款游戏
                {searchTerm && ` · 搜索「${searchTerm}」`}
              </p>
              <p className="text-xs text-zinc-600">
                {currentPage}/{totalPages} 页
              </p>
            </div>

            {/* 游戏卡片网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {pagedResources.map((game, idx) => {
                const globalIdx = (currentPage - 1) * PAGE_SIZE + idx;
                const rank = globalIdx < 3 ? RANK_COLORS[globalIdx] : 'text-zinc-600';
                const catColor = CATEGORY_COLORS[game.tags?.[0]] || CATEGORY_COLORS['其他'];
                const isExpanded = expandedCard === game.id;

                return (
                  <div
                    key={game.id}
                    className="group relative p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/20 hover:bg-white/[0.05] transition-all duration-300 flex flex-col"
                  >
                    {/* 排名角标 */}
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0a0a0f] border border-white/[0.08] flex items-center justify-center">
                      <span className={`text-[10px] font-bold ${rank}`}>
                        {globalIdx + 1}
                      </span>
                    </div>

                    {/* 分类小图标 */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-sm">{CATEGORY_ICON[game.tags?.[0]] || '🎮'}</span>
                      {game.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded-md text-[10px] font-medium bg-gradient-to-r ${catColor} border`}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* 游戏名称 */}
                    <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-purple-300 transition-colors leading-snug line-clamp-2">
                      {game.name}
                    </h3>

                    {/* 描述 - 可展开 */}
                    <div className="mb-3 flex-1">
                      <p className={`text-[11px] text-zinc-500 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {game.desc}
                      </p>
                      {game.desc.length > 60 && (
                        <button
                          onClick={() => toggleExpand(game.id)}
                          className="text-[10px] text-purple-400/70 hover:text-purple-300 mt-0.5 flex items-center gap-0.5"
                        >
                          {isExpanded ? <>收起 <ChevronUp size={10} /></> : <>展开 <ChevronDown size={10} /></>}
                        </button>
                      )}
                    </div>

                    {/* 下载按钮 */}
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      {game.quarkLink ? (
                        <a
                          href={game.quarkLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/15 text-red-300 hover:bg-red-500/[0.15] hover:border-red-500/30 hover:text-red-200 transition-all text-xs font-medium group/btn"
                        >
                          <Cloud size={13} className="group-hover/btn:scale-110 transition-transform" />
                          夸克网盘
                        </a>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-600 text-xs">
                          <Cloud size={13} />
                          暂无
                        </div>
                      )}
                      {game.baiduLink ? (
                        <a
                          href={game.baiduLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/15 text-blue-300 hover:bg-blue-500/[0.15] hover:border-blue-500/30 hover:text-blue-200 transition-all text-xs font-medium group/btn"
                        >
                          <HardDrive size={13} className="group-hover/btn:scale-110 transition-transform" />
                          百度网盘
                        </a>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-600 text-xs">
                          <HardDrive size={13} />
                          暂无
                        </div>
                      )}
                    </div>

                    {/* 底部信息 */}
                    <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                        <Key size={10} />
                        <code className="text-yellow-500/60 font-mono">{game.code}</code>
                      </div>
                      {game.sourceUrl && (
                        <a
                          href={game.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5 transition-colors"
                        >
                          来源 <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  上一页
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                        pageNum === currentPage
                          ? 'bg-purple-600/80 text-white shadow-lg shadow-purple-600/20'
                          : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <Search size={24} className="text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm mb-1">未找到匹配的游戏资源</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              清除筛选条件
            </button>
          </div>
        )}

        {/* === 页脚 === */}
        <footer className="mt-16 pb-8">
          <div className="border-t border-white/[0.05] pt-8">
            {/* 底部声明 */}
            <div className="max-w-xl mx-auto mb-6">
              <div className="rounded-xl bg-amber-500/[0.03] border border-amber-500/10 p-4 text-center">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  <span className="text-amber-400/80 font-medium">📢 网站声明：</span>
                  小站为非商业性盈利网站，资源信息均转载自互联网。小站没有充值，也没有售卖会员及 VIP 账号，更没有购买、打赏、捐赠等相关行为。
                </p>
              </div>
            </div>

            <p className="text-center text-[11px] text-zinc-600">
              © 2026 峻峻尼游戏资源库 · 仅供个人学习交流使用
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
