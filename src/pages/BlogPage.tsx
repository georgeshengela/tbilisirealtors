import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Clock, ArrowRight, Tag } from 'lucide-react';
import { blogPosts } from '../data/mockData';

const categories = ['ყველა', 'ბაზრის ანალიზი', 'გზამკვლევი', 'ინვესტიცია', 'ცხოვრების სტილი', 'დიზაინი'];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('ყველა');
  const [search, setSearch] = useState('');

  const filtered = blogPosts.filter(post => {
    const matchCat = activeCategory === 'ყველა' || post.category === activeCategory;
    const matchSearch = !search || post.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured = blogPosts.find(p => p.isFeatured) || blogPosts[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-14 lg:pt-[102px]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 py-20">
        <div className="container-xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">ბლოგი</span>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
              სიახლეები & გზამკვლევი
            </h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              ბაზრის ანალიზი, ექსპერტების რჩევები და სასარგებლო სახელმძღვანელო
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container-xl py-12">
        {/* Featured Article */}
        <div className="mb-16">
          <Link to={`/blog/${featured.id}`} className="group block">
            <div className="grid lg:grid-cols-2 gap-0 bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-slate-700 hover:shadow-2xl transition-shadow">
              <div className="relative aspect-video lg:aspect-auto overflow-hidden">
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    გამორჩეული
                  </span>
                </div>
              </div>
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <span className="text-blue-600 text-sm font-semibold mb-3 flex items-center gap-1">
                  <Tag size={14} />
                  {featured.category}
                </span>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors">
                  {featured.title}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  {featured.excerpt}
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={featured.author.photo}
                    alt={featured.author.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white text-sm">{featured.author.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={11} />{featured.readTime} წთ.</span>
                      <span>{featured.publishDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-blue-600 font-semibold">
                  სრულად წაკითხვა
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-48">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="სტატიის ძებნა..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-blue-500 focus:outline-none text-slate-800 dark:text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to={`/blog/${post.id}`} className="group block bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <img src={post.author.photo} alt={post.author.name} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{post.author.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock size={12} />
                      <span>{post.readTime} წთ.</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
