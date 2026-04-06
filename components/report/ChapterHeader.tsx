interface ChapterHeaderProps {
  number: number;
  title: string;
  subtitle?: string;
}

export default function ChapterHeader({ number, title, subtitle }: ChapterHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-5 pt-2">
      <span className="font-mono text-[10px] text-fg-dim tracking-[2px] border border-border-subtle px-2 py-0.5">
        CH.{String(number).padStart(2, '0')}
      </span>
      <div>
        <h2 className="font-mono text-[11px] text-fg-bright tracking-[3px] uppercase">{title}</h2>
        {subtitle && <p className="text-[11px] text-fg-dim mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 border-t border-border-subtle" />
    </div>
  );
}
