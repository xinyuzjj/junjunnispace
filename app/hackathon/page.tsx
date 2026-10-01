"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ======================== 类型 ======================== */

interface HackLink {
  label: string;
  url: string;
  primary?: boolean;
}

interface HackProject {
  name: string;
  tagline: string;
  desc: string;
  tech: string[];
  highlights: string[];
  links: HackLink[];
}

interface HackEvent {
  id: string;
  event: string;
  track: string;
  period: string;
  deadline: string;
  status: string;
  accent: string;
  project: HackProject;
}

interface HackData {
  intro: { title: string; subtitle: string; builder: { github: string; note: string } };
  stats: { label: string; value: string }[];
  events: HackEvent[];
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

function CheckGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UpRightGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ======================== 页面 ======================== */

export default function HackathonPage() {
  const [data, setData] = useState<HackData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/hackathons.json')
      .then((r) => r.json())
      .then((d: HackData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // globals.css 的 --background 仍是深色，本页需显式覆盖为纸白
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#EFF6F0';
    return () => { document.body.style.background = prev; };
  }, []);

  const events = data?.events ?? [];

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
              <Link
                href="/video"
                className="px-[7px] md:px-3 py-[7px] md:py-2 rounded-lg bg-pine-light text-pine-deep border-2 border-ink shadow-hard-xs whitespace-nowrap hover:bg-white transition-colors"
              >
                交易教学 ↗
              </Link>
              <span className="px-[7px] md:px-3 py-[7px] md:py-2 rounded-lg bg-pine text-white border-2 border-ink shadow-hard-xs whitespace-nowrap">
                黑客松
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

      {/* ========== 站点头 ========== */}
      <section className="dot-grid border-b border-sage">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-8 md:py-11">
          <p className="font-mono text-[10px] md:text-xs font-semibold tracking-[1.5px] text-moss">
            HACKATHON LOG · AI 黑客松
          </p>
          <h1 className="mt-3.5 mb-3.5 text-[29px] md:text-[42px] leading-[1.2] font-black tracking-[-1px] md:tracking-[-1.5px]">
            AI 黑客松
            <span className="shadow-[inset_0_-0.35em_#B5D4B8]"> 参加历史</span>
          </h1>
          <p className="text-[13px] md:text-[15px] text-moss leading-[1.85] max-w-[660px]">
            {data?.intro.subtitle ?? '参加过的 AI 黑客松与提交项目。每一个都是真协议、真部署、真上线，不是 PPT。'}
          </p>

          <div className="flex flex-wrap gap-2.5 mt-5">
            {loading ? (
              <span className="font-mono text-[11px] font-bold text-pine-deep bg-white border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5">
                —
              </span>
            ) : (
              (data?.stats ?? []).map((s) => (
                <span
                  key={s.label}
                  className="font-mono text-[11px] font-bold text-pine-deep bg-white border-2 border-ink rounded-lg shadow-hard-xs px-3 py-1.5"
                >
                  {s.label} <span className="text-pine">{s.value}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ========== 赛事列表 ========== */}
      <main className="max-w-[1120px] mx-auto px-4 md:px-6 pt-8 md:pt-10 pb-14">
        <SectionHead
          index="01"
          title="参赛记录"
          right={
            <span className="text-[11px] md:text-[13px] text-moss whitespace-nowrap">
              共 {loading ? '—' : events.length} 场
            </span>
          }
        />

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-[320px] bg-white border-2 border-ink rounded-[12px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6 md:space-y-7">
            {events.map((ev) => (
              <article
                key={ev.id}
                className="bg-white border-2 border-ink rounded-[12px] shadow-hard overflow-hidden"
              >
                {/* 赛事头 */}
                <div className="border-b-2 border-ink px-4 md:px-6 py-4 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 bg-paper">
                  <span
                    className="w-1.5 h-10 rounded-sm shrink-0 border border-ink"
                    style={{ background: ev.accent }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] md:text-[21px] font-black leading-[1.3]">{ev.event}</h2>
                    <p className="font-mono text-[10px] md:text-[11px] text-moss font-medium mt-1 tracking-[0.2px]">
                      {ev.track}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] font-bold text-pine-deep bg-white border border-sage rounded px-2 py-1 whitespace-nowrap">
                      {ev.period} · 截止 {ev.deadline}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-white bg-pine border border-ink rounded px-2 py-1 whitespace-nowrap">
                      {ev.status}
                    </span>
                  </div>
                </div>

                {/* 项目详情 */}
                <div className="px-4 md:px-6 py-5 md:py-6">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-[23px] md:text-[30px] font-black tracking-[-0.5px] leading-[1.15]">
                      {ev.project.name}
                    </h3>
                    <span className="font-mono text-[10px] md:text-[11px] font-bold text-moss">
                      SUBMITTED PROJECT
                    </span>
                  </div>

                  <p className="mt-2.5 text-[13.5px] md:text-[15px] font-black text-pine-deep leading-[1.6]">
                    {ev.project.tagline}
                  </p>

                  <p className="mt-3 text-[12.5px] md:text-[13.5px] text-moss leading-[1.9] max-w-[860px]">
                    {ev.project.desc}
                  </p>

                  {/* 技术标签 */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {ev.project.tech.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[10px] font-bold text-pine-deep bg-pine-light border border-sage rounded px-2 py-[3px]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* 亮点 */}
                  <ul className="mt-5 space-y-2.5">
                    {ev.project.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className="grid place-items-center w-[18px] h-[18px] rounded border-2 border-ink shrink-0 mt-[2px] text-white"
                          style={{ background: ev.accent }}
                          aria-hidden="true"
                        >
                          <CheckGlyph className="w-[11px] h-[11px]" />
                        </span>
                        <span className="text-[12.5px] md:text-[13px] leading-[1.8] text-ink/85">{h}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 链接 */}
                  <div className="flex flex-wrap gap-2.5 mt-5">
                    {ev.project.links.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-2 border-ink shadow-hard-xs text-[12px] font-extrabold transition-colors ${
                          l.primary
                            ? 'bg-pine text-white hover:bg-pine-deep'
                            : 'bg-white hover:bg-pine-light'
                        }`}
                      >
                        {l.label}
                        <UpRightGlyph className="w-3.5 h-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* 底部 CTA */}
        <div className="mt-8 md:mt-10 bg-pine-light border-2 border-dashed border-pine/40 rounded-[12px] px-4 md:px-6 py-5 md:py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[15px] md:text-[17px] font-black leading-snug">更多项目在 GitHub</p>
            <p className="text-[12.5px] text-moss leading-[1.8] mt-1.5">
              {data?.intro.builder.note ?? '全部代码开源在 GitHub'}。后续参赛记录会继续追加到这里。
            </p>
          </div>
          <a
            href={data?.intro.builder.github ?? 'https://github.com/xinyuzjj'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border-2 border-ink shadow-hard-xs text-[12.5px] font-extrabold hover:bg-pine-light transition-colors"
          >
            github.com/xinyuzjj
            <UpRightGlyph className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>

      {/* ========== 页脚 ========== */}
      <footer className="border-t-2 border-ink bg-white">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-7 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-moss">© 2026 峻峻尼分享 · AI 黑客松</p>
          <Link href="/" className="text-[12px] font-bold text-pine-deep hover:underline">
            ← 返回首页
          </Link>
        </div>
      </footer>
    </div>
  );
}
