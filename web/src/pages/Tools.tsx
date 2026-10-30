import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardPaste, Link2 } from 'lucide-react';
import { Badge, Button, SectionLabel, cx } from '../components/ui';
import { ToolCard, ToolIcon } from '../components/ToolCard';
import { detectTool, toolById, TOOLS, type ToolId } from '../features/tools';
import { useAuth } from '../auth/AuthContext';
import { api, type Paged } from '../lib/api';
import { ago } from '../lib/format';

interface HistoryItem { id: string; kind: 'SEARCH' | 'OPERATION'; tool: string; query: string | null; title: string | null; status: 'SUCCESS' | 'FAILED'; createdAt: string }

export function Tools() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [link, setLink] = useState('');
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const found = detectTool(link);

  useEffect(() => {
    let alive = true;
    api<Paged<HistoryItem>>('GET', '/me/history?page=1&pageSize=5').then((r) => { if (alive) setRecent(r.items); }).catch(() => { /* l'historique est facultatif */ });
    return () => { alive = false; };
  }, []);

  async function paste() { try { setLink(await navigator.clipboard.readText()); } catch { /* l'utilisateur colle au clavier */ } }
  function open(e: FormEvent) { e.preventDefault(); if (found) nav(`/outils/${found.id}`, { state: { link: link.trim() } }); }

  return (
    <div className="flex max-w-2xl flex-col gap-7">
      <div>
        <p className="text-sm text-muted">Bonjour, {user?.username}</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] [text-wrap:balance] md:text-[34px]">Que voulez-vous récupérer ?</h1>
      </div>

      <form onSubmit={open} className="flex flex-col gap-3 rounded-[22px] border border-line bg-gradient-to-br from-[#1c1f33] via-panel to-panel p-4" noValidate>
        <div className="flex h-[52px] items-center gap-2 rounded-full border border-line bg-bg pl-4 pr-1.5 transition-colors focus-within:border-accent">
          <Link2 size={18} className="shrink-0 text-muted" aria-hidden />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Coller un lien ici" aria-label="Lien à analyser" type="url" inputMode="url" autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-muted focus-visible:outline-none" />
          {link ? <Button type="submit" variant="primary" size="sm" disabled={!found} className="rounded-full px-4">Ouvrir</Button>
            : <Button type="button" size="sm" onClick={paste} aria-label="Coller depuis le presse-papiers" className="rounded-full"><ClipboardPaste size={14} />Coller</Button>}
        </div>
        <p className={cx('flex min-h-[22px] items-center gap-2 text-[13px]', found ? 'text-[#6ee7a8]' : 'text-muted')} aria-live="polite">
          <i className={cx('h-2 w-2 rounded-full', found ? 'bg-[#6ee7a8]' : 'bg-[#444]')} />
          {found ? `${found.name} reconnu` : link ? 'Lien non reconnu. Ouvrez un outil ci-dessous.' : 'TikTok, Instagram ou Facebook : la plateforme est reconnue toute seule.'}
        </p>
      </form>

      <section aria-label="Outils">
        <SectionLabel>Outils</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-2.5">{TOOLS.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
      </section>

      {recent.length > 0 && (
        <section aria-label="Récents">
          <SectionLabel>Récents</SectionLabel>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-panel">
            {recent.map((h) => { const t = toolById(h.tool); return (
              <li key={h.id} className="flex items-center gap-3 px-3.5 py-3">
                {t ? <ToolIcon id={t.id as ToolId} size={40} /> : <span className="h-10 w-10 rounded-xl bg-hover" />}
                <span className="min-w-0 flex-1 leading-snug"><span className="block truncate text-[15px] font-medium">{h.title ?? h.query ?? 'Sans titre'}</span>
                  <span className="block text-[13px] text-muted">{t?.name ?? h.tool} · {ago(h.createdAt)}</span></span>
                {h.status === 'FAILED' && <Badge tone="danger">Échec</Badge>}
              </li>); })}
          </ul>
        </section>
      )}
    </div>
  );
}
