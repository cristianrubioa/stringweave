"use client";

import { useEffect, useRef } from "react";

interface Props {
  href: string;
}

// Loads a stylesheet non-blocking (media="print" until the resource is
// ready) without racing React's hydration. The swap runs in useEffect,
// which only fires after hydration is committed, so there's no window
// where a fast cache hit could flip the attribute before React's hydration
// diff inspects it. `link.sheet` is checked directly (not just a "load"
// listener) because on a cache hit the resource may already be loaded by
// the time this effect runs, and the "load" event only fires once.
export function DeferredStylesheet({ href }: Props) {
  const ref = useRef<HTMLLinkElement>(null);

  useEffect(() => {
    const link = ref.current;
    if (!link) return;
    const activate = () => {
      link.media = "all";
    };
    if (link.sheet) {
      activate();
      return;
    }
    link.addEventListener("load", activate, { once: true });
    return () => link.removeEventListener("load", activate);
  }, []);

  return <link ref={ref} rel="stylesheet" href={href} media="print" />;
}
