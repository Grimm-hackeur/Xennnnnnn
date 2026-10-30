import { Suspense, lazy } from 'react';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { RequireAdmin } from './layouts/AdminLayout';
import { Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { RequireAuth } from './layouts/RequireAuth';
import { Intro } from './components/Intro';
import { useAuth } from './auth/AuthContext';
import { Spinner } from './components/ui';
import { Tools } from './pages/Tools';
import { ToolPage } from './pages/ToolPage';
import { ApiPage } from './pages/ApiPage';
import { AccountPage } from './pages/Account';
import { MenuPage } from './pages/Menu';
import { LegalIndex, LegalPage } from './pages/Legal';
import { ForgotPage, LoginPage, RegisterPage, ResetPage, VerifyEmailPage } from './pages/AuthPages';
import { NotFound } from './pages/NotFound';
const adminPage = <K extends string>(k: K) => lazy(() => import('./pages/admin/AdminPages').then((m) => ({ default: (m as unknown as Record<K, () => React.JSX.Element>)[k] })));
const Overview = adminPage('Overview'), UsersPage = adminPage('UsersPage'), RolesPage = adminPage('RolesPage'), ApiStatsPage = adminPage('ApiStatsPage'), ServicesPage = adminPage('ServicesPage'), LogsPage = adminPage('LogsPage');

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  return user ? <Navigate to="/outils" replace /> : <Landing />;
}

export const AppRoutes = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<Index />} />
      <Route element={<RequireAuth />}>
        <Route path="outils" element={<Tools />} />
        <Route path="outils/:toolId" element={<ToolPage />} />
        <Route path="developpeurs" element={<ApiPage />} />
        <Route path="compte" element={<AccountPage />} />
        <Route path="menu" element={<MenuPage />} />
      </Route>
      <Route path="connexion" element={<LoginPage />} />
      <Route path="inscription" element={<RegisterPage />} />
      <Route path="verification-email" element={<VerifyEmailPage />} />
      <Route path="verify-email" element={<VerifyEmailPage />} />
      <Route path="mot-de-passe-oublie" element={<ForgotPage />} />
      <Route path="reset-password" element={<ResetPage />} />
      <Route path="legal" element={<LegalIndex />} />
      <Route path="legal/:slug" element={<LegalPage />} />
      <Route path="*" element={<NotFound />} />
    </Route>
    <Route path="admin" element={<Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}><RequireAdmin /></Suspense>}>
      <Route index element={<Overview />} />
      <Route path="utilisateurs" element={<UsersPage />} />
      <Route path="roles" element={<RolesPage />} />
      <Route path="api" element={<ApiStatsPage />} />
      <Route path="services" element={<ServicesPage />} />
      <Route path="journaux" element={<LogsPage />} />
    </Route>
  </Routes>
);

export default function App() {
  const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;
  return <Router><AuthProvider><AppRoutes /><Intro /></AuthProvider></Router>;
}
