import { useEffect, useRef, useState } from 'react';

const KEY = 'mh_intro_seen';
const EASE = 'cubic-bezier(.2,.8,.2,1)';
const INOUT = 'cubic-bezier(.65,0,.2,1)';
const SPRING = 'cubic-bezier(.16,1.2,.3,1)';

function shouldPlay(): boolean {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (sessionStorage.getItem(KEY)) return false;
  } catch { /* storage indisponible : on joue quand même */ }
  return true;
}
const markSeen = () => { try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } };

/** Écran d'ouverture : une fois par session, passable d'un toucher, jamais joué si l'on demande moins d'animations. */
export function Intro() {
  const [on, setOn] = useState(shouldPlay);
  const root = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const aura = useRef<HTMLDivElement>(null);
  const sweep = useRef<HTMLSpanElement>(null);
  const shock = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const dust = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!on) return;
    const el = { root: root.current!, logo: logo.current!, word: word.current!, aura: aura.current!, sweep: sweep.current!, shock: shock.current!, line: line.current!, tag: tag.current!, skip: skip.current!, dust: dust.current! };
    let dead = false; let raf = 0;
    const timers: number[] = [];
    const A = (e: Element, kf: Keyframe[], o: KeyframeAnimationOptions) => e.animate(kf, { fill: 'both', easing: EASE, ...o });
    const hold = (e: Element, kf: Keyframe) => A(e, [kf, kf], { duration: 1 });
    const letters = Array.from(el.word.querySelectorAll('span'));

    /* poussière de lumière */
    const ctx = el.dust.getContext('2d')!;
    const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.dust.width = w * dpr; el.dust.height = h * dpr; ctx.scale(dpr, dpr);
    const P = Array.from({ length: 56 }, () => ({ x: Math.random() * w, y: Math.random() * h, s: Math.random() * 1.3 + .4, v: Math.random() * .2 + .05, a: Math.random() * .5 + .15, p: Math.random() * 6 }));
    const t0 = performance.now();
    const loop = (t: number) => {
      const k = (t - t0) / 1000; ctx.clearRect(0, 0, w, h);
      for (const p of P) { p.y -= p.v; if (p.y < -4) p.y = h + 4; ctx.fillStyle = `rgba(205,214,255,${p.a * (.6 + .4 * Math.sin(k * 1.4 + p.p))})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.283); ctx.fill(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    hold(el.logo, { transform: 'scale(.78)', opacity: 0, filter: 'blur(16px)' });
    hold(el.aura, { opacity: 0 }); hold(el.sweep, { opacity: 0 }); hold(el.shock, { opacity: 0 });
    letters.forEach((l) => hold(l, { transform: 'translateY(120%)', filter: 'blur(6px)' }));
    hold(el.line, { width: '0px' }); hold(el.tag, { opacity: 0 }); hold(el.skip, { opacity: 0 });

    A(el.dust, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200 });
    A(el.skip, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 700 });
    A(el.logo, [{ transform: 'scale(.78)', opacity: 0, filter: 'blur(16px)' }, { opacity: 1, offset: .5, filter: 'blur(4px)' }, { transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }], { duration: 1100, delay: 300, easing: SPRING });
    A(el.aura, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1400, delay: 300 });
    A(el.sweep, [{ opacity: 0, backgroundPosition: '130% 0' }, { opacity: 1, backgroundPosition: '130% 0', offset: .02 }, { opacity: 1, backgroundPosition: '-30% 0' }], { duration: 900, delay: 950, easing: INOUT });
    A(el.shock, [{ opacity: 0, transform: 'scale(1)' }, { opacity: .9, transform: 'scale(1)', offset: .02 }, { opacity: 0, transform: 'scale(2.6)' }], { duration: 1000, delay: 1450, easing: 'cubic-bezier(.15,.6,.3,1)' });
    A(el.logo, [{ transform: 'scale(1)' }, { transform: 'scale(1.045)' }, { transform: 'scale(1)' }], { duration: 520, delay: 1450, fill: 'forwards', composite: 'replace' });
    letters.forEach((l, i) => A(l, [{ transform: 'translateY(120%)', filter: 'blur(6px)' }, { transform: 'translateY(0)', filter: 'blur(0)' }], { duration: 720, delay: 1700 + i * 45 }));
    A(el.line, [{ width: '0px' }, { width: '150px' }], { duration: 800, delay: 2150, easing: INOUT });
    A(el.tag, [{ opacity: 0, letterSpacing: '.34em' }, { opacity: 1, letterSpacing: '.2em' }], { duration: 850, delay: 2300 });

    const leave = () => {
      if (dead) return; dead = true; cancelAnimationFrame(raf);
      const target = document.getElementById('mh-logo-target');
      const done = () => { markSeen(); setOn(false); if (target) target.style.visibility = ''; };
      const fade = (kf: Keyframe[], o: KeyframeAnimationOptions) => A(el.root, kf, o);
      [el.word, el.line, el.tag, el.skip, el.dust, el.aura].forEach((e) => A(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, composite: 'replace' }));
      if (!target) { fade([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).finished.then(done, done); return; }
      const mr = el.logo.getBoundingClientRect(), tr = target.getBoundingClientRect();
      const dx = tr.left + tr.width / 2 - (mr.left + mr.width / 2), dy = tr.top + tr.height / 2 - (mr.top + mr.height / 2), sc = tr.width / mr.width;
      const fl = A(el.logo, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx}px,${dy}px) scale(${sc})` }], { duration: 860, easing: INOUT, composite: 'replace' });
      A(el.root, [{ backgroundColor: 'rgba(10,10,10,1)' }, { backgroundColor: 'rgba(10,10,10,0)' }], { duration: 640, delay: 260 });
      fl.finished.then(done, done);
    };
    el.root.addEventListener('click', leave);
    timers.push(window.setTimeout(leave, 3000));
    return () => { dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); el.root.removeEventListener('click', leave); };
  }, [on]);

  /* le logo du header reste caché pendant le vol */
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => { const x = document.getElementById('mh-logo-target'); if (x) x.style.visibility = 'hidden'; }, 50);
    return () => clearInterval(t);
  }, [on]);

  if (!on) return null;
  const mask = 'url(/logo-512.png) center/contain no-repeat';
  return (
    <div ref={root} role="presentation" aria-hidden="true" className="fixed inset-0 z-[100] grid cursor-pointer place-items-center overflow-hidden bg-bg">
      <canvas ref={dust} className="absolute inset-0 h-full w-full" />
      <div ref={aura} className="absolute left-1/2 top-1/2 -ml-[210px] -mt-[240px] h-[420px] w-[420px] rounded-full" style={{ background: 'radial-gradient(closest-side,rgba(154,166,255,.3),rgba(154,166,255,.07) 55%,transparent)' }} />
      <div className="relative flex flex-col items-center gap-6">
        <div ref={logo} className="relative h-[132px] w-[132px]">
          <span ref={shock} className="absolute left-1/2 top-1/2 -ml-[66px] -mt-[66px] h-[132px] w-[132px] rounded-[34px] border border-[rgba(200,210,255,.7)]" />
          <img src="/logo-512.png" alt="" className="absolute inset-0 h-full w-full" />
          <span ref={sweep} className="absolute inset-0 mix-blend-screen" style={{ WebkitMask: mask, mask, backgroundImage: 'linear-gradient(105deg,transparent 38%,rgba(255,255,255,.95) 50%,transparent 62%)', backgroundSize: '300% 100%', backgroundPosition: '130% 0' }} />
        </div>
        <div ref={word} className="flex overflow-hidden px-0.5 pb-1.5 text-[30px] font-bold tracking-[-0.04em]">
          {[...'Media Hub'].map((c, i) => <span key={i} className="inline-block">{c === ' ' ? ' ' : c}</span>)}
        </div>
        <div ref={line} className="h-px bg-gradient-to-r from-transparent via-[#d9dce6] to-transparent" />
        <div ref={tag} className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted">Téléchargez, simplement</div>
      </div>
      <button ref={skip} type="button" className="absolute bottom-[max(20px,env(safe-area-inset-bottom))] right-5 h-8 rounded-full border border-line bg-white/5 px-3.5 text-xs text-muted">Passer</button>
    </div>
  );
}
