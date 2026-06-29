"use client";
import { useEffect, useState } from 'react';
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

export default function HomePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    Promise.all([
      fetch('/resources.json').then(res => res.json()),
      fetch('/github-projects.json').then(res => res.json()),
    ])
      .then(([resourcesData, projectsData]) => {
        setResources(resourcesData);
        setProjects(projectsData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
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
    return colors[lang] || '#6b7280';
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 relative font-sans">
      {/* ========== 顶部 Hero: GitHub 开源项目展示 ========== */}
      <section className="relative overflow-hidden">
        {/* 渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(139,92,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59,130,246,0.3) 0%, transparent 50%)',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
          {/* 标题区 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <span className="text-sm font-medium text-purple-300 tracking-wide uppercase">Open Source</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
              我的 GitHub 开源项目
            </h1>
            <p className="text-purple-200/80 text-base max-w-xl mx-auto">
              探索 AI Agent、游戏开发、内容分发等领域的开源作品
            </p>
          </div>

          {/* 项目卡片网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map((project) => (
              <a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative p-5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20"
              >
                {/* 项目图标 */}
                <div className="w-14 h-14 mb-4 rounded-xl overflow-hidden shadow-lg shadow-black/30 group-hover:shadow-purple-500/30 transition-shadow duration-300">
                  <img
                    src={project.icon}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* 项目名称 */}
                <h3 className="font-bold text-white text-sm mb-2 group-hover:text-purple-300 transition-colors">
                  {project.name}
                </h3>

                {/* 描述 */}
                <p className="text-xs text-gray-300/80 mb-4 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>

                {/* 底部信息 */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: getLangColor(project.language) }}
                    />
                    <span className="text-xs text-gray-400">{project.language}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 .25a.75.75 0 01.673.418l3.058 6.197 6.839.994a.75.75 0 01.415 1.279l-4.948 4.823 1.168 6.811a.75.75 0 01-1.088.791L12 18.347l-6.117 3.216a.75.75 0 01-1.088-.79l1.168-6.812-4.948-4.823a.75.75 0 01.416-1.28l6.838-.993L11.327.668A.75.75 0 0112 .25z"/>
                    </svg>
                    <span>{project.stars}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* 底部链接 */}
          <div className="text-center mt-8">
            <a
              href="https://github.com/xinyuzjj?tab=repositories"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/10 text-sm text-purple-200 hover:bg-white/20 hover:border-purple-400/40 transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              查看全部项目 →
            </a>
          </div>
        </div>
      </section>

      {/* ========== 顶部导航 ========== */}
      <header className="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xl font-bold text-red-600 flex items-center gap-2">
                <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">峻</span>
                峻峻尼分享
                <span className="text-xs text-gray-400 font-normal ml-2">ARCHIVE</span>
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-0 md:w-80">
                <input
                  type="text"
                  placeholder="搜索关键词、链接或ID..."
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50 hover:bg-white transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all duration-200 whitespace-nowrap text-sm font-medium">
                  筛选
                </button>
                <Link href="/share" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 whitespace-nowrap text-sm font-medium shadow-md hover:shadow-lg">
                  资源分享
                </Link>
                <span className="px-4 py-2 rounded-lg bg-green-500 text-white whitespace-nowrap text-sm font-medium shadow-md flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 01.178-.554C23.028 18.48 24 16.82 24 14.98c0-3.21-2.931-5.952-7.062-6.122zm-2.18 2.769c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/></svg>
                  <span>公众号：峻峻尼</span>
                </span>
                <a href="https://github.com/xinyuzjj" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition-all duration-200 whitespace-nowrap text-sm font-medium shadow-md hover:shadow-lg flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-start gap-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">排序方式：</span>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1 rounded-md text-xs bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                上传顺序 {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========== Mineradio 下载区 ========== */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
        <div className="rounded-2xl overflow-hidden border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
            {/* 左侧图标 */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>

            {/* 中间信息 */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Mineradio</h2>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-xs font-bold">v1.1.1</span>
              </div>
              <p className="text-gray-600 text-sm mb-1">跨平台桌面音乐播放器，界面简洁优雅</p>
              <p className="text-xs text-gray-400">文件大小：110 MB | 来源：GitHub Releases</p>
            </div>

            {/* 右侧下载按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <a
                href="https://pan.quark.cn/s/22a3fbeea5c0"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold text-sm hover:from-red-600 hover:to-rose-700 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                夸克网盘下载
              </a>
              <a
                href="https://pan.baidu.com/s/1Ubr8_YfLS9uG5FlIg4W-ng?pwd=w8c9"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-sky-600 text-white font-semibold text-sm hover:from-blue-600 hover:to-sky-700 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                百度网盘下载
                <span className="text-[10px] opacity-75 ml-1">pwd:hexf</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">最新资源</h2>
            <span className="text-sm text-gray-500">共 {filteredResources.length} 条记录</span>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={`skeleton-${i}`} className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredResources.map(resource => (
                <div key={resource.id} className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium mt-0.5">
                      峻
                    </span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 hover:text-red-600 transition-colors mb-2">
                        {resource.title}
                      </h3>
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {resource.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-base text-gray-700 mb-4">
                        {resource.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4 border-t border-gray-100 pt-4 justify-end">
                    {resource.quarkLink && (
                      <a 
                        href={resource.quarkLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                      >
                        🔴 夸克
                      </a>
                    )}
                    {resource.baiduLink && (
                      <a 
                        href={resource.baiduLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        🔵 百度
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-gray-200 py-8 px-6 md:px-8 bg-white mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            © 2026 峻峻尼分享 | 优质资源分享平台
          </p>
        </div>
      </footer>
    </div>
  );
}
