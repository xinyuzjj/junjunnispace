"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Github, Send, ExternalLink, Calendar, Clock, Tag, Globe } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  desc: string;
  quarkLink?: string;
  baiduLink?: string;
  tags?: string[];
  date?: string;
  time?: string;
}

export default function HomePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const resourcesPerPage = 20;

  useEffect(() => {
    // 从public目录获取资源数据
    fetch('/resources.json')
      .then(res => res.json())
      .then(data => {
        setResources(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching resources:', error);
        setLoading(false);
      });
  }, []);

  // 处理按钮点击
  const handleButtonClick = (id: string) => {
    // 可以在这里添加其他按钮点击逻辑
  };

  // 过滤资源
  const filteredResources = resources.filter(resource => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      resource.title?.toLowerCase().includes(searchLower) ||
      resource.desc?.toLowerCase().includes(searchLower) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }).sort((a, b) => {
    // 按上传顺序排序（假设ID越大越新）
    return sortOrder === 'asc' ? parseInt(a.id) - parseInt(b.id) : parseInt(b.id) - parseInt(a.id);
  });

  // 计算分页
  const indexOfLastResource = currentPage * resourcesPerPage;
  const indexOfFirstResource = indexOfLastResource - resourcesPerPage;
  const currentResources = filteredResources.slice(indexOfFirstResource, indexOfLastResource);
  const totalPages = Math.ceil(filteredResources.length / resourcesPerPage);

  // 分页控制
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      {/* 顶部区域 */}
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <Link href="/" className="text-xl font-bold text-red-600 flex items-center gap-2">
              <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">峻</span>
              峻峻尼分享
              <span className="text-xs text-gray-400 font-normal ml-2">ARCHIVE</span>
            </Link>
            
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
                <button className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 whitespace-nowrap text-sm font-medium">
                  筛选
                </button>
                <a href="/website/index.html" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-200 whitespace-nowrap text-sm font-medium shadow-md hover:shadow-lg">
                  godot2d自学
                </a>
                <a href="/share" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 whitespace-nowrap text-sm font-medium shadow-md hover:shadow-lg">
                  资源分享
                </a>
                <a href="https://xyjunjunni.space/jiaoyi.html" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 whitespace-nowrap text-sm font-medium shadow-md hover:shadow-lg">
                  📈 交易回放
                </a>
              </div>
            </div>
            
            <div className="flex items-center justify-start gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">排序：</span>
                <button
                  onClick={() => {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
                >
                  上传顺序 {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">最新资源</h2>
            <span className="text-sm text-gray-500">{filteredResources.length} 条记录</span>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4].map(i => (
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
              {currentResources.map(resource => (
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
                        onClick={() => handleButtonClick(resource.id)}
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
                        onClick={() => handleButtonClick(resource.id)}
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

        {/* 分页控件 */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-3 py-1 rounded border ${currentPage === pageNumber ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="border-t border-gray-200 py-8 px-6 md:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            © 2026 峻峻尼分享 | 优质资源分享平台
          </p>
        </div>
      </footer>
    </div>
  );
}
