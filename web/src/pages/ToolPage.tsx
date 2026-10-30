import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Star, CheckCircle2, ClipboardPaste, Download, ExternalLink, FileAudio, Film, Link2, Music2, Pause, Play, Search } from 'lucide-react';
import { Alert, Button, SectionLabel, cx } from '../components/ui';
import { ToolIcon } from '../components/ToolCard';
import { api, ApiError } from '../lib/api';
import { checkLink, toolById, type Tool } from '../features/tools';
import { duration } from '../lib/format';

interface Format { label: string; format: string; quality: string | null }
interface Analysis { jobId: string; platform: string; title: string; thumbnail: string | null; author: string | null; formats: Format[]; ads: { required: boolean; waitSeconds: number }; readyAt: string; expiresAt: string }
interface Claimed { title: string; downloads: (Format & { url: string })[]; expiresAt: string }
interface Track { id: string; type: string; title: string; artist: string | null; album: string | null; artwork: string | null; previewUrl: string | null; url: string | null; durationMs: number | null; genre: string | null }
interface MusicPage { provider: string; items: Track[]; page: number; pageSize: number; hasMore: boolean }

type Phase =
  | { k: 'idle' } | { k: 'loading' } | { k: 'invalid'; message: string } | { k: 'unavailable' } | { k: 'error'; message: string }
  | { k: 'result'; a: Analysis; at: number }
  | { k: 'wait'; a: Analysis; at: number; pick: number }
  | { k: 'ready'; a: Analysis; pick: number; file: Claimed['downloads'][number] };

const fail = (e: unknown): Phase => {
  if (e instanceof ApiError) {
    if (e.status === 401) return { k: 'error', message: 'Votre session a expiré. Reconnectez-vous.' };
    if (e.code === 'SERVICE_NOT_CONFIGURED' || e.status === 503 || e.status === 501) return { k: 'unavailable' };
    if (e.status === 429) return { k: 'error', message: 'Trop de demandes. Patientez un instant avant de réessayer.' };
    return { k: 'error', message: e.message };
  }
  return { k: 'error', message: 'Erreur inattendue.' };
};

export function ToolPage() {
  const tool = toolById(useParams().toolId);
  if (!tool) return <Navigate to="/outils" replace />;
  return <Header tool={tool}>{tool.id === 'music' ? <MusicForm key="music" tool={tool} /> : <MediaForm key={tool.id} tool={tool} />}</Header>;
}

function Header({ tool, children }: { tool: Tool; children: React.ReactNode }) {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Link to="/outils" className="-ml-1 inline-flex h-9 w-fit items-center gap-1.5 text-sm text-muted hover:text-white"><ArrowLeft size={16} />Outils</Link>
      <div className="flex items-center gap-3.5"><ToolIcon id={tool.id} size={46} /><div><h1 className="text-[24px] font-semibold leading-tight tracking-[-0.03em]">{tool.name}</h1><p className="text-sm text-muted">{tool.tagline}</p></div></div>
      {children}
      <div><SectionLabel>À savoir</SectionLabel>
        <ul className="mt-2 text-sm text-muted">{tool.notes.map((n) => <li key={n} className="flex items-start gap-2.5 py-1.5"><Check size={14} className="mt-1 shrink-0" />{n}</li>)}</ul></div>
    </div>
  );
}

function Stepper({ step }: { step: 0 | 1 | 2 }) {
  const labels = ['Lien', 'Format', 'Télécharger'];
  return (
    <ol aria-label="Étapes" className="flex flex-col gap-2">
      <li className="flex gap-2" aria-hidden>{labels.map((l, i) => <span key={l} className={cx('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-white' : 'bg-line')} />)}</li>
      <li className="flex justify-between font-mono text-[11px]">{labels.map((l, i) => <span key={l} aria-current={i === step ? 'step' : undefined} className={i === step ? 'text-white' : 'text-muted'}>{i + 1}. {l}</span>)}</li>
    </ol>
  );
}

const HOW: [string, string][] = [['Collez le lien', 'Copiez-le depuis l’appli, puis collez-le ici.'], ['Choisissez le format', 'Vidéo ou audio, selon ce que la source propose.'], ['Téléchargez', 'Le fichier arrive sur votre appareil.']];
const fmtIcon = (f: string) => (['mp3', 'm4a', 'aac', 'opus', 'wav'].includes(f.toLowerCase()) ? FileAudio : Film);

function MediaForm({ tool }: { tool: Tool }) {
  const initial = (useLocation().state as { link?: string } | null)?.link ?? '';
  const [value, setValue] = useState(initial);
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const [now, setNow] = useState(Date.now());
  const [pick, setPick] = useState(0);
  const auto = useRef(initial);

  const analyze = useCallback(async (raw: string) => {
    const c = checkLink(raw, tool);
    if (!c.ok) return setPhase({ k: 'invalid', message: c.message });
    setPhase({ k: 'loading' });
    try { const a = await api<Analysis>('POST', `/tools/${tool.id}/analyze`, { url: raw.trim() }); setPick(0); setPhase({ k: 'result', a, at: Date.now() }); }
    catch (e) { setPhase(fail(e)); }
  }, [tool]);

  useEffect(() => { if (auto.current) { const v = auto.current; auto.current = ''; void analyze(v); } }, [analyze]);

  async function paste() { try { setValue(await navigator.clipboard.readText()); } catch { setPhase({ k: 'invalid', message: 'Le presse-papiers n’est pas accessible. Collez le lien avec le clavier.' }); } }
  function submit(e: FormEvent) { e.preventDefault(); void analyze(value); }

  /** Libère le lien : immédiatement sans publicité, sinon à la fin du décompte imposé par le serveur. */
  const claim = useCallback(async (a: Analysis, pick: number, tries = 0): Promise<void> => {
    try {
      const r = await api<Claimed>('POST', `/tools/jobs/${a.jobId}/claim`, {});
      const file = r.downloads[pick] ?? r.downloads[0];
      if (!file) return setPhase({ k: 'error', message: 'Aucun fichier disponible pour ce format.' });
      setPhase({ k: 'ready', a, pick, file });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'AD_NOT_FINISHED' && tries < 3) { await new Promise((r) => setTimeout(r, (e.meta?.retryAfter ?? 1) * 1000)); return claim(a, pick, tries + 1); }
      if (e instanceof ApiError && e.status === 404) return setPhase({ k: 'error', message: 'Ce téléchargement a expiré. Analysez le lien à nouveau.' });
      setPhase(fail(e));
    }
  }, []);

  function choose(a: Analysis, at: number, pick: number) {
    if (!a.ads.required || a.ads.waitSeconds <= 0) { void claim(a, pick); return; }
    setNow(Date.now()); setPhase({ k: 'wait', a, at, pick });
  }

  const waiting = phase.k === 'wait' ? phase : null;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [waiting]);
  const left = waiting ? Math.max(0, Math.ceil((waiting.at + waiting.a.ads.waitSeconds * 1000 - now) / 1000)) : 0;
  useEffect(() => { if (waiting && left <= 0) void claim(waiting.a, waiting.pick); }, [waiting, left, claim]);

  const step: 0 | 1 | 2 = phase.k === 'result' ? 1 : phase.k === 'wait' || phase.k === 'ready' ? 2 : 0;
  const result = phase.k === 'result' || phase.k === 'wait' || phase.k === 'ready' ? phase.a : null;
  return (
    <>
      <Stepper step={step} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-2.5">
        <div className={cx('flex h-[54px] items-center gap-2 rounded-full border bg-panel pl-4 pr-1.5 transition-colors focus-within:border-accent', phase.k === 'invalid' ? 'border-danger' : 'border-line')}>
          <Link2 size={18} className="shrink-0 text-muted" aria-hidden />
          <input value={value} onChange={(e) => { setValue(e.target.value); if (phase.k !== 'idle') setPhase({ k: 'idle' }); }} placeholder={tool.placeholder} aria-label="Lien de la vidéo" aria-invalid={phase.k === 'invalid'}
            type="url" inputMode="url" autoComplete="off" className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-muted focus-visible:outline-none" />
          {!value && <Button type="button" size="sm" onClick={paste} aria-label="Coller le lien" className="rounded-full"><ClipboardPaste size={14} />Coller</Button>}
          <Button type="submit" variant="primary" size="sm" loading={phase.k === 'loading'} className="rounded-full px-4">Analyser</Button>
        </div>
        {phase.k === 'invalid' ? <p role="alert" className="px-2 text-[13px] text-danger">{phase.message}</p> : <p className="px-2 text-[13px] text-muted">Copiez le lien depuis le bouton Partager de l’application.</p>}
      </form>

      <div aria-live="polite" className="flex flex-col gap-4">
        {phase.k === 'unavailable' && <Alert title="Service non connecté">Aucun fournisseur n’est encore actif pour {tool.name}. Aucun résultat n’est simulé.</Alert>}
        {phase.k === 'error' && <Alert title="Une erreur est survenue">{phase.message}</Alert>}
        {phase.k === 'loading' && <div role="status" className="flex items-center gap-3 rounded-[18px] border border-line bg-panel p-4 text-sm"><span className="mh-spin h-[18px] w-[18px] rounded-full border-2 border-line-strong border-t-white" />Analyse du lien…</div>}
        {result && (
          <div className="mh-fade flex flex-col gap-3">
            <div className="relative grid aspect-[2/1] w-full place-items-center overflow-hidden rounded-[18px] border border-line bg-gradient-to-br from-[#2a2d4a] via-[#14141a] to-[#2b1f2e]">
              {result.thumbnail ? <img src={result.thumbnail} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white/15 backdrop-blur"><Play size={22} aria-hidden /></span>}
            </div>
            <div className="leading-snug"><p className="line-clamp-2 text-[17px] font-semibold tracking-[-0.02em]">{result.title}</p><p className="text-[13px] text-muted">{result.author ?? result.platform}</p></div>
          </div>)}
        {phase.k === 'result' && (
          <div className="flex flex-col gap-3"><SectionLabel>Choisir le format</SectionLabel>
            <div role="radiogroup" aria-label="Format" className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-panel">{phase.a.formats.map((f, i) => { const Ico = fmtIcon(f.format); const on = pick === i; return (
              <button key={`${f.label}-${i}`} type="button" role="radio" aria-checked={on} onClick={() => setPick(i)} className={cx('flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-hover', on && 'bg-hover')}>
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-line bg-gradient-to-br from-[#1f2030] to-[#111]"><Ico size={18} aria-hidden /></span>
                <span className="min-w-0 flex-1 leading-snug"><span className="block font-semibold">{f.label}</span><span className="block text-[13px] text-muted">{[f.quality, f.format.toUpperCase()].filter(Boolean).join(' · ')}</span></span>
                <span aria-hidden className={cx('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2', on ? 'border-white' : 'border-[#3a3a3a]')}>{on && <span className="h-2.5 w-2.5 rounded-full bg-white" />}</span>
              </button>); })}</div>
            <Button variant="primary" size="lg" className="rounded-full" onClick={() => choose(phase.a, phase.at, pick)}>Continuer</Button>
            <button type="button" onClick={() => { setPhase({ k: 'idle' }); setValue(''); }} className="cursor-pointer self-center text-[13px] text-muted hover:text-white">Changer de lien</button>
          </div>)}
        {waiting && (
          <div role="status" className="mh-fade flex flex-col items-center gap-3 rounded-[22px] border border-line bg-gradient-to-br from-[#1c1f33] to-panel px-5 py-7 text-center">
            <Ring value={1 - left / waiting.a.ads.waitSeconds} label={String(left)} />
            <div><p className="font-semibold">Votre lien sera prêt dans {left} s</p><p className="mt-1 text-[13px] text-muted">Une courte publicité soutient le service gratuit.</p></div>
            <p className="rounded-full border border-line px-3 py-1 text-xs text-soft">{waiting.a.formats[waiting.pick]?.label}</p>
          </div>)}
        {phase.k === 'ready' && (
          <div className="mh-fade flex flex-col items-center gap-3 rounded-[22px] border border-line bg-gradient-to-br from-[#1c1f33] to-panel px-4 py-6 text-center">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-[#1f4a37] text-[#6ee7a8]"><CheckCircle2 size={26} aria-hidden /></span>
            <div><p className="text-lg font-semibold tracking-[-0.02em]">Fichier prêt</p><p className="text-[13px] text-muted">{phase.file.label}</p></div>
            <a href={phase.file.url} target="_blank" rel="noopener noreferrer" download className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-black transition-colors hover:bg-neutral-200"><Download size={18} />Télécharger</a>
            <p className="text-xs text-muted">Le lien expire dans quelques minutes.</p>
            <Button className="w-full rounded-full" onClick={() => { setPhase({ k: 'idle' }); setValue(''); }}>Nouveau lien</Button>
          </div>)}
        {phase.k === 'idle' && (
          <div className="flex flex-col gap-2.5"><SectionLabel>Comment ça marche</SectionLabel>
            <ol className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-panel">{HOW.map(([h, d], i) => (
              <li key={h} className="flex items-center gap-3.5 px-4 py-3"><span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-line font-semibold">{i + 1}</span><span className="leading-snug"><span className="block text-[15px] font-semibold">{h}</span><span className="block text-[13px] text-muted">{d}</span></span></li>))}</ol>
          </div>)}
      </div>
    </>
  );
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 58, c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[132px] w-[132px] place-items-center">
      <svg viewBox="0 0 132 132" className="absolute inset-0 -rotate-90" aria-hidden><circle cx="66" cy="66" r={r} fill="none" stroke="#2a2a2e" strokeWidth="8" /><circle cx="66" cy="66" r={r} fill="none" stroke="#9aa6ff" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} style={{ transition: 'stroke-dashoffset .3s linear' }} /></svg>
      <span className="text-[36px] font-semibold tabular-nums">{label}</span>
    </div>
  );
}

function MusicForm({ tool }: { tool: Tool }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Track[]>([]);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });
  const [searched, setSearched] = useState('');
  const [faved, setFaved] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { audio.current?.pause(); }, []);

  async function run(term: string, p: number) {
    if (term.trim().length < 2) return setPhase({ k: 'invalid', message: 'Saisissez au moins 2 caractères.' });
    setPhase({ k: 'loading' });
    try {
      const r = await api<MusicPage>('POST', '/tools/music/search', { q: term.trim(), page: p });
      setItems((cur) => (p === 1 ? r.items : [...cur, ...r.items])); setMore(r.hasMore); setPage(p); setSearched(term.trim()); setPhase({ k: 'idle' });
    } catch (e) { setPhase(fail(e)); }
  }
  function submit(e: FormEvent) { e.preventDefault(); audio.current?.pause(); setPlaying(null); void run(q, 1); }
  async function fav(t: Track) {
    if (faved.has(t.id)) return;
    try { await api('POST', '/me/favorites', { kind: 'TRACK', externalId: t.id, title: t.title, subtitle: t.artist ?? undefined, url: t.url ?? undefined, imageUrl: t.artwork ?? undefined }); setFaved((s) => new Set(s).add(t.id)); }
    catch (e) { if (e instanceof ApiError && e.status === 409) setFaved((s) => new Set(s).add(t.id)); }
  }
  function toggle(t: Track) {
    if (!t.previewUrl) return;
    if (playing === t.id) { audio.current?.pause(); setPlaying(null); return; }
    audio.current?.pause();
    const a = new Audio(t.previewUrl); audio.current = a; a.onended = () => setPlaying(null);
    void a.play().then(() => setPlaying(t.id)).catch(() => setPlaying(null));
  }
  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-col gap-2.5">
        <div className={cx('flex h-[54px] items-center gap-2 rounded-full border bg-panel pl-4 pr-1.5 transition-colors focus-within:border-accent', phase.k === 'invalid' ? 'border-danger' : 'border-line')}>
          <Search size={18} className="shrink-0 text-muted" aria-hidden />
          <input value={q} onChange={(e) => { setQ(e.target.value); if (phase.k === 'invalid') setPhase({ k: 'idle' }); }} placeholder={tool.placeholder} aria-label="Recherche" type="search" autoComplete="off" className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-muted focus-visible:outline-none" />
          <Button type="submit" variant="primary" size="sm" loading={phase.k === 'loading' && page === 1} className="rounded-full px-4">Rechercher</Button>
        </div>
        {phase.k === 'invalid' && <p role="alert" className="px-2 text-[13px] text-danger">{phase.message}</p>}
      </form>
      <div aria-live="polite" className="flex flex-col gap-4">
        {phase.k === 'unavailable' && <Alert title="Service non connecté">La recherche musicale n’est pas disponible pour le moment.</Alert>}
        {phase.k === 'error' && <Alert title="Une erreur est survenue">{phase.message}</Alert>}
        {searched && phase.k !== 'unavailable' && items.length === 0 && phase.k === 'idle' && <p className="text-sm text-muted">Aucun résultat pour « {searched} ».</p>}
        {items.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-panel">
            {items.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3.5 py-3">
                {t.artwork ? <img src={t.artwork} alt="" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-[11px] bg-hover object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-hover text-muted"><Music2 size={18} /></span>}
                <span className="min-w-0 flex-1 leading-snug"><span className="block truncate font-semibold">{t.title}</span><span className="block truncate text-[13px] text-muted">{[t.artist, t.album, duration(t.durationMs)].filter(Boolean).join(' · ')}</span></span>
                <button type="button" onClick={() => void fav(t)} aria-label={faved.has(t.id) ? `${t.title} est dans vos favoris` : `Ajouter ${t.title} aux favoris`} aria-pressed={faved.has(t.id)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-hover hover:text-white"><Star size={16} fill={faved.has(t.id) ? 'currentColor' : 'none'} /></button>
                {t.url && <a href={t.url} target="_blank" rel="noopener noreferrer" aria-label={`Voir la source de ${t.title}`} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-white"><ExternalLink size={16} /></a>}
                {t.previewUrl && <button type="button" onClick={() => toggle(t)} aria-label={playing === t.id ? 'Arrêter l’aperçu' : `Écouter l’aperçu de ${t.title}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-muted hover:bg-hover hover:text-white">{playing === t.id ? <Pause size={16} /> : <Play size={16} />}</button>}
              </li>))}
          </ul>)}
        {!searched && phase.k === 'idle' && (
          <div className="flex flex-col gap-2.5"><SectionLabel>Idées de recherche</SectionLabel>
            <div className="flex flex-wrap gap-2">{['abba', 'daft punk', 'bob marley', 'rihanna'].map((s) => <button key={s} type="button" onClick={() => { setQ(s); void run(s, 1); }} className="h-9 cursor-pointer rounded-full border border-line bg-panel px-4 text-[13px] text-soft transition-colors hover:bg-hover hover:text-white">{s}</button>)}</div></div>)}
        {more && <Button onClick={() => void run(searched, page + 1)} loading={phase.k === 'loading'} className="self-start rounded-full">Voir plus</Button>}
      </div>
    </>
  );
}
