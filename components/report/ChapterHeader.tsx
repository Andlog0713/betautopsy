interface ChapterHeaderProps {
  number: number;
  title: string;
  subtitle?: string;
}

export default function ChapterHeader({ number, title, subtitle }: ChapterHeaderProps) {
  return (
    <div className="pt-4 pb-3 mb-4 border-b border-border-subtle">
      <p className="text-xs text-scalpel tracking-widest uppercase font-medium font-mono mb-1">
        {String(number).padStart(2, '0')}
      </p>
      <h2 className="text-lg font-semibold tracking-tight text-fg-bright">{title}</h2>
      {subtitle && <p className="text-xs text-fg-muted mt-1">{subtitle}</p>}
    </div>
  );
}
