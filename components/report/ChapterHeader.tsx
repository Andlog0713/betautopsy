interface ChapterHeaderProps {
  number: number;
  title: string;
  subtitle?: string;
}

export default function ChapterHeader({ number, title, subtitle }: ChapterHeaderProps) {
  return (
    <div className="py-8 mb-6 border-b border-border-subtle">
      <p className="text-sm text-scalpel tracking-widest uppercase font-medium font-mono mb-2">
        {String(number).padStart(2, '0')}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight text-fg-bright">{title}</h2>
      {subtitle && <p className="text-sm text-fg-muted mt-2">{subtitle}</p>}
    </div>
  );
}
