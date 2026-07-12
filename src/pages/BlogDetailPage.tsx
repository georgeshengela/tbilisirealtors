import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Tag, ArrowLeft, Share2, ArrowRight, Link2, MessageSquare } from 'lucide-react';
import { blogPosts } from '../data/mockData';

export default function BlogDetailPage() {
  const { id } = useParams();
  const post = blogPosts.find(p => p.id === id) || blogPosts[0];
  const related = blogPosts.filter(p => p.id !== post.id && p.category === post.category).slice(0, 3);

  const sampleContent = `
საქართველოს უძრავი განცხადების ბაზარი 2026 წელს მნიშვნელოვან ტრანსფორმაციას განიცდის. 
ბოლო ანალიზების მიხედვით, თბილისში ბინათა ფასები საშუალოდ 12-15%-ით გაიზარდა 
წინა წელთან შედარებით.

**ძირითადი ტენდენციები:**

1. **პრემიუმ სეგმენტის ზრდა** — ძვირადღირებული ბინებისა და ვილების მოთხოვნა 
ეზრდება, განსაკუთრებით ვაკე-საბურთალოს ზონაში.

2. **ახალი განაშენიანება** — 2026-2027 წლებში 45+ ახალი პროექტის დასრულება 
იგეგმება, რაც ბაზარს ახალ პირობებს შეუქმნის.

3. **ბათუმი vs. თბილისი** — ბათუმი კვლავ ინვესტიციებისათვის ყველაზე მიმზიდველ 
ლოკაციად რჩება, 18-22%-ანი წლიური შემოსავლით.

4. **ინფრასტრუქტურა** — ახალი სატრანსპორტო კვანძებისა და სხვა ინფრასტრუქტურის 
განვითარება ზეგავლენას ახდენს განცხადების ფასებზე.

**ექსპერტების მოსაზრებები:**

ჩვენი გუნდი მიიჩნევს, რომ 2026 წელი ყიდვისა და ინვესტიციისათვის 
ხელსაყრელი პერიოდია. კომუნიკაციის გაუმჯობესება, ინფრასტრუქტურის განვითარება 
და ტურიზმის ზრდა ხელს უწყობს ბაზრის სტაბილიზაციას.

**პრაქტიკული რეკომენდაციები:**

- ადრე დააბანდეთ — ახალ კვარტლებში ფასები ჯერ ისევ ხელმისაწვდომია
- ადგილმდებარეობაზე ყურადღება — ტრანსპორტი, სკოლები, სერვისები
- გასწავლეთ კონტრაქტი — ყოველთვის გამოიყენეთ კვალიფიციური იურისტი
- ბაზრის ანალიზი — გაეცანით ბოლო 6 თვის გარიგებებს
  `.trim();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20">
      {/* Hero */}
      <div className="relative h-80 lg:h-96">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
          <div className="container-xl max-w-4xl">
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4 inline-block">
              {post.category}
            </span>
            <h1 className="text-3xl lg:text-5xl font-bold text-white">{post.title}</h1>
          </div>
        </div>
      </div>

      <div className="container-xl py-10">
        {/* Back */}
        <Link
          to="/blog"
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-8 font-medium"
        >
          <ArrowLeft size={18} />
          ბლოგზე დაბრუნება
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-6 py-5 border-y border-slate-200 dark:border-slate-700 mb-10">
          <div className="flex items-center gap-3">
            <img src={post.author.photo} alt={post.author.name} className="w-11 h-11 rounded-full object-cover" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">{post.author.name}</p>
              <p className="text-xs text-slate-500">TbilisiRealtors.ge</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock size={15} />
            {post.readTime} წუთის კითხვა
          </div>
          <div className="text-sm text-slate-500">{post.publishDate}</div>

          {/* Share */}
          <div className="ml-auto flex gap-2">
            <span className="text-sm text-slate-500 self-center">გაზიარება:</span>
            {[
              { Icon: Share2, color: 'hover:text-blue-600' },
              { Icon: MessageSquare, color: 'hover:text-sky-500' },
              { Icon: Link2, color: 'hover:text-blue-700' },
            ].map(({ Icon, color }) => (
              <button key={color} className={`w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 ${color} hover:border-current transition-colors`}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {post.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm px-3 py-1.5 rounded-full">
              <Tag size={12} />
              {tag}
            </span>
          ))}
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-lg dark:prose-invert max-w-none"
        >
          <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed mb-8 font-medium border-l-4 border-blue-500 pl-6">
            {post.excerpt}
          </p>

          <div className="text-slate-700 dark:text-slate-300 leading-relaxed space-y-6 text-lg">
            {sampleContent.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </motion.div>

        {/* Author Card */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex gap-5">
          <img src={post.author.photo} alt={post.author.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">ავტორი</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{post.author.name}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{post.author.bio}</p>
            <Link to={`/agent/${post.author.id}`} className="inline-flex items-center gap-1.5 text-blue-600 text-sm font-medium mt-3 hover:gap-2 transition-all">
              პროფილი <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">მსგავსი სტატიები</h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {(related.length > 0 ? related : blogPosts.slice(0, 3)).map(rp => (
                <Link
                  key={rp.id}
                  to={`/blog/${rp.id}`}
                  className="group block bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow"
                >
                  <img src={rp.image} alt={rp.title} className="w-full aspect-video object-cover" />
                  <div className="p-4">
                    <span className="text-blue-600 text-xs font-semibold">{rp.category}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white mt-1 line-clamp-2 text-sm group-hover:text-blue-600 transition-colors">
                      {rp.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                      <Clock size={11} />
                      {rp.readTime} წთ.
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
