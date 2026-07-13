import { useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import AgentsPage from './pages/AgentsPage';
import AgentProfilePage from './pages/AgentProfilePage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPage from './pages/AdminPage';
import AdminAddListingPage from './pages/AdminAddListingPage';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAdminAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

function AppContent({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAdminPage = location.pathname.startsWith('/admin');

  if (isAdminPage) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/listings/new" element={<ProtectedAdminRoute><AdminAddListingPage /></ProtectedAdminRoute>} />
        <Route path="/admin/listings/:id/edit" element={<ProtectedAdminRoute><AdminAddListingPage /></ProtectedAdminRoute>} />
        <Route path="/admin/*" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
      </Routes>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <ScrollToTop />
        {!isAuthPage && <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/listings" element={<ListingsPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/agent/:id" element={<AgentProfilePage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:id" element={<BlogDetailPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>

        {!isAuthPage && !isDashboard && <Footer />}
      </div>
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <AppContent darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
