import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Heart, MessageSquare, Settings, TrendingUp, Eye,
  Building2, Star, ArrowRight, User, ChevronRight, BarChart3,
  LogOut, Plus, Clock
} from 'lucide-react';
import { properties, agents } from '../data/mockData';
import PropertyCard from '../components/PropertyCard';

const menuItems = [
  { icon: Home, label: 'მიმოხილვა', id: 'overview' },
  { icon: Heart, label: 'ფავორიტები', id: 'favorites' },
  { icon: Building2, label: 'ჩემი განცხადებები', id: 'listings' },
  { icon: MessageSquare, label: 'შეტყობინებები', id: 'messages', badge: 3 },
  { icon: BarChart3, label: 'სტატისტიკა', id: 'stats' },
  { icon: Settings, label: 'პარამეტრები', id: 'settings' },
];

export default function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const agent = agents[0];
  const savedProps = properties.filter(p => p.isFeatured).slice(0, 4);

  const stats = [
    { label: 'შენახული განცხადება', value: '12', change: '+3', icon: Heart, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
    { label: 'ბოლო ნახვები', value: '148', change: '+28', icon: Eye, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'გამოგზავნილი შეთ.', value: '7', change: '+2', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'განხ. განცხადება', value: '3', change: '+1', icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  ];

  const activities = [
    { text: 'ვაკის პენტჰაუსი შეინახეთ ფავორიტებში', time: '5 წუთი წინ', icon: Heart },
    { text: 'კონტაქტი დაამყარეთ გიორგი ბერიძესთან', time: '1 საათი წინ', icon: MessageSquare },
    { text: 'ბათუმის ბინა ნახეთ', time: '3 საათი წინ', icon: Eye },
    { text: 'ფილტრი შეინახეთ: ვაკე, 3 საძინ.', time: '1 დღე წინ', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 flex">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-20 bottom-0 z-20 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* User */}
        <div className={`p-5 border-b border-slate-100 dark:border-slate-700 ${sidebarOpen ? '' : 'flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <img src={agent.photo} alt={agent.name} className="w-12 h-12 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate">{agent.name}</p>
                <p className="text-xs text-slate-500 truncate">{agent.email}</p>
              </div>
            </div>
          ) : (
            <img src={agent.photo} alt={agent.name} className="w-10 h-10 rounded-xl object-cover" />
          )}
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                activeMenu === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              } ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-700">
          <button className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ${!sidebarOpen ? 'justify-center' : ''}`}>
            <LogOut size={20} />
            {sidebarOpen && 'გასვლა'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'} p-8`}>
        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mb-6 w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-blue-300 transition-colors"
        >
          <ChevronRight size={16} className={`transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>

        {activeMenu === 'overview' && (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  გამარჯობა, {agent.name.split(' ')[0]}! 👋
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">თქვენი საქმიანობის მიმოხილვა</p>
              </div>
              <Link
                to="/listings"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                <Plus size={18} />
                ახალი ძებნა
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700"
                >
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                    <stat.icon size={22} />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                  <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center gap-1">
                    <TrendingUp size={12} />
                    {stat.change} ბოლო კვირა
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Saved Properties */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">შენახული განცხადება</h2>
                <Link to="/favorites" className="text-blue-600 text-sm font-semibold flex items-center gap-1">
                  ყველა <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {savedProps.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
            </div>

            {/* Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                  <Clock size={18} className="text-blue-500" />
                  ბოლო საქმიანობა
                </h3>
                <div className="space-y-4">
                  {activities.map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <a.icon size={15} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{a.text}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profile quick edit */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                  <User size={18} className="text-blue-500" />
                  პროფილი
                </h3>
                <div className="flex items-center gap-4 mb-5">
                  <img src={agent.photo} alt={agent.name} className="w-16 h-16 rounded-2xl object-cover" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{agent.name}</p>
                    <p className="text-sm text-slate-500">{agent.email}</p>
                    <p className="text-sm text-slate-500">{agent.phone}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">პროფილის სისრულე</span>
                    <span className="font-semibold text-slate-800 dark:text-white">85%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full w-4/5" />
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 text-sm font-medium text-slate-700 dark:text-white hover:border-blue-300 transition-colors mt-2">
                    <Settings size={16} />
                    პარამეტრები
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'messages' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">შეტყობინებები</h2>
            <div className="space-y-3">
              {[
                { from: agents[1].name, photo: agents[1].photo, text: 'გამარჯობა! ბინის ნახვა შეგიძლიათ ხვალ?', time: '10 წთ.', unread: true },
                { from: agents[2].name, photo: agents[2].photo, text: 'ფასი კიდევ შეიძლება გადახედოს.', time: '2 სთ.', unread: true },
                { from: agents[3].name, photo: agents[3].photo, text: 'გმადლობთ კონტაქტისათვის.', time: '1 დღე', unread: false },
              ].map((msg, i) => (
                <div key={i} className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all ${msg.unread ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'} hover:shadow-md`}>
                  <img src={msg.photo} alt={msg.from} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className={`font-semibold ${msg.unread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{msg.from}</p>
                      <span className="text-xs text-slate-400">{msg.time}</span>
                    </div>
                    <p className={`text-sm mt-1 ${msg.unread ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>{msg.text}</p>
                  </div>
                  {msg.unread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMenu !== 'overview' && activeMenu !== 'messages' && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {menuItems.find(m => m.id === activeMenu)?.label}
            </h2>
            <p className="text-slate-500">ეს განყოფილება მალე დაემატება</p>
          </div>
        )}
      </main>
    </div>
  );
}
