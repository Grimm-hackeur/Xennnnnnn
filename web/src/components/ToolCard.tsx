import { Link } from 'react-router-dom';
import { Camera, MonitorPlay, Music2, Smartphone, type LucideIcon } from 'lucide-react';
import type { Tool, ToolId } from '../features/tools';

export const TOOL_ICON: Record<ToolId, LucideIcon> = { tiktok: Smartphone, instagram: Camera, facebook: MonitorPlay, music: Music2 };

export const ToolIcon = ({ id, size = 42 }: { id: ToolId; size?: number }) => {
  const Icon = TOOL_ICON[id];
  return <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-[13px] border border-line bg-gradient-to-br from-[#1d1d22] to-[#111] text-[#e8eaf5]"><Icon size={Math.round(size * 0.5)} strokeWidth={1.75} aria-hidden /></span>;
};

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link to={`/outils/${tool.id}`} className="flex min-h-[132px] flex-col justify-between gap-5 rounded-[18px] border border-line bg-panel p-3.5 transition-colors hover:border-line-strong hover:bg-hover md:min-h-[150px] md:p-5">
      <ToolIcon id={tool.id} />
      <span><span className="block font-semibold tracking-[-0.01em]">{tool.name}</span><span className="block text-[13px] text-muted">{tool.tagline}</span></span>
    </Link>
  );
}
