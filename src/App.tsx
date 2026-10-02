import { useState, useEffect, type ReactNode } from 'react';

import { BrowserRouter, Routes, Route, useLocation, Navigate, useSearchParams } from 'react-router-dom';
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
import AccountLayout from './pages/account/AccountLayout';
import AccountOverviewPage from './pages/account/AccountOverviewPage';
import AccountListingsPage from './pages/account/AccountListingsPage';
import AccountFavoritesPage from './pages/account/AccountFavoritesPage';
import AccountSearchesPage from './pages/account/AccountSearchesPage';
import AccountSettingsPage from './pages/account/AccountSettingsPage';
import SubmitListingPage from './pages/SubmitListingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ProjectsPage from './pages/ProjectsPage';
import ServicesPage from './pages/ServicesPage';
import InternationalPage from './pages/InternationalPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import UpdatesPage from './pages/UpdatesPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPage from './pages/AdminPage';
import AdminAddListingPage from './pages/AdminAddListingPage';
import AdminAddOrderPage from './pages/AdminAddOrderPage';
import AdminAddProjectPage from './pages/AdminAddProjectPage';
import AdminProfilePage from './pages/AdminProfilePage';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { UserAuthProvider, useUserAuth } from './contexts/UserAuthContext';
import { LocaleProvider } from './i18n/LocaleContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import SeoManager from './components/SeoManager';
import { isListingsPath, isPropertySeoPath, listingsHrefFromSearchParams } from './lib/seoListingsUrl';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (isListingsPath(pathname)) return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function LegacyListingsRedirect() {
  const location = useLocation();
  const dest = listingsHrefFromSearchParams(new URLSearchParams(location.search));
  return <Navigate to={`${dest}${location.hash}`} replace />;
}

function UdzraviSwitch() {
  const { pathname } = useLocation();
  return isPropertySeoPath(pathname) ? <PropertyDetailPage /> : <ListingsPage />;
}

function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAdminAuth();
  // Keep the tree mounted once a session exists so add/edit forms are not wiped
  // if auth briefly reports loading again.
  if (loading && !user) return null;
  return user ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

/** Member-only areas. Sends visitors to /login and remembers where they wanted to go. */
function ProtectedUserRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useUserAuth();
  const location = useLocation();
  if (loading) return null;
  return user
    ? <>{children}</>
    : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
}

/** Old `/dashboard?tab=…` and `/dashboard/submit?id=…` links still land in the right place. */
function DashboardIndex() {
  const [params] = useSearchParams();
  const legacy: Record<string, string> = {
    favorites: '/dashboard/favorites',
    listings: '/dashboard/listings',
    searches: '/dashboard/searches',
    profile: '/dashboard/settings',
  };
  const target = legacy[params.get('tab') ?? ''];
  return target ? <Navigate to={target} replace /> : <AccountOverviewPage />;
}

function LegacySubmitRedirect() {
  const [params] = useSearchParams();
  const id = params.get('id');
  return id ? <Navigate to={`/dashboard/listings/${encodeURIComponent(id)}/edit`} replace /> : <SubmitListingPage />;
}

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

function AppContent({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.includes(location.pathname);
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isEmbed = new URLSearchParams(location.search).get('embed') === '1';

  if (isAdminPage) {
    return (
      <>
        <ScrollToTop />
        <SeoManager />
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/profile" element={<ProtectedAdminRoute><AdminProfilePage /></ProtectedAdminRoute>} />
          <Route path="/admin/listings/new" element={<ProtectedAdminRoute><AdminAddListingPage /></ProtectedAdminRoute>} />
          <Route path="/admin/listings/:id/edit" element={<ProtectedAdminRoute><AdminAddListingPage /></ProtectedAdminRoute>} />
          <Route path="/admin/orders/new" element={<ProtectedAdminRoute><AdminAddOrderPage /></ProtectedAdminRoute>} />
          <Route path="/admin/orders/:id" element={<ProtectedAdminRoute><AdminAddOrderPage /></ProtectedAdminRoute>} />
          <Route path="/admin/projects/new" element={<ProtectedAdminRoute><AdminAddProjectPage /></ProtectedAdminRoute>} />
          <Route path="/admin/projects/:id/edit" element={<ProtectedAdminRoute><AdminAddProjectPage /></ProtectedAdminRoute>} />
          <Route path="/admin/*" element={<ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute>} />
        </Routes>
      </>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300${isEmbed ? ' embed-preview' : ''}`}>
        <ScrollToTop />
        <SeoManager />
        {!isAuthPage && !isEmbed && <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}

        <AnimatePresence mode="wait">
          <motion.div
            key={isListingsPath(location.pathname) ? 'listings' : isDashboard ? 'dashboard' : isAuthPage ? 'auth' : location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/listings" element={<LegacyListingsRedirect />} />
              <Route path="/udzravi-qoneba" element={<ListingsPage />} />
              <Route path="/udzravi-qoneba/*" element={<UdzraviSwitch />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/agent/:id" element={<AgentProfilePage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:id" element={<BlogDetailPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
              <Route path="/reset-password" element={<AuthPage mode="reset" />} />
              <Route path="/dashboard" element={<ProtectedUserRoute><AccountLayout /></ProtectedUserRoute>}>
                <Route index element={<DashboardIndex />} />
                <Route path="listings" element={<AccountListingsPage />} />
                <Route path="listings/:id/edit" element={<SubmitListingPage />} />
                <Route path="submit" element={<LegacySubmitRedirect />} />
                <Route path="favorites" element={<AccountFavoritesPage />} />
                <Route path="searches" element={<AccountSearchesPage />} />
                <Route path="settings" element={<AccountSettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
              <Route path="/about" element={<AboutPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/project/:slug" element={<ProjectDetailPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/international" element={<InternationalPage />} />
              <Route path="/updates" element={<UpdatesPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>

        {!isAuthPage && !isDashboard && !isEmbed && !isListingsPath(location.pathname) && <Footer />}
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
      <LocaleProvider>
        <CurrencyProvider>
          <AdminAuthProvider>
            <UserAuthProvider>
              <AppContent darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            </UserAuthProvider>
          </AdminAuthProvider>
        </CurrencyProvider>
      </LocaleProvider>
    </BrowserRouter>
  );
}
