import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Code2, LayoutGrid, LogOut, Shield, User, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { LEGAL } from './Legal';
import { Logo } from '../components/Logo';

const ITEMS: { to: string; label: string; sub: string; icon: LucideIcon }[] = [
  { to: '/outils', label: 'Outils', sub: 'Vidéos et musique', icon: LayoutGrid },
  { to: '/developpeurs', label: 'API', sub: 'Clés, statistiques, exemples de code', icon: Code2 },
  { to: '/compte', label: 'Compte', sub: 'Sécurité, sessions, historique', icon: User },
];
const tile = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-gradient-to-br from-[#1f2030] to-[#111] text-[#e8eaf5]';

/** Menu plein écran du mobile : profil, navigation, liens secondaires, déconnexion. */
export function MenuPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = user?.role === 'ADMIN' ? [...ITEMS, { to: '/admin', label: 'Administration', sub: 'Réservé aux administrateurs', icon: Shield }] : ITEMS;
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-170px)] max-w-md flex-col gap-5">
      <div className="flex items-center justify-between"><span className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]"><Logo size={28} />Menu</span>
        <Link to="/outils" aria-label="Fermer le menu" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-muted transition-colors hover:bg-hover hover:text-white"><X size={17} /></Link></div>

      {user && (
        <Link to="/compte" className="flex items-center gap-3.5 rounded-[22px] border border-line bg-gradient-to-br from-[#1c1f33] to-panel p-3.5 transition-colors hover:border-line-strong">
          <span aria-hidden className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-gradient-to-br from-[#2b2f4d] to-[#15151a] text-lg font-bold uppercase">{user.username.slice(0, 1)}</span>
          <span className="min-w-0 flex-1 leading-snug"><span className="block truncate font-semibold">{user.username}</span><span className="block truncate text-[13px] text-muted">{user.email}</span></span>
          <ChevronRight size={16} className="text-muted" />
        </Link>)}

      <nav aria-label="Menu" className="flex flex-col gap-1.5">
        {items.map(({ to, label, sub, icon: Icon }) => (
          <Link key={to} to={to} className="flex h-[64px] items-center gap-3.5 rounded-[18px] border border-transparent px-3.5 transition-colors hover:border-line hover:bg-hover">
            <span className={tile}><Icon size={19} strokeWidth={1.8} aria-hidden /></span>
            <span className="min-w-0 flex-1 leading-snug"><span className="block text-[16px] font-semibold tracking-[-0.01em]">{label}</span><span className="block truncate text-[13px] text-muted">{sub}</span></span>
            <ChevronRight size={16} className="text-muted" />
          </Link>))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 pt-4">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
          {LEGAL.slice(0, 4).map((l) => <Link key={l.slug} to={`/legal/${l.slug}`} className="inline-flex h-8 items-center hover:text-white">{l.short}</Link>)}
          <Link to="/legal" className="inline-flex h-8 items-center hover:text-white">Tout voir</Link>
        </div>
        {user && <button type="button" onClick={async () => { await logout().catch(() => {}); nav('/'); }} className="flex h-[50px] cursor-pointer items-center justify-center gap-2.5 rounded-full border border-line bg-panel font-semibold transition-colors hover:bg-hover"><LogOut size={17} />Se déconnecter</button>}
      </div>
    </div>
  );
}
