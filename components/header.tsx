export function Header() {
  return (
    <header className="border-b px-6 h-[var(--header-h)] shrink-0 flex items-center gap-3">
      <i className="fa-solid fa-dharmachakra text-2xl text-primary" />
      <span className="text-[var(--app-name-size)] font-semibold tracking-wide leading-none">
        StringWeave
      </span>
      <span className="text-sm text-muted-foreground font-normal">Art Generator</span>
    </header>
  );
}
