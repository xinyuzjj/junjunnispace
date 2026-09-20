"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* ======================== 类型 ======================== */

interface Episode {
  ep: number;
  id: string;
  title: string;
  titleEn: string;
  file: string;
  sizeMB: number;
}

interface CourseData {
  base: string;
  course: {
    title: string;
    titleEn: string;
    subtitle: string;
    totalEpisodes: number;
  };
  episodes: Episode[];
}

/* ======================== 小组件 ======================== */

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

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

/* ======================== 页面 ======================== */

export default function VideoPage() {
  const [data, setData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [copied, setCopied] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/course-videos.json')
      .then((r) => r.json())
      .then((d: CourseData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // globals.css 的 --background 仍是深色，本页需显式覆盖为纸白
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#EFF6F0';
    return () => { document.body.style.background = prev; };
  }, []);

  const episodes = data?.episodes ?? [];
  const cur = episodes[current];

  const videoUrl = useMemo(() => {
    if (!cur) return '';
    const base = data?.base ?? '';
    return `${base}${cur.file}`;
  }, [cur, data]);

  const go = (idx: number) => {
    if (idx < 0 || idx >= episodes.length) return;
    setCurrent(idx);
    setVideoError(false);
    setCopied(false);
    // 手机上切集后滚回播放器
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const copyLink = async () => {
    if (!videoUrl) return;
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 忽略 */
    }
  };

  const totalMB = episodes.reduce((s, e) => s + (e.sizeMB || 0), 0);

  return (
    <div className="min-h-screen bg-paper text-ink">

      {/* ========== 顶栏 ========== */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-ink">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6">
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-6 py-3.5 md:py-0 md:min-h-[78px]">
            <Link href="/" className="flex items-center gap-2.5 font-black text-[18px] md:text-[23px] whitespace-nowrap">
              <span className="grid place-items-center w-[29px] h-[31px] md:w-[34px] md:h-[36px] rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs text-[17px] md:text-[21px]">
                峻
              </span>
              <span>峻峻尼分享</span>
            </Link>

            <nav className="flex items-center gap-1.5 md:gap-2.5 text-[11px] md:text-sm font-bold">
              <Link
                href="/game-resource"
                className="px-[7px] md:px-3 py-[7px] md:py-2 rounded-lg bg-pine-light text-pine-deep border-2 border-ink shadow-hard-xs whitespace-nowrap hover:bg-white transition-colors"
              >
                游戏库 ↗
              </Link>
              <Link
                href="/gh-search"
                className="px-[7px] md:px-3 py-[7px] md:py-2 rounded-lg bg-pine-light text-pine-deep border-2 border-ink shadow-hard-xs whitespace-nowrap hover:bg-white transition-colors"
              >
                找项目 ↗
              </Link>
              <span className="px-[7px] md:px-3 py-[7px] md:py-2 rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs whitespace-nowrap">
                交易教学
              </span>
              <a
                href="https://github.com/xinyuzjj"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-block px-3 py-2 rounded-lg bg-white border-2 border-ink shadow-hard-xs whitespace-nowrap hover:bg-pine-light transition-colors"
              >
                GitHub ↗
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* ========== 课程头 ========== */}
      <section className="dot-grid border-b border-sage">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-8 md:py-11">
          <p className="font-mono text-[10px] md:text-xs font-semibold tracking-[1.5px] text-moss">
            交易教学 · PRICE ACTION BOOTCAMP
          </p>
          <h1 className="mt-3.5 mb-3.5 text-[29px] md:text-[42px] leading-[1.2] font-black tracking-[-1px] md:tracking-[-1.5px]">
            掌握价格行为
            <span className="shadow-[inset_0_-0.35em_#B5D4B8]"> · 训练营</span>
          </h1>
          <p className="text-[13px] md:text-[15px] text-moss leading-[1.85] max-w-[640px]">
            {data?.course.subtitle ??
              '从市场结构、供需区，到流动性扫荡与溢价折价区间，17 集系统讲透价格行为交易。'}
          </p>

          <div className="flex flex-wrap gap-2.5 mt-5">
            <span className="font-mono text-[11px] font-bold text-pine-deep bg-white border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
              {loading ? '—' : `${episodes.length} 集`}
            </span>
            <span className="font-mono text-[11px] font-bold text-pine-deep bg-white border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
              {loading ? '—' : `约 ${(totalMB / 1024).toFixed(2)} GB`}
            </span>
            <span className="font-mono text-[11px] font-bold text-pine-deep bg-pine-light border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
              在线播放 · 永久免费
            </span>
          </div>
        </div>
      </section>

      {/* ========== 播放区 ========== */}
      <main className="max-w-[1120px] mx-auto px-4 md:px-6 pt-7 md:pt-9 pb-14">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-7 items-start">

          {/* 播放器 */}
          <div ref={playerRef} className="scroll-mt-[92px]">
            <div className="bg-white border-2 border-ink rounded-[12px] shadow-hard overflow-hidden">
              <div className="relative aspect-video bg-ink">
                {loading ? (
                  <div className="absolute inset-0 grid place-items-center text-pine-light font-mono text-xs">
                    加载中…
                  </div>
                ) : videoError ? (
                  <div className="absolute inset-0 grid place-items-center px-6 text-center">
                    <div>
                      <p className="text-white font-bold text-[13px] md:text-sm">视频暂时不可用</p>
                      <p className="text-pine-light/80 text-[11px] mt-2 leading-relaxed">
                        可能是网络波动，或该集仍在处理中；稍后重试，或点「下载本集」直接保存。
                      </p>
                    </div>
                  </div>
                ) : (
                  <video
                    key={cur?.id}
                    src={videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onError={() => setVideoError(true)}
                    className="w-full h-full"
                  >
                    你的浏览器不支持视频播放。
                  </video>
                )}
              </div>

              {/* 当前集信息 */}
              <div className="px-4 md:px-5 py-4 border-t-2 border-ink">
                {cur ? (
                  <>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h2 className="text-[16px] md:text-[19px] font-black leading-[1.4]">
                          第 {cur.ep} 集 · {cur.title}
                        </h2>
                        <p className="text-[11px] md:text-[12px] text-moss font-medium mt-[5px]">
                          {cur.titleEn}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-pine-deep bg-pine-light border border-sage rounded px-2 py-1 whitespace-nowrap">
                        {cur.sizeMB} MB
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2.5 mt-4">
                      <button
                        onClick={() => go(current - 1)}
                        disabled={current === 0}
                        className="px-3.5 py-2 rounded-lg bg-white border-2 border-ink shadow-hard-xs text-[12px] font-extrabold hover:bg-pine-light transition-colors disabled:opacity-40 disabled:shadow-none"
                      >
                        ← 上一集
                      </button>
                      <button
                        onClick={() => go(current + 1)}
                        disabled={current >= episodes.length - 1}
                        className="px-3.5 py-2 rounded-lg bg-white border-2 border-ink shadow-hard-xs text-[12px] font-extrabold hover:bg-pine-light transition-colors disabled:opacity-40 disabled:shadow-none"
                      >
                        下一集 →
                      </button>
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs text-[12px] font-extrabold hover:bg-pine-deep transition-colors"
                      >
                        下载本集 ↓
                      </a>
                      <button
                        onClick={copyLink}
                        className="px-3.5 py-2 rounded-lg bg-white border-2 border-ink shadow-hard-xs text-[12px] font-extrabold hover:bg-pine-light transition-colors"
                      >
                        {copied ? '已复制 ✓' : '复制直链'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-moss">{loading ? '加载中…' : '暂无剧集数据'}</p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-moss mt-3 leading-relaxed">
              视频通过 Cloudflare R2 直链播放，公开可下载；如遇播放卡顿，可点「下载本集」保存后本地观看。
            </p>
          </div>

          {/* 播放列表 */}
          <aside>
            <SectionHead
              index="01"
              title="全部剧集"
              right={
                <span className="text-[11px] md:text-[13px] text-moss whitespace-nowrap">
                  共 {loading ? '—' : episodes.length} 集
                </span>
              }
            />

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[58px] bg-white border-2 border-ink rounded-[10px] animate-pulse" />
                ))}
              </div>
            ) : (
              <ol className="space-y-2 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">
                {episodes.map((e, i) => {
                  const active = i === current;
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => go(i)}
                        aria-current={active ? 'true' : undefined}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[10px] border-2 transition-all duration-150 ${
                          active
                            ? 'bg-pine text-white border-ink shadow-hard-sm'
                            : 'bg-white border-ink shadow-hard-xs hover:bg-pine-light'
                        }`}
                      >
                        <span
                          className={`grid place-items-center w-8 h-8 rounded-md border-2 border-ink shrink-0 font-mono text-[12px] font-bold ${
                            active ? 'bg-white text-pine-deep' : 'bg-paper text-moss'
                          }`}
                        >
                          {active ? <PlayGlyph className="w-3.5 h-3.5" /> : String(e.ep).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-extrabold leading-[1.45] line-clamp-2">
                            {e.title}
                          </span>
                          <span
                            className={`block text-[10px] font-medium mt-[3px] truncate ${
                              active ? 'text-pine-light/85' : 'text-moss'
                            }`}
                          >
                            {e.titleEn}
                          </span>
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold shrink-0 ${
                            active ? 'text-pine-light/80' : 'text-moss'
                          }`}
                        >
                          {e.sizeMB}M
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>
        </div>
      </main>

      {/* ========== 页脚 ========== */}
      <footer className="border-t-2 border-ink bg-white">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-7 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-moss">© 2026 峻峻尼分享 · 交易教学</p>
          <Link href="/" className="text-[12px] font-bold text-pine-deep hover:underline">
            ← 返回首页
          </Link>
        </div>
      </footer>
    </div>
  );
}
