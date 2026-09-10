"use client";

interface Props {
  panelOpen: boolean;
  onTogglePanel: () => void;
}

export function Header({ panelOpen, onTogglePanel }: Props) {
  return (
    <header
      className="border-b px-6 shrink-0 flex items-center gap-3"
      style={{ height: "var(--header-h, 4rem)" }}
    >
      <button
        type="button"
        aria-label="Toggle menu"
        aria-expanded={panelOpen}
        onClick={onTogglePanel}
        className="md:hidden -ml-1 p-1 text-lg text-foreground"
      >
        <i className="fa-solid fa-bars" />
      </button>
      <i className="fa-solid fa-dharmachakra text-2xl text-primary" />
      <span
        className="font-semibold tracking-wide leading-none"
        style={{ fontSize: "var(--app-name-size, 1.75rem)" }}
      >
        StringWeave
      </span>
      <span className="hidden md:inline text-sm text-muted-foreground font-normal">
        Art Generator
      </span>
      <a className="crubio-home-link" href="https://crubio.fyi">
        crubio.fyi
      </a>
    </header>
  );
}
