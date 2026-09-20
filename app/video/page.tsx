"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface Collection {
  id: string;
  title: string;
  titleEn: string;
  subtitle: string;
  tags?: string[];
  episodes: Episode[];
}

interface SiteInfo {
  title: string;
  subtitle: string;
  bilibili: string;
  bilibiliName: string;
  bilibiliNote: string;
}

interface CourseData {
  base: string;
  site: SiteInfo;
  collections: Collection[];
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

/** B 站小电视图标 */
function BiliGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.5 3.5h-2.3l1.15-1.15a.9.9 0 0 0-1.27-1.27L14.8 2.35a.9.9 0 0 0-.35.7v.45H9.55V3.05a.9.9 0 0 0-.35-.7L7.92 1.08A.9.9 0 1 0 6.65 2.35L7.8 3.5H5.5A3.5 3.5 0 0 0 2 7v10a3.5 3.5 0 0 0 3.5 3.5h13A3.5 3.5 0 0 0 22 17V7a3.5 3.5 0 0 0-3.5-3.5Zm1.7 13.5a1.7 1.7 0 0 1-1.7 1.7h-13A1.7 1.7 0 0 1 3.8 17V7a1.7 1.7 0 0 1 1.7-1.7h13A1.7 1.7 0 0 1 20.2 7v10Z" />
      <path d="M8.4 10.1a1.1 1.1 0 0 0-1.1 1.1v1.6a1.1 1.1 0 0 0 2.2 0v-1.6a1.1 1.1 0 0 0-1.1-1.1Zm7.2 0a1.1 1.1 0 0 0-1.1 1.1v1.6a1.1 1.1 0 0 0 2.2 0v-1.6a1.1 1.1 0 0 0-1.1-1.1Z" />
    </svg>
  );
}

function fmtGB(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}

/** 全站通用的 B 站横幅（总览 / 详情 / 页脚都复用） */
function BiliBanner({ site, compact }: { site?: SiteInfo; compact?: boolean }) {
  if (!site?.bilibili) return null;
  return (
    <a
      href={site.bilibili}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 rounded-[12px] border-2 border-ink bg-white shadow-hard-xs hover:shadow-hard transition-all ${
        compact ? 'px-3.5 py-3' : 'px-4 py-3.5'
      }`}
    >
      <span
        className="grid place-items-center shrink-0 rounded-lg border-2 border-ink text-white"
        style={{ background: '#FB7299', width: compact ? 34 : 40, height: compact ? 34 : 40 }}
      >
        <BiliGlyph className={compact ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-black leading-tight ${compact ? 'text-[13px]' : 'text-[14px] md:text-[15px]'}`}>
          {site.bilibiliName || 'B 站主页'}
          <span className="text-[#FB7299]"> ↗</span>
        </span>
        <span className="block text-[11px] text-moss mt-[3px] leading-snug">{site.bilibiliNote}</span>
      </span>
      <span
        className="shrink-0 hidden sm:grid place-items-center w-7 h-7 rounded-md border-2 border-ink text-[#FB7299] bg-white group-hover:bg-[#FB7299] group-hover:text-white transition-colors"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
}

/* ======================== 页面 ======================== */

export default function VideoPage() {
  const [data, setData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
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
        // 支持 ?c=<collectionId> 直达某个合集
        try {
          const cid = new URLSearchParams(window.location.search).get('c');
          if (cid && d.collections?.some((c) => c.id === cid)) setActiveId(cid);
        } catch {
          /* 忽略 */
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // globals.css 的 --background 仍是深色，本页需显式覆盖为纸白
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#EFF6F0';
    return () => { document.body.style.background = prev; };
  }, []);

  const collections = data?.collections ?? [];
  const active = useMemo(
    () => collections.find((c) => c.id === activeId) ?? null,
    [collections, activeId],
  );
  const episodes = active?.episodes ?? [];
  const cur = episodes[current];
  const site = data?.site;

  const videoUrl = useMemo(() => {
    if (!cur) return '';
    const base = data?.base ?? '';
    return `${base}${cur.file}`;
  }, [cur, data]);

  const syncUrl = useCallback((cid: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (cid) url.searchParams.set('c', cid);
    else url.searchParams.delete('c');
    window.history.replaceState(null, '', url.toString());
  }, []);

  const openCollection = (cid: string) => {
    setActiveId(cid);
    setCurrent(0);
    setVideoError(false);
    setCopied(false);
    syncUrl(cid);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeCollection = () => {
    setActiveId(null);
    setCurrent(0);
    setVideoError(false);
    setCopied(false);
    syncUrl(null);
  };

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

  /* ================= 顶部导航（共用） ================= */
  const Header = (
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
  );

  /* ================= 页脚（共用） ================= */
  const Footer = (
    <footer className="border-t-2 border-ink bg-white">
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-7 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-moss">© 2026 峻峻尼分享 · 交易教学</p>
        <div className="flex items-center gap-4">
          {site?.bilibili && (
            <a
              href={site.bilibili}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#FB7299] hover:underline"
            >
              <BiliGlyph className="w-4 h-4" />
              {site.bilibiliName || 'B 站主页'}
            </a>
          )}
          <Link href="/" className="text-[12px] font-bold text-pine-deep hover:underline">
            ← 返回首页
          </Link>
        </div>
      </div>
    </footer>
  );

  /* ================= 加载骨架 ================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        {Header}
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-10">
          <div className="h-8 w-52 bg-white border-2 border-ink rounded-lg animate-pulse" />
          <div className="grid md:grid-cols-2 gap-5 mt-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-[210px] bg-white border-2 border-ink rounded-[12px] animate-pulse" />
            ))}
          </div>
        </div>
        {Footer}
      </div>
    );
  }

  /* ================= 无数据 ================= */
  if (!collections.length) {
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        {Header}
        <div className="flex-1 grid place-items-center px-6 py-20 text-center">
          <div>
            <p className="text-lg font-black">暂无课程数据</p>
            <p className="text-[13px] text-moss mt-2">稍后再来看看，或去 B 站主页逛逛。</p>
            <div className="max-w-[420px] mx-auto mt-6">
              <BiliBanner site={site} />
            </div>
          </div>
        </div>
        {Footer}
      </div>
    );
  }

  /* ================= 合集总览 ================= */
  if (!active) {
    const totalEp = collections.reduce((s, c) => s + c.episodes.length, 0);
    const totalMB = collections.reduce((s, c) => s + c.episodes.reduce((a, e) => a + (e.sizeMB || 0), 0), 0);

    return (
      <div className="min-h-screen bg-paper text-ink">
        {Header}

        {/* 站点头 */}
        <section className="dot-grid border-b border-sage">
          <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-8 md:py-11">
            <p className="font-mono text-[10px] md:text-xs font-semibold tracking-[1.5px] text-moss">
              TRADING ACADEMY · 交易教学
            </p>
            <h1 className="mt-3.5 mb-3.5 text-[29px] md:text-[42px] leading-[1.2] font-black tracking-[-1px] md:tracking-[-1.5px]">
              交易教学
              <span className="shadow-[inset_0_-0.35em_#B5D4B8]"> 视频合集</span>
            </h1>
            <p className="text-[13px] md:text-[15px] text-moss leading-[1.85] max-w-[640px]">
              {site?.subtitle ?? '系统化的交易课程视频合集，在线播放、永久免费。'}
            </p>

            <div className="flex flex-wrap gap-2.5 mt-5">
              <span className="font-mono text-[11px] font-bold text-pine-deep bg-white border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
                {collections.length} 套课程
              </span>
              <span className="font-mono text-[11px] font-bold text-pine-deep bg-white border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
                {totalEp} 集
              </span>
              <span className="font-mono text-[11px] font-bold text-pine-deep bg-pine-light border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
                约 {fmtGB(totalMB)}
              </span>
              <span className="font-mono text-[11px] font-bold text-pine-deep bg-pine-light border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
                在线播放 · 永久免费
              </span>
            </div>
          </div>
        </section>

        <main className="max-w-[1120px] mx-auto px-4 md:px-6 pt-8 md:pt-10 pb-14">
          {/* B 站提示横幅 */}
          <div className="mb-8">
            <BiliBanner site={site} />
          </div>

          <SectionHead
            index="01"
            title="课程合集"
            right={<span className="text-[11px] md:text-[13px] text-moss whitespace-nowrap">共 {collections.length} 套</span>}
          />

          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            {collections.map((c) => {
              const mb = c.episodes.reduce((a, e) => a + (e.sizeMB || 0), 0);
              return (
                <button
                  key={c.id}
                  onClick={() => openCollection(c.id)}
                  className="group text-left bg-white border-2 border-ink rounded-[12px] shadow-hard-sm hover:shadow-hard transition-all duration-150 overflow-hidden flex flex-col"
                >
                  {/* 封面条 */}
                  <div className="relative aspect-[16/8] bg-pine overflow-hidden border-b-2 border-ink">
                    <div className="absolute inset-0 dot-grid opacity-60" />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="grid place-items-center w-14 h-14 rounded-full bg-white/95 border-2 border-ink shadow-hard-sm group-hover:scale-105 transition-transform">
                        <PlayGlyph className="w-6 h-6 text-pine-deep ml-0.5" />
                      </span>
                    </div>
                    <span className="absolute top-3 left-3 font-mono text-[10px] font-bold text-white bg-ink/85 rounded px-2 py-1">
                      {c.episodes.length} 集
                    </span>
                    <span className="absolute top-3 right-3 font-mono text-[10px] font-bold text-pine-deep bg-white border border-ink rounded px-2 py-1">
                      {fmtGB(mb)}
                    </span>
                  </div>

                  {/* 内容 */}
                  <div className="p-4 md:p-5 flex-1 flex flex-col">
                    <h3 className="text-[17px] md:text-[19px] font-black leading-[1.35]">{c.title}</h3>
                    <p className="font-mono text-[10px] md:text-[11px] text-moss font-medium mt-1.5 tracking-[0.3px]">
                      {c.titleEn}
                    </p>
                    <p className="text-[12.5px] text-moss leading-[1.75] mt-3 flex-1">{c.subtitle}</p>

                    {c.tags && c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3.5">
                        {c.tags.map((t) => (
                          <span
                            key={t}
                            className="font-mono text-[10px] font-bold text-pine-deep bg-pine-light border border-sage rounded px-2 py-[3px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="inline-flex items-center gap-1.5 mt-4 text-[12.5px] font-extrabold text-pine-deep">
                      进入合集
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </span>
                  </div>
                </button>
              );
            })}

            {/* 更多课程占位卡 —— 说明后续会持续扩充 */}
            <div className="text-left bg-pine-light border-2 border-dashed border-pine/40 rounded-[12px] p-4 md:p-5 flex flex-col justify-center min-h-[180px]">
              <span className="font-mono text-[10px] font-bold text-pine-deep bg-white border border-sage rounded px-2 py-1 self-start">
                COMING SOON
              </span>
              <p className="text-[15px] font-black mt-3 leading-snug">更多课程陆续上线</p>
              <p className="text-[12.5px] text-moss leading-[1.75] mt-2">
                后续会继续整理上传更多交易教学合集；想先看更多，欢迎移步 B 站主页。
              </p>
            </div>
          </div>
        </main>

        {Footer}
      </div>
    );
  }

  /* ================= 合集详情 ================= */
  const totalMB = episodes.reduce((s, e) => s + (e.sizeMB || 0), 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {Header}

      {/* 合集头 */}
      <section className="dot-grid border-b border-sage">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-7 md:py-10">
          <button
            onClick={closeCollection}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-pine-deep hover:underline mb-5"
          >
            ← 返回全部合集
          </button>

          <p className="font-mono text-[10px] md:text-xs font-semibold tracking-[1.5px] text-moss">
            交易教学 · PRICE ACTION
          </p>
          <h1 className="mt-3 mb-3 text-[26px] md:text-[38px] leading-[1.22] font-black tracking-[-0.8px] md:tracking-[-1.3px]">
            {active.title}
          </h1>
          <p className="text-[13px] md:text-[15px] text-moss leading-[1.85] max-w-[680px]">{active.subtitle}</p>

          <div className="flex flex-wrap gap-2.5 mt-5">
            <span className="font-mono text-[11px] font-bold text-pine-deep bg-white border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
              {episodes.length} 集
            </span>
            <span className="font-mono text-[11px] font-bold text-pine-deep bg-white border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
              约 {fmtGB(totalMB)}
            </span>
            <span className="font-mono text-[11px] font-bold text-pine-deep bg-pine-light border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
              在线播放 · 永久免费
            </span>
          </div>
        </div>
      </section>

      {/* 播放区 */}
      <main className="max-w-[1120px] mx-auto px-4 md:px-6 pt-7 md:pt-9 pb-14">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-7 items-start">

          {/* 播放器 */}
          <div ref={playerRef} className="scroll-mt-[92px]">
            <div className="bg-white border-2 border-ink rounded-[12px] shadow-hard overflow-hidden">
              <div className="relative aspect-video bg-ink">
                {videoError ? (
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
                        {fmtGB(cur.sizeMB || 0).includes('GB') ? `${cur.sizeMB} MB` : `${cur.sizeMB} MB`}
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
                  <p className="text-[13px] text-moss">暂无剧集数据</p>
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
              index="02"
              title="全部剧集"
              right={
                <span className="text-[11px] md:text-[13px] text-moss whitespace-nowrap">
                  共 {episodes.length} 集
                </span>
              }
            />

            <ol className="space-y-2 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">
              {episodes.map((e, i) => {
                const isActive = i === current;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => go(i)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[10px] border-2 transition-all duration-150 ${
                        isActive
                          ? 'bg-pine text-white border-ink shadow-hard-sm'
                          : 'bg-white border-ink shadow-hard-xs hover:bg-pine-light'
                      }`}
                    >
                      <span
                        className={`grid place-items-center w-8 h-8 rounded-md border-2 border-ink shrink-0 font-mono text-[12px] font-bold ${
                          isActive ? 'bg-white text-pine-deep' : 'bg-paper text-moss'
                        }`}
                      >
                        {isActive ? <PlayGlyph className="w-3.5 h-3.5" /> : String(e.ep).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-extrabold leading-[1.45] line-clamp-2">
                          {e.title}
                        </span>
                        <span
                          className={`block text-[10px] font-medium mt-[3px] truncate ${
                            isActive ? 'text-pine-light/85' : 'text-moss'
                          }`}
                        >
                          {e.titleEn}
                        </span>
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold shrink-0 ${
                          isActive ? 'text-pine-light/80' : 'text-moss'
                        }`}
                      >
                        {e.sizeMB}M
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* 详情页里的 B 站提示 */}
            <div className="mt-5">
              <BiliBanner site={site} compact />
            </div>
          </aside>
        </div>
      </main>

      {Footer}
    </div>
  );
}
