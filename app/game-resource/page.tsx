"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';

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

export default function GameResourcePage() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetch('/game-resources.json')
      .then(res => res.json())
      .then(data => {
        setGameData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allTags = gameData
    ? Array.from(new Set(gameData.resources.flatMap(r => r.tags).filter(Boolean)))
    : [];

  const filteredResources = gameData
    ? gameData.resources.filter(item => {
        const matchesSearch =
          !searchTerm ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesTag = selectedTag ? item.tags?.includes(selectedTag) : true;
        return matchesSearch && matchesTag;
      })
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      {/* 背景装饰 */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_50%)]" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* 导航 */}
        <header className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm">返回主页</span>
          </Link>
          <span className="text-xs text-purple-400/60">
            {gameData ? `更新于 ${gameData.updated}` : ''}
          </span>
        </header>

        {/* 标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl">🎮</span>
            <span className="text-sm font-medium text-purple-300 tracking-wide uppercase">Game Collection</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
            PC 游戏资源库
          </h1>
          <p className="text-purple-200/70 text-base max-w-xl mx-auto">
            精品 PC 游戏合集，解压即玩 | 解压密码：laoquzhang.com
          </p>
        </div>

        {/* 搜索与标签 */}
        <div className="space-y-4 mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-purple-400/50 outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-sm"
              placeholder="搜索游戏名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  !selectedTag
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-purple-300 hover:bg-white/10'
                }`}
              >
                全部 ({gameData?.count || 0})
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedTag === tag
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-purple-300 hover:bg-white/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 游戏列表 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-purple-400 mt-4 text-sm">加载中...</p>
          </div>
        ) : filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((game) => (
              <div
                key={game.id}
                className="group p-5 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-white/10 transition-all duration-300 flex flex-col"
              >
                {/* 名称 */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors line-clamp-2">
                  {game.name}
                </h3>

                {/* 描述 */}
                <p className="text-xs text-gray-400 mb-4 line-clamp-2 flex-1">
                  {game.desc}
                </p>

                {/* 标签 */}
                {game.tags && game.tags.length > 0 && (
                  <div className="flex gap-1.5 mb-3">
                    {game.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 下载按钮 */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  {game.quarkLink && (
                    <a
                      href={game.quarkLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-xs font-medium"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                      夸克网盘
                    </a>
                  )}
                  {game.baiduLink && (
                    <a
                      href={game.baiduLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all text-xs font-medium"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                      百度网盘
                    </a>
                  )}
                </div>

                {/* 解压密码 */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">解压密码</span>
                  <code className="text-[11px] text-yellow-400/80 font-mono">{game.code}</code>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-purple-400/60">未找到匹配的游戏资源</p>
          </div>
        )}

        {/* 页脚 */}
        <footer className="text-center mt-16 pb-8 border-t border-white/5 pt-8">
          <p className="text-xs text-gray-500">
            © 2026 峻峻尼游戏资源 | 资源来源于网络，仅供个人学习使用
          </p>
        </footer>
      </main>
    </div>
  );
}
