export function Header() {
  return (
    <header className="border-b px-6 shrink-0 flex items-center gap-3" style={{ height: 'var(--header-h, 4rem)' }}>
      <i className="fa-solid fa-dharmachakra text-2xl text-primary" />
      <span className="font-semibold tracking-wide leading-none" style={{ fontSize: 'var(--app-name-size, 1.75rem)' }}>
        StringWeave
      </span>
      <span className="text-sm text-muted-foreground font-normal">Art Generator</span>
    </header>
  );
}
