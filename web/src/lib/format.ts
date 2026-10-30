/** « Il y a 4 min », « Il y a 3 h »… à partir d'une date ISO. */
export function ago(iso: string | null, never = 'Jamais'): string {
  if (!iso) return never;
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'À l’instant';
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)} h`;
  return `Il y a ${Math.floor(s / 86400)} j`;
}
export const duration = (ms: number | null) => { if (!ms) return ''; const t = Math.round(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
