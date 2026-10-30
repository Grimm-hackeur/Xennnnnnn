import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/auth/AuthContext';
import { AppRoutes } from '../src/App';
import { checkLink, toolById } from '../src/features/tools';
import { loginSchema, registerSchema } from '../src/pages/AuthPages';

vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401, headers: { 'content-type': 'application/json' } })));
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><AuthProvider><AppRoutes /></AuthProvider></MemoryRouter>);

describe('checkLink', () => {
  it('accepts a https tiktok link', () => expect(checkLink('https://www.tiktok.com/@a/video/1', toolById('tiktok')!).ok).toBe(true));
  it('rejects http', () => expect(checkLink('http://www.tiktok.com/@a/video/1', toolById('tiktok')!).ok).toBe(false));
  it('rejects look-alike hosts', () => expect(checkLink('https://tiktok.com.evil.io/x', toolById('tiktok')!).ok).toBe(false));
  it('rejects another platform', () => expect(checkLink('https://instagram.com/p/x', toolById('tiktok')!).ok).toBe(false));
});
describe('schemas', () => {
  it('login requires email and password', () => expect(loginSchema.safeParse({ email: 'x', password: '' }).success).toBe(false));
  it('register rejects short password', () => expect(registerSchema.safeParse({ email: 'a@b.co', username: 'abc', password: 'short', acceptTerms: true }).success).toBe(false));
});
describe('routes', () => {
  it('shows the visitor landing page with sign-up call to action and no tool links', async () => {
    at('/');
    expect((await screen.findAllByRole('link', { name: /créer un compte/i })).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /^tiktok$/i })).toBeNull();
    expect(document.querySelector('a[href^="/outils"]')).toBeNull();
  });
  it('sends visitors from the tools to the login page', async () => {
    at('/outils'); expect(await screen.findByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    expect(screen.queryByText(/Choisissez ce que vous voulez récupérer/)).toBeNull();
  });
  it('sends visitors from a tool page to the login page', async () => { at('/outils/tiktok'); expect(await screen.findByRole('button', { name: /se connecter/i })).toBeInTheDocument(); });
  it('redirects visitors away from admin', async () => { at('/admin'); expect(await screen.findByRole('button', { name: /connexion|se connecter/i })).toBeInTheDocument(); });
  it('shows login form', async () => { at('/connexion'); const u = userEvent.setup(); await u.click(await screen.findByRole('button', { name: /se connecter/i })); expect(await screen.findAllByRole('alert')).not.toHaveLength(0); });
});

describe('API page', () => {
  it('is reserved to accounts: visitors land on the login page', async () => { at('/developpeurs'); expect(await screen.findByRole('button', { name: /se connecter/i })).toBeInTheDocument(); expect(screen.queryByText(/Nouvelle clé/)).toBeNull(); });
});
