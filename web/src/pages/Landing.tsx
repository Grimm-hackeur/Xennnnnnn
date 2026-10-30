import { Link } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, Smartphone } from 'lucide-react';

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'Recherche musicale'];
const STEPS = [
  ['Créez votre compte', 'Email, mot de passe, ou Google en un toucher.'],
  ['Collez le lien', 'Copiez-le depuis l’application, puis collez-le dans l’outil.'],
  ['Choisissez le format', 'Media Hub propose les formats disponibles. Vous récupérez le bon.'],
];
const SECURITY: [typeof Lock, string, string][] = [
  [Lock, 'Mot de passe protégé', 'Jamais stocké en clair, jamais affiché.'],
  [Mail, 'Email vérifié', 'Un code à six chiffres confirme votre adresse.'],
  [Smartphone, 'Double authentification', 'En option, avec votre application d’authentification.'],
];
const kick = 'font-mono text-[11px] uppercase tracking-[0.14em] text-muted';
const pill = 'inline-flex h-[50px] items-center justify-center rounded-full px-6 text-[15px] font-semibold transition-colors';

export function Landing() {
  return (
    <div className="flex flex-col">
      <section className="grid gap-7 pb-12 md:grid-cols-[1.15fr_.85fr] md:items-center md:gap-10 md:pb-20 md:pt-6">
        <div>
          <div className={`${kick} mh-rise`}>Vidéo · Audio · Un seul lien</div>
          <h1 className="mh-rise mt-3.5 bg-gradient-to-b from-white from-20% to-[#a9adbd] bg-clip-text text-[clamp(2.3rem,9.5vw,4.4rem)] font-bold leading-[1.02] tracking-[-0.045em] text-transparent [text-wrap:balance]" style={{ ['--d' as string]: 1 }}>Collez un lien.<br />Récupérez le fichier.</h1>
          <p className="mh-rise mt-4 max-w-[44ch] text-[17px] leading-relaxed text-muted" style={{ ['--d' as string]: 2 }}>Media Hub réunit vos téléchargements TikTok, Instagram, Facebook et la recherche musicale dans un espace personnel, simple à utiliser sur téléphone.</p>
          <div className="mh-rise mt-6 flex flex-wrap gap-2.5" style={{ ['--d' as string]: 3 }}>
            <Link to="/inscription" className={`${pill} bg-white text-black hover:bg-neutral-200`}>Créer un compte</Link>
            <Link to="/connexion" className={`${pill} border border-line bg-panel text-white hover:bg-hover`}>J’ai déjà un compte</Link>
          </div>
          <p className="mh-rise mt-3.5 text-[13px] text-muted" style={{ ['--d' as string]: 4 }}>Les outils s’ouvrent dès que votre compte est créé et votre email confirmé.</p>
        </div>
        <div className="mh-rise relative grid min-h-[270px] place-items-center" style={{ ['--d' as string]: 2 }} aria-hidden="true">
          <div className="mh-breathe absolute aspect-square w-[300px] rounded-full blur-[6px]" style={{ background: 'radial-gradient(closest-side,rgba(154,166,255,.22),rgba(154,166,255,.05) 60%,transparent)' }} />
          <img src="/logo-512.png" alt="" className="mh-float relative h-auto w-[min(58vw,250px)] drop-shadow-[0_20px_40px_rgba(0,0,0,.6)]" />
        </div>
      </section>

      <section className="border-t border-line py-10">
        <div className={kick}>Plateformes prises en charge</div>
        <div className="mt-5 flex flex-wrap gap-2.5">{PLATFORMS.map((p) => <span key={p} className="inline-flex h-[42px] items-center gap-2.5 rounded-full border border-line bg-panel px-[18px] text-[15px]"><i className="h-[7px] w-[7px] rounded-full bg-[#d9dce6]" />{p}</span>)}</div>
      </section>

      <section id="fonctionnement" className="border-t border-line py-10">
        <div className={kick}>Fonctionnement</div>
        <h2 className="mt-2.5 max-w-[20ch] text-[clamp(1.5rem,5.5vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.035em] [text-wrap:balance]">Trois gestes, rien d’autre.</h2>
        <ol className="mt-6 grid gap-0 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t border-line py-[18px] first:border-t-0 md:border-l md:border-t-0 md:py-0 md:pl-6 md:first:border-l-0 md:first:pl-0">
              <em className="mb-2 block font-mono text-[11px] not-italic tracking-[0.1em] text-accent">ÉTAPE {i + 1}</em>
              <b className="block text-[17px] tracking-[-0.02em]">{t}</b><span className="text-[15px] text-muted">{d}</span>
            </li>))}
        </ol>
      </section>

      <section className="border-t border-line py-10">
        <div className={kick}>Après votre inscription</div>
        <div className="mt-5 grid gap-6 md:grid-cols-2 md:items-center md:gap-10">
          <div>
            <h2 className="max-w-[20ch] text-[clamp(1.5rem,5.5vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.035em] [text-wrap:balance]">Les outils vous attendent derrière la porte.</h2>
            <p className="mt-3.5 max-w-[44ch] text-[17px] leading-relaxed text-muted">Ils sont réservés aux membres. Chaque compte garde son historique et ses réglages en un seul endroit.</p>
          </div>
          <div className="relative overflow-hidden rounded-[22px] border border-line bg-panel p-[18px]" role="img" aria-label="Aperçu verrouillé des outils">
            <div className="flex h-[46px] items-center rounded-full border border-line bg-bg px-4 text-sm text-[#55555e] blur-[1.5px]">Coller un lien…</div>
            {[0, 1].map((i) => <div key={i} className="mt-3 flex items-center gap-3 opacity-80 blur-[5px]"><span className="h-[52px] w-[52px] rounded-xl bg-hover" /><span className="grid flex-1 gap-2"><i className="block h-[9px] rounded bg-line" /><i className="block h-[9px] w-[55%] rounded bg-line" /></span></div>)}
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-bg/15 to-bg/70">
              <div className="flex flex-col items-center gap-3 px-5 text-center"><Lock size={30} strokeWidth={1.7} /><p className="max-w-[22ch] font-semibold leading-snug">Créez un compte pour ouvrir les outils</p>
                <Link to="/inscription" className="inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-black hover:bg-neutral-200">Créer un compte</Link></div>
            </div>
          </div>
        </div>
      </section>

      <section id="securite" className="border-t border-line py-10">
        <div className={kick}>Sécurité</div>
        <h2 className="mt-2.5 max-w-[20ch] text-[clamp(1.5rem,5.5vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.035em] [text-wrap:balance]">Votre compte reste le vôtre.</h2>
        <div className="mt-5 grid gap-3.5 md:grid-cols-3">
          {SECURITY.map(([Icon, t, d]) => <div key={t} className="flex items-start gap-3.5"><Icon size={22} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[#d9dce6]" aria-hidden /><p><b className="block font-semibold">{t}</b><span className="text-[15px] text-muted">{d}</span></p></div>)}
        </div>
      </section>

      <section className="border-t border-line py-12">
        <div className={`${kick} flex items-center gap-2`}><ShieldCheck size={14} aria-hidden />Prêt ?</div>
        <h2 className="mt-2.5 max-w-[16ch] text-[clamp(1.5rem,5.5vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.035em] [text-wrap:balance]">Créez votre compte en une minute.</h2>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link to="/inscription" className={`${pill} bg-white text-black hover:bg-neutral-200`}>Créer un compte</Link>
          <Link to="/connexion" className={`${pill} border border-line bg-panel text-white hover:bg-hover`}>Connexion</Link>
        </div>
      </section>
    </div>
  );
}
