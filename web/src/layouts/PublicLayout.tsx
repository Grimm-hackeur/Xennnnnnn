import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Code2, LayoutGrid, Menu, User as UserIcon, type LucideIcon } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ButtonLink, cx } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { DemoSwitch } from '../components/DemoSwitch';
import { LEGAL } from '../pages/Legal';

/** Barre du bas des comptes connectés. Pas d'onglet Accueil : l'appli s'ouvre directement sur les outils. */
const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/outils', label: 'Outils', icon: LayoutGrid },
  { to: '/developpeurs', label: 'API', icon: Code2 },
  { to: '/compte', label: 'Compte', icon: UserIcon },
];
const roundBtn = 'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-muted transition-colors hover:bg-hover hover:text-white';
const whitePill = 'flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-black transition-opacity hover:opacity-90';

export function PublicLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const onLanding = pathname === '/';
  const showDock = !user && onLanding;
  const brand = (
    <Link to="/" aria-label="Media Hub, accueil" className="flex items-center gap-2.5 text-white"><Logo size={32} id="mh-logo-target" /><span className="text-base font-semibold tracking-[-0.02em]">Media Hub</span></Link>
  );
  return (
    <div className="flex min-h-full flex-col bg-bg text-white">
      <header className="sticky top-0 z-30 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-5 md:h-16 md:px-8">
          {brand}
          {user && (
            <nav aria-label="Navigation" className="hidden items-center gap-1 md:flex">
              {TABS.slice(0, 2).map((t) => (
                <NavLink key={t.to} to={t.to} className={({ isActive }) => cx('rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-white', isActive ? 'text-white' : 'text-muted')}>{t.label}</NavLink>
              ))}
            </nav>
          )}
          <div className="hidden items-center gap-2 md:flex">
            {user ? <ButtonLink to={user.role === 'ADMIN' ? '/admin' : '/compte'} size="sm">{user.role === 'ADMIN' ? 'Administration' : 'Mon compte'}</ButtonLink>
              : <><ButtonLink to="/connexion" variant="ghost" size="sm">Connexion</ButtonLink><ButtonLink to="/inscription" variant="primary" size="sm">Créer un compte</ButtonLink></>}
          </div>
          <div className="flex items-center gap-2 md:hidden">
            {user
              ? <Link to="/menu" aria-label="Ouvrir le menu" className={roundBtn}><Menu size={17} aria-hidden /></Link>
              : <Link to="/connexion" className={whitePill}>Connexion</Link>}
          </div>
        </div>
      </header>

      <main key={pathname} className={cx('mh-fade mx-auto w-full max-w-6xl flex-1 px-5 pt-7 md:px-8 md:pb-16 md:pt-12', user || showDock ? 'pb-[calc(84px+env(safe-area-inset-bottom))]' : 'pb-12')}><Outlet /></main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-[13px] text-muted md:px-8 md:pb-6">
          <span>© 2026 Media Hub</span>
          <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGAL.slice(0, 4).map((l) => <Link key={l.slug} to={`/legal/${l.slug}`} className="hover:text-white">{l.short}</Link>)}
            <Link to="/legal" className="hover:text-white">Toutes les pages légales</Link>
          </nav>
        </div>
      </footer>

      {user && (
        <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-line bg-bg px-6 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 md:hidden">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} aria-label={t.label} className={({ isActive }) => cx('flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-medium transition-all duration-200', isActive ? 'bg-white px-4 text-black' : 'text-muted hover:text-white')}>
              {({ isActive }) => (<><t.icon size={21} strokeWidth={1.9} aria-hidden />{isActive && <span className="whitespace-nowrap">{t.label}</span>}</>)}
            </NavLink>
          ))}
        </nav>
      )}
      {showDock && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-line bg-bg/90 px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur md:hidden">
          <Link to="/connexion" className="flex h-12 flex-1 items-center justify-center rounded-full border border-line bg-panel text-[15px] font-semibold hover:bg-hover">Connexion</Link>
          <Link to="/inscription" className="flex h-12 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black hover:bg-neutral-200">Créer un compte</Link>
        </div>
      )}
      <DemoSwitch />
    </div>
  );
}
