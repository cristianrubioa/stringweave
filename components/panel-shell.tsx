"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Off-canvas side panel below `md`, static side panel at `md`+.
// Mirrors the pattern already shipped in erdos/index.html (same --panel-w,
// --header-h variables): fixed + translate-x below md, static above it.
export function PanelShell({ open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-x-0 bottom-0 z-30 bg-black/50 md:hidden"
          style={{ top: "var(--header-h, 4rem)" }}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col gap-5 border-r bg-background px-6 pt-6 shadow-lg transition-transform duration-200 ease-out overflow-y-auto md:static md:inset-auto md:z-auto md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "var(--panel-w, 20rem)", top: "var(--header-h, 4rem)" }}
      >
        {children}
      </aside>
    </>
  );
}
