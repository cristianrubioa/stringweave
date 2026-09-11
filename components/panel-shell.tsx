"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Off-canvas side panel below `md`, static side panel at `md`+.
// Mirrors the pattern already shipped in erdos/index.html (same --panel-w,
// --header-h variables): fixed + translate-x below md, static above it.
//
// `footer` renders as a shrink-0 sibling outside the scrollable `children`
// region (crubio-ui's sidebar-footer-convention) so it stays visible on
// mobile regardless of how tall the form content grows.
export function PanelShell({ open, onClose, children, footer }: Props) {
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
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r bg-background shadow-lg transition-transform duration-200 ease-out md:static md:inset-auto md:z-auto md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "var(--panel-w, 20rem)", top: "var(--header-h, 4rem)" }}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-5 overflow-y-auto px-6 pt-6">
          {children}
        </div>
        {footer}
      </aside>
    </>
  );
}
