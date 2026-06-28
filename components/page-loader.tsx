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
      className={`crubio-loader bg-background ${fading ? "fade-out" : ""}`}
      aria-hidden
    >
      <i className="fa-solid fa-circle-notch fa-spin" />
    </div>
  );
}
