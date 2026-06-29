"use client";
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Gamepad2, Cloud, HardDrive, Key, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

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
  '动作': 'from-red-100 to-orange-50 border-red-200 text-red-600',
  '角色扮演': 'from-purple-100 to-pink-50 border-purple-200 text-purple-600',
  '策略': 'from-blue-100 to-cyan-50 border-blue-200 text-blue-600',
  '模拟': 'from-green-100 to-emerald-50 border-green-200 text-green-600',
  '竞速': 'from-yellow-100 to-amber-50 border-yellow-200 text-yellow-600',
  '休闲': 'from-teal-100 to-cyan-50 border-teal-200 text-teal-600',
  '其他': 'from-slate-100 to-zinc-50 border-slate-200 text-slate-500',
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f0ff] via-[#faf8ff] to-[#f8f5ff]">
      {/* 柔和背景装饰 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-200/30 via-pink-200/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-blue-200/20 via-indigo-200/10 to-transparent blur-3xl" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* === 顶部导航 === */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-purple-500 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">返回主页</span>
          </Link>
          {gameData && (
            <span className="text-xs text-slate-400">
              更新于 {gameData.updated}
            </span>
          )}
        </header>

        {/* === 标题区域 === */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md shadow-purple-200/50 border border-purple-100 mb-5">
            <Gamepad2 size={30} className="text-purple-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              PC 游戏资源库
            </span>
          </h1>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            精选 PC 游戏合集 · 解压即玩 · 持续更新
          </p>

          {/* 统计条 */}
          {gameData && (
            <div className="inline-flex items-center gap-5 mt-5 px-6 py-2.5 rounded-full bg-white border border-purple-100 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-purple-500 font-extrabold text-xl">{gameData.count}</span>
                <span className="text-slate-400">款游戏</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-pink-500 font-extrabold text-xl">{categories.length}</span>
                <span className="text-slate-400">个分类</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Key size={12} />
                <code className="text-amber-500 font-mono text-[11px]">laoquzhang.com</code>
              </div>
            </div>
          )}
        </div>

        {/* === 免责声明 === */}
        <div className="mb-10 mx-auto max-w-3xl">
          <div className="relative rounded-2xl bg-amber-50 border border-amber-200/60 p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-amber-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-amber-700">网站声明</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  小站为非商业性盈利网站，资源信息均转载自互联网
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  小站没有充值，也没有售卖会员及 VIP 账号，更没有购买、打赏、捐赠等相关行为
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* === 搜索与分类筛选 === */}
        <div className="space-y-5 mb-8">
          {/* 搜索框 */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-10 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-purple-400 focus:ring-3 focus:ring-purple-100 transition-all shadow-sm"
              placeholder="搜索游戏名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
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
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  !selectedCategory
                    ? 'bg-purple-500 text-white shadow-md shadow-purple-200'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50'
                }`}
              >
                全部
              </button>
              {categories.map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-200'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50'
                  }`}
                >
                  {CATEGORY_ICON[cat] || '🎮'} {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* === 游戏列表 === */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
              <Gamepad2 size={20} className="absolute inset-0 m-auto text-purple-400" />
            </div>
            <p className="text-slate-400 text-sm mt-4">加载游戏资源中...</p>
          </div>
        ) : filteredResources.length > 0 ? (
          <>
            {/* 结果统计 */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-slate-400">
                {selectedCategory && `分类「${selectedCategory}」· `}
                共 {filteredResources.length} 款游戏
                {searchTerm && ` · 搜索「${searchTerm}」`}
              </p>
              <p className="text-xs text-slate-400">
                {currentPage}/{totalPages} 页
              </p>
            </div>

            {/* 游戏卡片网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pagedResources.map((game, idx) => {
                const globalIdx = (currentPage - 1) * PAGE_SIZE + idx;
                const catColor = CATEGORY_COLORS[game.tags?.[0]] || CATEGORY_COLORS['其他'];
                const isExpanded = expandedCard === game.id;

                return (
                  <div
                    key={game.id}
                    className="group relative p-5 rounded-2xl bg-white border border-slate-100 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300 flex flex-col"
                  >
                    {/* 序号角标 */}
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400">
                        {globalIdx + 1}
                      </span>
                    </div>

                    {/* 分类标签 */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">{CATEGORY_ICON[game.tags?.[0]] || '🎮'}</span>
                      {game.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className={`px-2 py-0.5 rounded-md text-[10px] font-medium bg-gradient-to-r ${catColor} border`}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* 游戏名称 */}
                    <h3 className="text-sm font-bold text-slate-800 mb-2 group-hover:text-purple-600 transition-colors leading-snug line-clamp-2">
                      {game.name}
                    </h3>

                    {/* 描述 - 可展开 */}
                    <div className="mb-4 flex-1">
                      <p className={`text-xs text-slate-500 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {game.desc}
                      </p>
                      {game.desc.length > 60 && (
                        <button
                          onClick={() => toggleExpand(game.id)}
                          className="text-[10px] text-purple-400 hover:text-purple-600 mt-1 flex items-center gap-0.5"
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
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-700 transition-all text-xs font-medium group/btn"
                        >
                          <Cloud size={13} className="group-hover/btn:scale-110 transition-transform" />
                          夸克网盘
                        </a>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs">
                          <Cloud size={13} />
                          暂无
                        </div>
                      )}
                      {game.baiduLink ? (
                        <a
                          href={game.baiduLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 hover:border-sky-300 hover:text-sky-700 transition-all text-xs font-medium group/btn"
                        >
                          <HardDrive size={13} className="group-hover/btn:scale-110 transition-transform" />
                          百度网盘
                        </a>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs">
                          <HardDrive size={13} />
                          暂无
                        </div>
                      )}
                    </div>

                    {/* 底部信息 - 仅解压密码 */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Key size={10} />
                        <code className="text-amber-500 font-mono">{game.code}</code>
                      </div>
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
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                      className={`w-9 h-9 rounded-xl text-xs font-medium transition-all ${
                        pageNum === currentPage
                          ? 'bg-purple-500 text-white shadow-md shadow-purple-200'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
              <Search size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm mb-2">未找到匹配的游戏资源</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
              className="text-xs text-purple-500 hover:text-purple-700 transition-colors"
            >
              清除筛选条件
            </button>
          </div>
        )}

        {/* === 页脚 === */}
        <footer className="mt-16 pb-8">
          <div className="border-t border-slate-200 pt-8">
            <div className="max-w-xl mx-auto mb-6">
              <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-4 text-center">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <span className="text-amber-600 font-medium">📢 网站声明：</span>
                  小站为非商业性盈利网站，资源信息均转载自互联网。小站没有充值，也没有售卖会员及 VIP 账号，更没有购买、打赏、捐赠等相关行为。
                </p>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400">
              © 2026 峻峻尼游戏资源库 · 仅供个人学习交流使用
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
