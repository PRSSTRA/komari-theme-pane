export function SiteNoticeBanner({ notice }: { notice: string }) {
  if (!notice.trim()) return null;
  return (
    <p className="sg-panel relative z-10 mb-4 flex items-start gap-2 rounded-xl px-4 py-2.5 text-xs text-[var(--sg-muted-fg)] whitespace-pre-wrap">
      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--sg-accent-ink)]" />
      <span className="min-w-0 break-words">{notice.trim()}</span>
    </p>
  );
}
