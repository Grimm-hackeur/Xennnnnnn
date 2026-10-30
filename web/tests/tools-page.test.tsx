import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import { AppRoutes } from '../src/App';

const USER = { id: 'u1', username: 'zephyr', email: 'z@example.com', role: 'USER', emailVerified: true, avatar: null, createdAt: '2026-01-01T00:00:00Z', lastLoginAt: null };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const LINK = 'https://www.tiktok.com/@a/video/1';
const ANALYSIS = (wait = 0) => ({ jobId: 'a'.repeat(24), platform: 'tiktok', title: 'Ma vidéo', thumbnail: null, author: '@a', formats: [{ label: 'MP4 HD', format: 'mp4', quality: '1080p' }, { label: 'MP3', format: 'mp3', quality: null }], ads: { required: wait > 0, waitSeconds: wait }, readyAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 600000).toISOString() });

type Handler = (url: string, init?: RequestInit) => Response | undefined;
function mockApi(extra: Handler) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = String(input).replace(/^\/api/, ''); calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url === '/auth/me') return json({ user: USER, csrfToken: 'c' });
    if (url.startsWith('/me/history')) return json({ items: [{ id: 'h1', kind: 'OPERATION', tool: 'tiktok', query: 'tiktok.com', title: 'Recette express', status: 'SUCCESS', createdAt: new Date().toISOString() }], total: 1, page: 1, pageSize: 5 });
    return extra(url, init) ?? json({ error: { code: 'NOT_FOUND', message: 'x' } }, 404);
  }));
  return calls;
}
const at = (path: string, state?: unknown) => render(<MemoryRouter initialEntries={[{ pathname: path, state }]}><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter>);
beforeEach(() => { try { sessionStorage.clear(); } catch { /* */ } });
afterEach(() => vi.unstubAllGlobals());

describe('page Outils (compte connecté)', () => {
  it('reconnaît la plateforme du lien collé et affiche les récents réels', async () => {
    mockApi(() => undefined); at('/outils');
    expect(await screen.findByText(/Que voulez-vous récupérer/)).toBeInTheDocument();
    expect(await screen.findByText('Recette express')).toBeInTheDocument();
    const u = userEvent.setup(); await u.type(screen.getByLabelText('Lien à analyser'), LINK);
    expect(await screen.findByText(/TikTok reconnu/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir' })).toBeEnabled();
  });
  it('n’a plus d’onglet Accueil dans la barre du bas', async () => {
    mockApi(() => undefined); at('/outils'); await screen.findByText(/Que voulez-vous récupérer/);
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(nav.querySelector('a[aria-label="Accueil"]')).toBeNull();
    expect(nav.querySelectorAll('a')).toHaveLength(3);
  });
});

describe('page d’un outil', () => {
  it('analyse, propose les formats sans lien, puis remet le lien après « claim » (sans pub)', async () => {
    const calls = mockApi((url) => {
      if (url === '/tools/tiktok/analyze') return json(ANALYSIS(0));
      if (url.startsWith('/tools/jobs/') && url.endsWith('/claim')) return json({ title: 'Ma vidéo', downloads: [{ label: 'MP4 HD', format: 'mp4', quality: '1080p', url: 'https://cdn.example.com/hd.mp4' }, { label: 'MP3', format: 'mp3', quality: null, url: 'https://cdn.example.com/a.mp3' }], expiresAt: '' });
    });
    at('/outils/tiktok', { link: LINK });
    expect(await screen.findByText('Ma vidéo')).toBeInTheDocument();
    expect(document.querySelector('a[href*="cdn.example.com"]')).toBeNull();
    const u = userEvent.setup(); await u.click(screen.getByRole('radio', { name: /MP3/ })); await u.click(screen.getByRole('button', { name: 'Continuer' }));
    const dl = await screen.findByRole('link', { name: /télécharger/i });
    expect(dl).toHaveAttribute('href', 'https://cdn.example.com/a.mp3');
    expect(calls.some((c) => c.includes('/claim'))).toBe(true);
  });
  it('avec publicité : décompte affiché, puis lien', async () => {
    mockApi((url) => {
      if (url === '/tools/tiktok/analyze') return json(ANALYSIS(1));
      if (url.endsWith('/claim')) return json({ title: 'Ma vidéo', downloads: [{ label: 'MP4 HD', format: 'mp4', quality: '1080p', url: 'https://cdn.example.com/hd.mp4' }], expiresAt: '' });
    });
    at('/outils/tiktok', { link: LINK });
    const u = userEvent.setup(); await u.click(await screen.findByRole('button', { name: 'Continuer' }));
    expect(await screen.findByText(/Votre lien sera prêt dans/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /télécharger/i }, { timeout: 4000 })).toHaveAttribute('href', 'https://cdn.example.com/hd.mp4');
  });
  it('réessaie quand le serveur répond AD_NOT_FINISHED', async () => {
    let n = 0;
    mockApi((url) => {
      if (url === '/tools/tiktok/analyze') return json(ANALYSIS(0));
      if (url.endsWith('/claim')) return n++ === 0 ? json({ error: { code: 'AD_NOT_FINISHED', message: 'wait', meta: { retryAfter: 0 } } }, 409) : json({ title: 'x', downloads: [{ label: 'MP4 HD', format: 'mp4', quality: null, url: 'https://cdn.example.com/hd.mp4' }], expiresAt: '' });
    });
    at('/outils/tiktok', { link: LINK });
    const u = userEvent.setup(); await u.click(await screen.findByRole('button', { name: 'Continuer' }));
    expect(await screen.findByRole('link', { name: /télécharger/i }, { timeout: 4000 })).toBeInTheDocument();
    expect(n).toBe(2);
  });
  it('dit honnêtement quand le service n’est pas connecté', async () => {
    mockApi((url) => url === '/tools/tiktok/analyze' ? json({ error: { code: 'SERVICE_NOT_CONFIGURED', message: 'x' } }, 503) : undefined);
    at('/outils/tiktok', { link: LINK });
    expect(await screen.findByText('Service non connecté')).toBeInTheDocument();
  });
  it('refuse un lien d’une autre plateforme sans appeler le serveur', async () => {
    const calls = mockApi(() => undefined); at('/outils/tiktok');
    const u = userEvent.setup(); await u.type(await screen.findByLabelText('Lien de la vidéo'), 'https://www.instagram.com/p/x'); await u.click(screen.getByRole('button', { name: 'Analyser' }));
    expect(await screen.findByText(/ne vient pas de TikTok/)).toBeInTheDocument();
    expect(calls.some((c) => c.includes('/analyze'))).toBe(false);
  });
  it('musique : liste les résultats', async () => {
    mockApi((url) => url === '/tools/music/search' ? json({ provider: 'itunes', page: 1, pageSize: 10, hasMore: false, items: [{ id: 'track:1', type: 'song', title: 'Dancing Queen', artist: 'ABBA', album: 'Arrival', artwork: null, previewUrl: 'https://a.example.com/p.m4a', url: 'https://music.example.com/1', durationMs: 231000, genre: null }] }) : undefined);
    at('/outils/music'); const u = userEvent.setup();
    await u.type(await screen.findByLabelText('Recherche'), 'abba'); await u.click(screen.getByRole('button', { name: 'Rechercher' }));
    expect(await screen.findByText('Dancing Queen')).toBeInTheDocument();
    expect(screen.getByText(/ABBA · Arrival · 3:51/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /aperçu de Dancing Queen/ })).toBeInTheDocument());
  });
});

describe('page API', () => {
  it('affiche les statistiques réelles et la liste des clés', async () => {
    mockApi((url) => url.startsWith('/keys/usage') ? json({ range: '24h', totals: { requests: 131, errors: 4, activeKeys: 2, maxKeys: 5, errorRate: 0.031 }, series: [{ t: '2026-10-26T18:00:00Z', requests: 10, errors: 1 }, { t: '2026-10-26T19:00:00Z', requests: 40, errors: 0 }], keys: [{ id: 'k1', name: 'Application mobile', prefix: 'mh_live_a91f', createdAt: '2026-10-01T00:00:00Z', lastUsedAt: null, revokedAt: null, requests: 90, errors: 2, periodRequests: 76, periodErrors: 2 }] }) : undefined);
    at('/developpeurs');
    expect(await screen.findByText('131')).toBeInTheDocument();
    expect(screen.getByText(/Taux d’erreur 3,1 %/)).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.getByText('60 / min')).toBeInTheDocument();
    expect(screen.getByText('Application mobile')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'curl' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('étapes de la page d’un outil', () => {
  it('affiche les trois étapes et le choix de format avant de continuer', async () => {
    const calls = mockApi((url) => url === '/tools/tiktok/analyze' ? json(ANALYSIS(0)) : undefined);
    at('/outils/tiktok', { link: LINK });
    expect(await screen.findByText('Choisir le format')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Étapes' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /MP4 HD/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.setup().click(screen.getByRole('radio', { name: /MP3/ }));
    expect(screen.getByRole('radio', { name: /MP3/ })).toHaveAttribute('aria-checked', 'true');
    expect(calls.some((c) => c.includes('/claim'))).toBe(false); // rien n'est libéré tant qu'on n'a pas continué
  });
  it('musique : idées de recherche avant la première recherche', async () => {
    mockApi(() => undefined); at('/outils/music');
    expect(await screen.findByText('Idées de recherche')).toBeInTheDocument();
  });
});
