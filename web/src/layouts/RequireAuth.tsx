import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../components/ui';

/** Garde d'interface : les outils sont réservés aux comptes. Le serveur refuse aussi les visiteurs (TOOLS_REQUIRE_LOGIN). */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!user) return <Navigate to="/connexion" state={{ from: loc.pathname }} replace />;
  return <Outlet />;
}
