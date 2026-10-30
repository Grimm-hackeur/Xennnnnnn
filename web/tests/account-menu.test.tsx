import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import { AppRoutes } from '../src/App';
import { deviceLabel } from '../src/pages/Account';
import { googleErrorMessage } from '../src/pages/AuthPages';

const USER = { id: 'u1', username: 'zephyr', email: 'z@example.com', role: 'USER', emailVerified: true, avatar: null, createdAt: '2026-01-01T00:00:00Z', lastLoginAt: null, twoFactorEnabled: false };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const iso = (min: number) => new Date(Date.now() - min * 60000).toISOString();

function mock(opts: { user?: object | null; google?: boolean; extra?: (m: string, u: string) => Response | undefined } = {}) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = String(input).replace(/^\/api/, ''); const m = init?.method ?? 'GET'; calls.push(`${m} ${url}`);
    const r = opts.extra?.(m, url); if (r) return r;
    if (url === '/auth/me') return opts.user === null ? json({ error: { code: 'UNAUTHORIZED', message: 'x' } }, 401) : json({ user: opts.user ?? USER, csrfToken: 'c' });
    if (url === '/auth/google/status') return json({ configured: opts.google ?? true });
    if (url === '/me/sessions') return json({ items: [{ id: 's1', current: true, createdAt: iso(5), lastActivityAt: iso(0), device: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari/604.1' }, { id: 's2', current: false, createdAt: iso(900), lastActivityAt: iso(600), device: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36' }] });
    if (url.startsWith('/me/history')) return init?.method === 'DELETE' ? json({ deleted: 1 }) : json({ items: [{ id: 'h1', kind: 'OPERATION', tool: 'tiktok', query: 'tiktok.com', title: 'Recette express', status: 'SUCCESS', createdAt: iso(120) }], total: 1, page: 1, pageSize: 10 });
    if (url.startsWith('/me/favorites')) return json({ items: [{ id: 'f1', kind: 'TRACK', title: 'Dancing Queen', subtitle: 'ABBA', url: null, imageUrl: null }], total: 1, page: 1, pageSize: 10 });
    return json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404);
  }));
  return calls;
}
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter>);
afterEach(() => { vi.unstubAllGlobals(); try { sessionStorage.clear(); } catch { /* */ } });

describe('bouton Google', () => {
  it('est actif quand le serveur confirme que Google est configuré', async () => {
    mock({ user: null, google: true }); at('/connexion');
    const b = await screen.findByRole('button', { name: /Continuer avec Google/ });
    await waitFor(() => expect(b).toBeEnabled());
  });
  it('reste grisé avec une phrase claire quand Google n’est pas configuré', async () => {
    mock({ user: null, google: false }); at('/connexion');
    expect(await screen.findByText(/Connexion Google indisponible/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuer avec Google/ })).toBeDisabled();
  });
  it('affiche un message français pour chaque erreur renvoyée par le serveur', async () => {
    mock({ user: null }); at('/connexion?error=google_email_conflict');
    expect(await screen.findByText(/Un compte existe déjà avec cette adresse/)).toBeInTheDocument();
  });
  it('couvre tous les codes d’erreur connus, avec repli sur un message générique', () => {
    for (const c of ['google_denied', 'google_invalid_state', 'google_session_expired', 'google_failed', 'google_email_unverified', 'google_email_conflict', 'google_in_use', 'google_link_session', 'account_suspended']) expect(googleErrorMessage(c)).toMatch(/\S/);
    expect(googleErrorMessage('inconnu')).toMatch(/échoué/);
    expect(googleErrorMessage(null)).toBeNull();
  });
  it('au retour de Google (?login=google) ouvre la session et va aux outils', async () => {
    const calls = mock({ user: USER }); at('/connexion?login=google');
    expect(await screen.findByText(/Que voulez-vous récupérer/)).toBeInTheDocument();
    expect(calls.filter((c) => c === 'GET /auth/me').length).toBeGreaterThan(0);
  });
});

describe('page Compte', () => {
  it('affiche profil, sécurité, sessions, historique et favoris réels', async () => {
    mock(); at('/compte');
    expect(await screen.findByText('E-mail vérifié')).toBeInTheDocument();
    expect(await screen.findByText('Cet appareil')).toBeInTheDocument();
    expect(await screen.findByText('Windows · Chrome')).toBeInTheDocument();
    expect(await screen.findByText('Recette express')).toBeInTheDocument();
    expect(await screen.findByText('Dancing Queen')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Double authentification' })).toHaveAttribute('aria-checked', 'false');
  });
  it('ferme une autre session et vide l’historique via le serveur', async () => {
    const calls = mock(); at('/compte'); const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: 'Fermer' }));
    await waitFor(() => expect(calls).toContain('DELETE /me/sessions/s2'));
    await u.click(await screen.findByRole('button', { name: 'Vider' }));
    await waitFor(() => expect(calls).toContain('DELETE /me/history'));
  });
  it('propose de renvoyer l’e-mail quand l’adresse n’est pas confirmée', async () => {
    const calls = mock({ user: { ...USER, emailVerified: false }, extra: (m, u) => (u === '/auth/resend-verification' ? json({ ok: true }) : undefined) }); at('/compte');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Renvoyer l’e-mail' }));
    expect(await screen.findByText(/E-mail envoyé/)).toBeInTheDocument();
    expect(calls).toContain('POST /auth/resend-verification');
  });
  it('l’interrupteur de double authentification ouvre le dialogue d’activation', async () => {
    mock({ extra: (m, u) => (u === '/auth/2fa/setup' ? json({ secret: 'ABCDEFGHIJKLMNOP', otpauthUri: 'otpauth://totp/x?secret=ABCDEFGHIJKLMNOP' }) : undefined) }); at('/compte');
    await userEvent.setup().click(await screen.findByRole('switch', { name: 'Double authentification' }));
    expect(await screen.findByRole('dialog', { name: /Activer la double authentification/ })).toBeInTheDocument();
  });
  it('demande le mot de passe avant de supprimer le compte', async () => {
    mock(); at('/compte'); const u = userEvent.setup();
    await u.click(await screen.findByRole('button', { name: /Supprimer mon compte/ }));
    const d = await screen.findByRole('dialog', { name: /Supprimer mon compte/ });
    expect(d).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer définitivement' })).toBeDisabled();
  });
  it('reconnaît l’appareil depuis le User-Agent', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1')).toEqual({ label: 'iPhone · Safari', mobile: true });
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537')).toEqual({ label: 'Windows · Chrome', mobile: false });
    expect(deviceLabel('???').label).toBe('Appareil');
  });
});

describe('menu hamburger', () => {
  it('montre profil, navigation, liens légaux et déconnexion', async () => {
    mock(); at('/menu');
    expect(await screen.findByText('zephyr')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Menu' });
    expect(nav.querySelectorAll('a').length).toBe(3);
    expect(nav.querySelector('a[href="/admin"]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Fermer le menu' })).toHaveAttribute('href', '/outils');
    expect(screen.getByRole('button', { name: /Se déconnecter/ })).toBeInTheDocument();
  });
  it('ajoute Administration seulement pour un administrateur', async () => {
    mock({ user: { ...USER, role: 'ADMIN' } }); at('/menu');
    await screen.findByText('zephyr');
    expect(screen.getByRole('navigation', { name: 'Menu' }).querySelector('a[href="/admin"]')).not.toBeNull();
  });
});
