"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, Clock, Tag } from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  desc: string;
  quarkLink?: string;
  baiduLink?: string;
  tags?: string[];
  date?: string;
  time?: string;
  netdisk?: {
    showQuark?: boolean;
    showBaidu?: boolean;
  };
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
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

  // 监听滚动事件，实现导航栏显示/隐藏
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // 向下滚动且超过100px，隐藏导航栏
        setNavbarVisible(false);
      } else {
        // 向上滚动，显示导航栏
        setNavbarVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // 处理按钮点击
  const handleButtonClick = (id: string) => {
    // 可以在这里添加其他按钮点击逻辑
  };

  // 过滤资源
  const filteredResources = resources.filter(item => {
    if (!searchTerm) return true;
    return (
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
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
    <div className="min-h-screen bg-white text-gray-800 relative font-sans">
      {/* 导航栏 */}
      <nav className={`sticky top-0 left-0 w-full p-3 md:p-4 bg-white border-b border-gray-200 z-50 shadow-sm mb-4 transition-transform duration-300 ${navbarVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-lg font-bold text-red-600 flex items-center gap-1.5">
                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs">峻</span>
                峻峻尼分享
                <span className="text-xs text-gray-500 font-normal ml-1.5">ARCHIVE</span>
              </Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="搜索关键词、链接或ID..."
                className="w-full px-3 py-1.5 pl-8 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
            </div>
            <button className="px-3 py-1.5 rounded-md border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap shrink-0 w-full sm:w-auto text-sm">
              筛选
            </button>
            <a href="/1.html" className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 w-full sm:w-auto text-sm">
              跳转游戏
            </a>
            <a href="/website/index.html" className="px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors whitespace-nowrap shrink-0 w-full sm:w-auto text-sm">
              godot2d游戏开发自学中
            </a>
          </div>
          <div className="flex items-center justify-start gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">排序方式：</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="px-2.5 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-red-600 text-white"
                >
                  上传顺序 {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 pt-32 pb-8">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">资源列表</h2>
            <span className="text-sm text-gray-500">共 {filteredResources.length} 个资源</span>
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
                    {resource.quarkLink && (resource.netdisk?.showQuark !== false) && (
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
                    {resource.baiduLink && (resource.netdisk?.showBaidu !== false) && (
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
