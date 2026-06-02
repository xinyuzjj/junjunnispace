"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Resource {
  id: string;
  category: string;
  title: string;
  desc: string;
  quarkLink?: string;
  baiduLink?: string;
  tags?: string[];
}

interface ShareData {
  categories: Category[];
  resources: Resource[];
}

export default function SharePage() {
  const [data, setData] = useState<ShareData>({ categories: [], resources: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    fetch('/share-resources.json')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching resources:', error);
        setLoading(false);
      });
  }, []);

  const filteredResources = data.resources.filter(resource => {
    const matchesCategory = activeCategory === 'all' || resource.category === activeCategory;
    if (!searchTerm) return matchesCategory;
    const searchLower = searchTerm.toLowerCase();
    return matchesCategory && (
      resource.title?.toLowerCase().includes(searchLower) ||
      resource.desc?.toLowerCase().includes(searchLower) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  const getCategoryColor = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' }
    };
    return colors[color] || colors.blue;
  };

  const getActiveCategoryName = () => {
    if (activeCategory === 'all') return '全部资源';
    const category = data.categories.find(c => c.id === activeCategory);
    return category?.name || '全部资源';
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
                  placeholder="搜索资源..."
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm bg-gray-50 hover:bg-white transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/" className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-200 whitespace-nowrap text-sm font-medium shadow-md hover:shadow-lg">
                  返回首页
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeCategory === 'all' 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              📁 全部
            </button>
            {data.categories.map(category => {
              const colors = getCategoryColor(category.color);
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeCategory === category.id 
                      ? `${colors.bg} ${colors.text} border-2 ${colors.border} shadow-md` 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {category.icon} {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{getActiveCategoryName()}</h2>
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
              {filteredResources.map(resource => {
                const category = data.categories.find(c => c.id === resource.category);
                const colors = category ? getCategoryColor(category.color) : getCategoryColor('blue');
                
                return (
                  <div key={resource.id} className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-4">
                      <span className={`${colors.bg} ${colors.text} px-2 py-1 rounded-full text-xs font-medium mt-0.5`}>
                        {category?.icon} {category?.name}
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
                        <p className="text-base text-gray-700">
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
                );
              })}
            </div>
          )}
        </section>
      </main>

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
