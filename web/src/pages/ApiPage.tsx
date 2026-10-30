import { useState } from 'react';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Empty, Field, Modal, Panel, SectionLabel, Spinner } from '../components/ui';
import { LiveBadge } from '../components/LiveBadge';
import { RangeTabs, fmt, pct } from '../components/StatCard';
import { ago } from '../lib/format';
import { UsageChart, type Point } from '../components/UsageChart';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../lib/api';
import { DEMO_KEY_NOTICE, isDemo } from '../lib/demo';
import { usePoll } from '../lib/usePoll';

interface KeyItem { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null; requests: number; errors: number; periodRequests: number; periodErrors: number }
interface Usage { range: string; totals: { requests: number; errors: number; activeKeys: number; maxKeys: number; errorRate: number }; series: Point[]; keys: KeyItem[] }

export function ApiPage() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Dashboard verified={user.emailVerified} /> : null;
}

function Dashboard({ verified }: { verified: boolean }) {
  const [range, setRange] = useState('24h');
  const { data, error, loading, updatedAt, reload } = usePoll<Usage>(`/keys/usage?range=${range}`, 5000);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<KeyItem | null>(null);
  const [lang, setLang] = useState<keyof typeof SNIPPETS>('curl');
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(text: string, tag: string) { try { await navigator.clipboard.writeText(text); setCopied(tag); setTimeout(() => setCopied(null), 1400); } catch { setCopied(null); } }

  const atLimit = !!data && data.totals.activeKeys >= data.totals.maxKeys;
  const hint = range === '24h' ? '24 dernières heures' : range === '7d' ? '7 derniers jours' : '30 derniers jours';
  const rate = data?.totals.errorRate ?? 0;
  const tone = rate < 0.02 ? 'border-[#1f4a37] bg-[#6ee7a8]/10 text-[#6ee7a8]' : rate < 0.08 ? 'border-line text-soft' : 'border-[#4a2424] bg-danger/10 text-danger';
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div><h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em]">API</h1><p className="mt-1 text-sm text-muted">Vos clés et leur utilisation.</p></div>
        <Button variant="primary" className="rounded-full" onClick={() => setCreating(true)} disabled={!verified || atLimit} title={!verified ? 'Confirmez votre e-mail' : atLimit ? 'Limite atteinte' : undefined}><Plus size={16} />Nouvelle clé</Button>
      </div>
      {isDemo && <p className="w-fit rounded border border-dashed border-line-strong px-2 py-0.5 font-mono text-[11px] text-muted">APERÇU · DONNÉES D’EXEMPLE · LES CLÉS CRÉÉES ICI SONT FACTICES</p>}
      {!verified && <Alert kind="info" title="Confirmez votre adresse e-mail">La création de clés est réservée aux comptes vérifiés.</Alert>}
      <RangeTabs value={range} onChange={setRange} />
      {loading && !data ? <Spinner /> : error && !data ? <Alert title="Impossible de charger l’utilisation" action={<Button size="sm" onClick={() => void reload()}>Réessayer</Button>}>{error.message}</Alert> : data && (<>
        <Panel className="flex flex-col gap-4 rounded-[20px] p-4">
          <div className="flex items-start justify-between gap-3">
            <div><div className="text-[44px] font-semibold leading-none tracking-[-0.045em] tabular-nums">{fmt(data.totals.requests)}</div><p className="mt-1.5 text-[13px] text-muted">requêtes · {hint}</p></div>
            <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs ${tone}`}><i className="h-1.5 w-1.5 rounded-full bg-current" />Taux d’erreur {pct(rate)}</span>
          </div>
          <dl className="grid grid-cols-3 border-y border-line">
            {([['Erreurs', fmt(data.totals.errors)], ['Clés actives', `${data.totals.activeKeys} / ${data.totals.maxKeys}`], ['Limite par clé', '60 / min']] as const).map(([l, v], i) => (
              <div key={l} className={`min-w-0 py-3 ${i ? 'border-l border-line pl-3' : ''}`}><dt className="text-[11px] text-muted">{l}</dt><dd className="whitespace-nowrap text-[17px] font-semibold tabular-nums">{v}</dd></div>))}
          </dl>
          <UsageChart points={data.series} range={range} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-accent" />Requêtes</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-danger" />Erreurs</span><span className="ml-auto whitespace-nowrap [&_*]:whitespace-nowrap"><LiveBadge updatedAt={updatedAt} error={!!error} /></span></div>
        </Panel>

        <section aria-label="Clés API" className="flex flex-col gap-3">
          <SectionLabel>Vos clés</SectionLabel>
          {data.keys.length === 0 ? <Empty icon={<KeyRound size={20} />} title="Aucune clé" text="Créez votre première clé pour appeler l’API." /> : (
            <ul className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-panel">
              {data.keys.map((k) => (
                <li key={k.id} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 p-3.5 ${k.revokedAt ? 'opacity-55' : ''}`}>
                  <p className="flex min-w-0 items-center gap-2 font-semibold"><i className={`h-2 w-2 shrink-0 rounded-full ${k.revokedAt ? 'bg-[#555]' : 'bg-[#6ee7a8]'}`} /><span className="truncate">{k.name}</span>{k.revokedAt && <Badge tone="danger">Révoquée</Badge>}</p>
                  <div className="row-span-2 flex items-center gap-1.5">
                    <button type="button" onClick={() => void copy(k.prefix, k.id)} aria-label={`Copier le préfixe de ${k.name}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-hover hover:text-white">{copied === k.id ? <Check size={16} /> : <Copy size={16} />}</button>
                    {!k.revokedAt && <button type="button" onClick={() => setRevoking(k)} aria-label={`Révoquer ${k.name}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-[#4a2424] hover:text-danger"><Trash2 size={16} /></button>}
                  </div>
                  <p className="font-mono text-xs text-muted">{k.prefix}…</p>
                  <p className="col-span-2 mt-1.5 flex flex-wrap gap-x-4 text-[13px] text-muted"><span><b className="font-semibold tabular-nums text-white">{fmt(k.periodRequests)}</b> req.</span><span><b className="font-semibold tabular-nums text-white">{fmt(k.periodErrors)}</b> err.</span><span>{ago(k.lastUsedAt)}</span></p>
                </li>))}
            </ul>)}
        </section>

        <Panel className="flex flex-col gap-3 rounded-[20px] p-4">
          <SectionLabel>Utiliser une clé</SectionLabel>
          <p className="text-[13px] text-muted">Envoyez la clé dans l’en-tête <code className="font-mono text-soft">X-API-Key</code>. Pour l’instant, une seule route existe : elle vérifie la clé et compte comme une requête.</p>
          <div role="tablist" aria-label="Langage" className="flex items-center gap-1.5">
            {(Object.keys(SNIPPETS) as (keyof typeof SNIPPETS)[]).map((l) => <button key={l} role="tab" aria-selected={lang === l} type="button" onClick={() => setLang(l)} className={`h-8 rounded-full border px-3 text-[13px] transition-colors ${lang === l ? 'border-line-strong bg-hover text-white' : 'border-line text-muted hover:text-white'}`}>{SNIPPET_LABEL[l]}</button>)}
            <Button size="sm" className="ml-auto rounded-full" onClick={() => void copy(SNIPPETS[lang](), 'code')}>{copied === 'code' ? <Check size={14} /> : <Copy size={14} />}{copied === 'code' ? 'Copié' : 'Copier'}</Button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-line bg-[#0d0d0f] p-3.5 font-mono text-xs leading-relaxed text-accent-soft"><code>{SNIPPETS[lang]()}</code></pre>
          <p className="text-xs text-muted">Gardez la clé côté serveur, jamais dans une application mobile ou une page publique.</p>
        </Panel>
      </>)}
      {creating && <CreateKey onClose={() => setCreating(false)} onCreated={(k) => { setCreating(false); setCreated(k); void reload(); }} />}
      {created && <KeyReveal value={created} onClose={() => setCreated(null)} />}
      {revoking && <Revoke k={revoking} onClose={() => setRevoking(null)} onDone={() => { setRevoking(null); void reload(); }} />}
    </div>
  );
}

const ORIGIN = () => (typeof window === 'undefined' ? 'https://VOTRE-DOMAINE' : window.location.origin);
const SNIPPET_LABEL = { curl: 'curl', js: 'JavaScript', py: 'Python' } as const;
const SNIPPETS = {
  curl: () => `curl -H "X-API-Key: $MEDIA_HUB_KEY" \\\n  ${ORIGIN()}/api/v1/status`,
  js: () => `const res = await fetch("${ORIGIN()}/api/v1/status", {\n  headers: { "X-API-Key": process.env.MEDIA_HUB_KEY },\n});\nconsole.log(await res.json());`,
  py: () => `import os, requests\n\nr = requests.get(\n    "${ORIGIN()}/api/v1/status",\n    headers={"X-API-Key": os.environ["MEDIA_HUB_KEY"]},\n)\nprint(r.json())`,
};

function CreateKey({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Donnez un nom à la clé.'); return; }
    setBusy(true); setErr(null);
    try { const r = await api<{ key: string }>('POST', '/keys', { name: name.trim() }); onCreated(r.key); }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Erreur'); setBusy(false); }
  }
  return (
    <Modal title="Nouvelle clé API" onClose={onClose}>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4" noValidate>
        <Field label="Nom" placeholder="Ex. Application mobile" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoFocus hint="Pour reconnaître la clé dans la liste." />
        {err && <Alert title="Création impossible">{err}</Alert>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" variant="primary" loading={busy}>Créer la clé</Button></div>
      </form>
    </Modal>
  );
}

function KeyReveal({ value, onClose }: { value: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(value); setCopied(true); } catch { setCopied(false); } }
  return (
    <Modal title="Clé créée" onClose={onClose}>
      <div className="mt-3 flex flex-col gap-3">
        <Alert kind="info" title="Copiez-la maintenant">Cette clé ne sera plus jamais affichée. Seule une empreinte est conservée.</Alert>
        {isDemo && value === DEMO_KEY_NOTICE && <p className="text-[13px] text-danger">Aperçu : clé factice, elle ne fonctionne pas.</p>}
        <code className="select-all break-all rounded-md border border-line bg-bg p-3 font-mono text-xs">{value}</code>
        <div className="flex justify-end gap-2"><Button onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copiée' : 'Copier'}</Button><Button variant="primary" onClick={onClose}>J’ai copié la clé</Button></div>
      </div>
    </Modal>
  );
}

function Revoke({ k, onClose, onDone }: { k: KeyItem; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go() { setBusy(true); try { await api('DELETE', `/keys/${k.id}`); onDone(); } catch (x) { setErr(x instanceof ApiError ? x.message : 'Erreur'); setBusy(false); } }
  return (
    <Modal title={`Révoquer « ${k.name} » ?`} onClose={onClose}>
      <p className="mt-2 text-sm text-muted">Les applications qui utilisent cette clé recevront une erreur 401 immédiatement. Action irréversible.</p>
      {err && <div className="mt-3"><Alert title="Échec">{err}</Alert></div>}
      <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="danger" loading={busy} onClick={go}>Révoquer la clé</Button></div>
    </Modal>
  );
}
