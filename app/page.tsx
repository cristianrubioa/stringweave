"use client";

import { useState } from "react";
import { AppTabs } from "@/components/app-tabs";
import { Header } from "@/components/header";

export default function Home() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex flex-col" style={{ height: "100dvh" }}>
      <Header
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />
      <main
        className="overflow-hidden"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <AppTabs
          panelOpen={panelOpen}
          onClosePanel={() => setPanelOpen(false)}
        />
      </main>
    </div>
  );
}
