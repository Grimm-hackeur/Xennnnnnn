import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Copy, KeyRound, LogOut, Monitor, Music2, Shield, ShieldCheck, Smartphone, Star, Trash2, Lock, History as HistoryIcon } from 'lucide-react';
import { Alert, Badge, Button, ButtonLink, Field, Modal, PageTitle, SectionLabel, cx } from '../components/ui';
import { api, ApiError, type Paged } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { isDemo, DEMO_2FA_CODE } from '../lib/demo';
import { ago } from '../lib/format';
import { ToolIcon } from '../components/ToolCard';
import { toolById } from '../features/tools';

interface SessionRow { id: string; current: boolean; createdAt: string; lastActivityAt: string; device: string }
interface HistoryRow { id: string; kind: string; tool: string | null; query: string | null; title: string | null; status: string; createdAt: string }
interface FavoriteRow { id: string; kind: string; title: string; subtitle: string | null; url: string | null; imageUrl: string | null }

/** « iPhone · Safari », « Windows · Chrome »… à partir du User-Agent enregistré par le serveur. */
export function deviceLabel(ua: string): { label: string; mobile: boolean } {
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return { label: br ? `${os} · ${br}` : os, mobile: os === 'iPhone' || os === 'Android' };
}

const Group = ({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) => (
  <section aria-label={title} className="flex flex-col gap-2.5"><SectionLabel right={right}>{title}</SectionLabel>{children}</section>
);
const Rows = ({ children }: { children: ReactNode }) => <div className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-panel">{children}</div>;
const IconTile = ({ children }: { children: ReactNode }) => <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-line bg-gradient-to-br from-[#1f2030] to-[#111] text-[#e8eaf5]">{children}</span>;
const EmptyRow = ({ children }: { children: ReactNode }) => <p className="px-4 py-6 text-center text-sm text-muted">{children}</p>;

export function AccountPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resent, setResent] = useState<'idle' | 'sent' | 'error'>('idle');
  if (!user) {
    return (
      <div className="max-w-sm"><PageTitle title="Compte" sub="Connectez-vous pour retrouver votre historique." />
        <div className="mt-8 flex flex-col gap-3"><ButtonLink to="/connexion" variant="primary" size="lg">Se connecter</ButtonLink><ButtonLink to="/inscription" size="lg">Créer un compte</ButtonLink></div></div>
    );
  }
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageTitle title="Compte" />
      {!user.emailVerified && (
        <Alert kind="info" title="Adresse non confirmée" action={<Button size="sm" className="w-fit rounded-full" onClick={() => api('POST', '/auth/resend-verification').then(() => setResent('sent'), () => setResent('error'))}>Renvoyer l’e-mail</Button>}>
          {resent === 'sent' ? 'E-mail envoyé. Vérifiez votre boîte de réception.' : resent === 'error' ? 'Envoi impossible pour le moment. Réessayez plus tard.' : 'Confirmez votre adresse pour débloquer toutes les fonctions.'}
        </Alert>)}

      <div className="flex items-center gap-4 rounded-[22px] border border-line bg-gradient-to-br from-[#1c1f33] to-panel p-4">
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line-strong bg-gradient-to-br from-[#2b2f4d] to-[#15151a] text-xl font-bold uppercase">{user.username.slice(0, 1)}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-[17px] font-semibold tracking-[-0.02em]">{user.username}</p><p className="truncate text-[13px] text-muted">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{user.emailVerified ? <Badge tone="success">E-mail vérifié</Badge> : <Badge tone="warn">À confirmer</Badge>}{user.role === 'ADMIN' && <Badge tone="accent">Admin</Badge>}</div></div>
      </div>

      {user.role === 'ADMIN' && <Link to="/admin" className="flex h-14 items-center gap-3.5 rounded-[18px] border border-line bg-panel px-4 transition-colors hover:bg-hover"><IconTile><Shield size={18} /></IconTile><span className="flex-1 text-[15px] font-semibold">Administration</span><ChevronRight size={16} className="text-muted" /></Link>}

      <Group title="Sécurité">
        <Rows>
          <TwoFactorRow />
          <Link to="/mot-de-passe-oublie" className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-hover"><IconTile><Lock size={18} /></IconTile>
            <span className="min-w-0 flex-1 leading-snug"><span className="block text-[15px] font-semibold">Mot de passe</span><span className="block text-[13px] text-muted">Réinitialiser par e-mail</span></span><ChevronRight size={16} className="text-muted" /></Link>
        </Rows>
      </Group>

      <SessionsSection />
      <HistorySection />
      <FavoritesSection />

      <Group title="Zone sensible">
        <div className="grid gap-2.5">
          <Button size="lg" className="rounded-full" onClick={async () => { await logout(); nav('/'); }}><LogOut size={17} />Se déconnecter</Button>
          <Button size="lg" variant="danger" className="rounded-full" onClick={() => setConfirmDelete(true)}><Trash2 size={17} />Supprimer mon compte</Button>
        </div>
      </Group>
      {confirmDelete && <DeleteDialog onClose={() => setConfirmDelete(false)} onDone={async () => { await logout().catch(() => {}); nav('/'); }} />}
    </div>
  );
}

function TwoFactorRow() {
  const { user, refresh } = useAuth();
  const [modal, setModal] = useState<'enable' | 'disable' | null>(null);
  if (!user) return null;
  const on = !!user.twoFactorEnabled;
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <IconTile><ShieldCheck size={18} className={on ? 'text-[#6ee7a8]' : undefined} /></IconTile>
      <div className="min-w-0 flex-1 leading-snug"><p id="2fa-title" className="text-[15px] font-semibold">Double authentification</p>
        <p className="text-[13px] text-muted">{on ? 'Activée · application d’authentification' : user.role === 'ADMIN' ? 'Désactivée · recommandée pour un administrateur' : 'Désactivée'}</p></div>
      <button type="button" role="switch" aria-checked={on} aria-labelledby="2fa-title" onClick={() => setModal(on ? 'disable' : 'enable')}
        className={cx('relative h-7 w-[46px] shrink-0 cursor-pointer rounded-full transition-colors', on ? 'bg-[#6ee7a8]' : 'bg-[#2a2a2e]')}>
        <span className={cx('absolute top-[3px] h-[22px] w-[22px] rounded-full transition-all', on ? 'left-[21px] bg-black' : 'left-[3px] bg-[#777]')} />
      </button>
      {modal === 'enable' && <EnableDialog onClose={() => setModal(null)} onDone={() => { setModal(null); void refresh(); }} />}
      {modal === 'disable' && <DisableDialog onClose={() => setModal(null)} onDone={() => { setModal(null); void refresh(); }} />}
    </div>
  );
}

function SessionsSection() {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(() => api<{ items: SessionRow[] }>('GET', '/me/sessions').then((r) => { setRows(r.items); setErr(false); }, () => setErr(true)), []);
  useEffect(() => { void load(); }, [load]);
  const others = rows?.filter((r) => !r.current) ?? [];
  return (
    <Group title="Sessions ouvertes">
      {err ? <Alert title="Sessions indisponibles">Impossible de charger vos sessions pour le moment.</Alert> : !rows ? <div className="h-[72px] animate-pulse rounded-[18px] border border-line bg-panel" /> : (
        <Rows>{rows.map((s) => { const d = deviceLabel(s.device); const Ico = d.mobile ? Smartphone : Monitor; return (
          <div key={s.id} className="flex items-center gap-3.5 px-4 py-3.5"><IconTile><Ico size={18} /></IconTile>
            <span className="min-w-0 flex-1 leading-snug"><span className="block truncate text-[15px] font-semibold">{s.current ? 'Cet appareil' : d.label}</span><span className="block text-[13px] text-muted">{s.current ? d.label : ago(s.lastActivityAt)}</span></span>
            {s.current ? <Badge tone="success">Actuelle</Badge> : <Button size="sm" className="rounded-full" onClick={() => api('DELETE', `/me/sessions/${s.id}`).then(load, load)}>Fermer</Button>}
          </div>); })}</Rows>)}
      {others.length > 0 && <Button size="sm" className="w-fit rounded-full" onClick={() => api('POST', '/me/sessions/revoke-others').then(load, load)}>Fermer les autres sessions</Button>}
    </Group>
  );
}

const TOOL_LABEL: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', music: 'Musique' };
function HistorySection() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(() => api<Paged<HistoryRow>>('GET', '/me/history?page=1&pageSize=10').then((r) => { setRows(r.items); setErr(false); }, () => setErr(true)), []);
  useEffect(() => { void load(); }, [load]);
  return (
    <Group title="Historique" right={rows && rows.length > 0 ? <button type="button" onClick={() => api('DELETE', '/me/history').then(load, load)} className="rounded-full border border-line px-3 py-1 font-sans text-xs normal-case tracking-normal text-soft hover:bg-hover hover:text-white">Vider</button> : undefined}>
      {err ? <Alert title="Historique indisponible">Impossible de charger l’historique pour le moment.</Alert> : !rows ? <div className="h-[72px] animate-pulse rounded-[18px] border border-line bg-panel" /> : (
        <Rows>{rows.length === 0 ? <EmptyRow>Aucun historique pour l’instant.</EmptyRow> : rows.map((h) => { const tool = toolById(h.tool ?? undefined); return (
          <div key={h.id} className="flex items-center gap-3.5 px-4 py-3">{tool ? <ToolIcon id={tool.id} size={38} /> : <IconTile><HistoryIcon size={18} /></IconTile>}
            <span className="min-w-0 flex-1 leading-snug"><span className="block truncate text-[15px] font-semibold">{h.title ?? h.query ?? 'Sans titre'}</span><span className="block text-[13px] text-muted">{(h.tool && TOOL_LABEL[h.tool]) ?? 'Outil'} · {ago(h.createdAt)}</span></span>
          </div>); })}</Rows>)}
      <p className="px-1 text-xs text-muted">Seul le nom du site est conservé, jamais le lien complet.</p>
    </Group>
  );
}

function FavoritesSection() {
  const [rows, setRows] = useState<FavoriteRow[] | null>(null);
  const load = useCallback(() => api<Paged<FavoriteRow>>('GET', '/me/favorites?page=1&pageSize=10').then((r) => setRows(r.items), () => setRows([])), []);
  useEffect(() => { void load(); }, [load]);
  if (!rows) return null;
  return (
    <Group title="Favoris">
      <Rows>{rows.length === 0 ? <EmptyRow>Vos titres favoris apparaîtront ici.</EmptyRow> : rows.map((f) => (
        <div key={f.id} className="flex items-center gap-3.5 px-4 py-3">
          {f.imageUrl ? <img src={f.imageUrl} alt="" referrerPolicy="no-referrer" className="h-[38px] w-[38px] shrink-0 rounded-xl bg-hover object-cover" /> : <IconTile>{f.kind === 'LINK' ? <Star size={18} /> : <Music2 size={18} />}</IconTile>}
          <span className="min-w-0 flex-1 leading-snug"><span className="block truncate text-[15px] font-semibold">{f.title}</span>{f.subtitle && <span className="block truncate text-[13px] text-muted">{f.subtitle}</span>}</span>
          <button type="button" aria-label={`Retirer ${f.title} des favoris`} onClick={() => api('DELETE', `/me/favorites/${f.id}`).then(load, load)} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-white"><Star size={16} fill="currentColor" /></button>
        </div>))}</Rows>
    </Group>
  );
}

function DeleteDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  return (
    <Modal title="Supprimer mon compte" onClose={onClose}>
      <p className="mt-2 text-sm text-muted">Cette action est définitive. Vos sessions sont fermées et vos données personnelles sont effacées. Confirmez avec votre mot de passe.</p>
      <form className="mt-4 flex flex-col gap-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(null); try { await api('DELETE', '/auth/account', { password: pw }); onDone(); } catch (x) { setErr(x instanceof ApiError ? x.message : 'Erreur'); setBusy(false); } }}>
        {err && <Alert title="Suppression impossible">{err}</Alert>}
        <Field label="Mot de passe" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        <div className="flex justify-end gap-2"><Button type="button" onClick={onClose}>Annuler</Button><Button type="submit" variant="danger" loading={busy} disabled={!pw}>Supprimer définitivement</Button></div>
      </form>
    </Modal>
  );
}

function EnableDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'loading' | 'scan' | 'codes'>('loading');
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState(''); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[]>([]); const [saved, setSaved] = useState(false); const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    api<{ secret: string; otpauthUri: string }>('POST', '/auth/2fa/setup').then(async (s) => {
      if (!alive) return; setSetup(s); setStep('scan');
      try { const { default: QRCode } = await import('qrcode'); const svg = await QRCode.toString(s.otpauthUri, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#ffffff' } }); if (alive) setQr(svg); } catch { /* the manual key stays available */ }
    }).catch((x) => { if (alive) { setErr(x instanceof ApiError ? x.message : 'Erreur'); setStep('scan'); } });
    return () => { alive = false; };
  }, []);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* user can select the text */ } };
  const spaced = setup?.secret.match(/.{1,4}/g)?.join(' ') ?? '';
  return (
    <Modal title="Activer la double authentification" onClose={step === 'codes' ? onDone : onClose}>
      {step === 'loading' && <p className="mt-3 text-sm text-muted">Préparation…</p>}
      {step === 'scan' && (
        <form className="mt-3 flex flex-col gap-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(null); try { const r = await api<{ recoveryCodes: string[] }>('POST', '/auth/2fa/enable', { code }); setCodes(r.recoveryCodes); setStep('codes'); } catch (x) { setErr(x instanceof ApiError ? (x.status === 400 ? 'Code incorrect. Vérifiez l’heure de votre téléphone.' : x.message) : 'Erreur'); } setBusy(false); }}>
          {isDemo && <Alert kind="info" title="Aperçu">Clé factice, non valide. Code accepté : {DEMO_2FA_CODE}.</Alert>}
          {err && <Alert title="Impossible">{err}</Alert>}
          {setup && (<>
            <p className="text-sm text-muted">1. Scannez ce QR code avec votre application (Google Authenticator, Aegis, 1Password…).</p>
            {qr && <div className="mx-auto h-44 w-44 overflow-hidden rounded-md bg-white p-1 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="QR code de configuration" dangerouslySetInnerHTML={{ __html: qr }} />}
            <div className="text-sm text-muted">Sur le même téléphone ? <a className="text-white underline" href={setup.otpauthUri}>Ouvrir dans l’application</a>. Sinon, saisissez la clé :</div>
            <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-2"><code className="min-w-0 flex-1 break-all font-mono text-[13px] tracking-wide">{spaced}</code>
              <button type="button" onClick={() => copy(setup.secret)} className="text-muted hover:text-white" aria-label="Copier la clé"><Copy size={16} /></button></div>
            {copied && <p className="text-xs text-muted" role="status">Copié.</p>}
            <p className="text-sm text-muted">2. Saisissez le code à 6 chiffres affiché.</p>
            <Field label="Code à 6 chiffres" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </>)}
          <div className="flex justify-end gap-2"><Button type="button" onClick={onClose}>Annuler</Button><Button type="submit" variant="primary" loading={busy} disabled={code.length !== 6 || !setup}>Activer</Button></div>
        </form>
      )}
      {step === 'codes' && (
        <div className="mt-3 flex flex-col gap-4">
          <Alert kind="success" title="Double authentification activée">Conservez ces codes de secours : chacun ne sert qu’une fois et ils ne seront plus affichés.</Alert>
          <ul className="grid grid-cols-2 gap-2 rounded-md border border-line bg-bg p-3 font-mono text-[13px]">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
          <Button size="sm" onClick={() => copy(codes.join('\n'))}><Copy size={15} />{copied ? 'Copié' : 'Copier les codes'}</Button>
          <label className="flex items-start gap-3 text-sm text-soft"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#9aa6ff]" checked={saved} onChange={(e) => setSaved(e.target.checked)} />J’ai enregistré mes codes de secours dans un endroit sûr.</label>
          <div className="flex justify-end"><Button variant="primary" disabled={!saved} onClick={onDone}>Terminer</Button></div>
        </div>
      )}
    </Modal>
  );
}

function DisableDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pw, setPw] = useState(''); const [code, setCode] = useState(''); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  return (
    <Modal title="Désactiver la double authentification" onClose={onClose}>
      <p className="mt-2 text-sm text-muted">Confirmez avec votre mot de passe et un code de votre application (ou un code de secours).</p>
      <form className="mt-4 flex flex-col gap-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(null); try { await api('POST', '/auth/2fa/disable', { password: pw, code: code.trim() }); onDone(); } catch (x) { setErr(x instanceof ApiError ? (x.status === 401 ? 'Code incorrect.' : x.status === 403 ? 'Mot de passe incorrect.' : x.message) : 'Erreur'); setBusy(false); } }}>
        {err && <Alert title="Impossible">{err}</Alert>}
        <Field label="Mot de passe" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        <Field label="Code" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
        <div className="flex justify-end gap-2"><Button type="button" onClick={onClose}>Annuler</Button><Button type="submit" variant="danger" loading={busy} disabled={!pw || code.trim().length < 6}>Désactiver</Button></div>
      </form>
    </Modal>
  );
}
