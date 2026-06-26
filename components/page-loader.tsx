"use client";

import { useState, useEffect } from "react";

export function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setFading(true);
    const timer = setTimeout(() => setVisible(false), 250);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-background flex items-center justify-center transition-opacity duration-200 ${fading ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      aria-hidden
    >
      <i className="fa-solid fa-circle-notch fa-spin text-3xl opacity-40" />
    </div>
  );
}
