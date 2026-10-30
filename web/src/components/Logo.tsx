/** Logo Media Hub (fichier fourni par le propriétaire, détouré sur fond transparent). */
export function Logo({ size = 28, id }: { size?: number; id?: string }) {
  return <img id={id} src="/logo-192.png" width={size} height={size} alt="Logo Media Hub" decoding="async" className="shrink-0 select-none" draggable={false} style={{ width: size, height: size }} />;
}
