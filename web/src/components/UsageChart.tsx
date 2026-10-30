import { useId, useState } from 'react';

export interface Point { t: string; requests: number; errors: number }

/** Graphique en barres SVG sans dépendance : requêtes (dégradé) avec les erreurs en rouge. Le pic est marqué ; toucher une barre en affiche les valeurs exactes. */
export function UsageChart({ points, range }: { points: Point[]; range: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const id = useId();
  const W = 340, H = 170, padL = 34, padB = 22, padT = 10;
  const ch = H - padB - padT;
  const max = Math.max(1, ...points.map((p) => p.requests));
  const nice = (() => { const m = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / m) * m; })();
  const bw = (W - padL) / Math.max(1, points.length);
  const label = (t: string) => { const d = new Date(t); return range === '24h' ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); };
  const peak = points.reduce((m, p, i) => (p.requests > (points[m]?.requests ?? -1) ? i : m), 0);
  const cur = Math.min(sel ?? peak, Math.max(0, points.length - 1));
  const h = points[cur];
  const every = Math.ceil(points.length / 5);
  const peakBar = points[peak];
  return (
    <figure className="m-0">
      <div className="mb-2 flex items-baseline justify-between gap-3" aria-live="polite">
        <span className="font-mono text-xs text-muted">{h ? `${label(h.t)}${cur === peak && h.requests > 0 ? ' · pic' : ''}` : '—'}</span>
        <span className="text-[15px] font-semibold tabular-nums">{h ? h.requests.toLocaleString('fr-FR') : 0} req.{h && h.errors > 0 && <em className="ml-1.5 text-[13px] font-normal not-italic text-danger">{h.errors.toLocaleString('fr-FR')} err.</em>}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={id} className="block h-auto w-full">
        <title id={id}>Requêtes sur la période : {points.reduce((s, p) => s + p.requests, 0).toLocaleString('fr-FR')}</title>
        <defs><linearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9aa6ff" /><stop offset="1" stopColor="#454a73" /></linearGradient></defs>
        {[0, 0.5, 1].map((f) => { const y = padT + ch * (1 - f); return (
          <g key={f}><line x1={padL} x2={W} y1={y} y2={y} stroke="#222" /><text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#777" fontFamily="Geist Mono, monospace">{Math.round(nice * f).toLocaleString('fr-FR')}</text></g>); })}
        {points.map((p, i) => {
          const hh = (p.requests / nice) * ch, eh = (p.errors / nice) * ch, x = padL + i * bw;
          return (
            <g key={p.t} onClick={() => setSel(i)} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} tabIndex={0} aria-label={`${label(p.t)} : ${p.requests} requêtes, ${p.errors} erreurs`} style={{ cursor: 'pointer', outline: 'none' }}>
              <rect x={x} y={padT} width={bw} height={ch} fill="transparent" />
              <rect x={x + bw * 0.16} y={padT + ch - hh} width={bw * 0.68} height={Math.max(hh, p.requests ? 1 : 0)} rx="2" fill={i === cur ? '#c9cffc' : `url(#${id}g)`} />
              {p.errors > 0 && <rect x={x + bw * 0.16} y={padT + ch - eh} width={bw * 0.68} height={Math.max(eh, 1.5)} rx="1" fill="#f87171" />}
              {i % every === 0 && <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#777" fontFamily="Geist Mono, monospace">{label(p.t)}</text>}
            </g>);
        })}
        {peakBar && peakBar.requests > 0 && <circle cx={padL + peak * bw + bw / 2} cy={padT + ch - (peakBar.requests / nice) * ch - 6} r="2.5" fill="#f5f5f5" />}
      </svg>
    </figure>
  );
}
