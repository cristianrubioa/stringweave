"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { GenerateTab } from "@/components/generate-tab";
import { PlayerTab } from "@/components/player-tab";

type SharedSequence = { sequence: number[]; pinCount: number };

export function AppTabs() {
  const [activeTab, setActiveTab] = useState("generate");
  const [sharedSequence, setSharedSequence] = useState<SharedSequence | null>(null);

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      style={{ display: "flex", flex: 1, minHeight: 0 }}
    >
      <TabsContent
        value="generate"
        keepMounted
        style={{ display: "flex", flex: 1, minHeight: 0 }}
      >
        <GenerateTab onSequenceReady={setSharedSequence} />
      </TabsContent>
      <TabsContent
        value="player"
        keepMounted
        style={{ display: "flex", flex: 1, minHeight: 0 }}
      >
        <PlayerTab
          sharedSequence={sharedSequence}
          onClearSequence={() => setSharedSequence(null)}
        />
      </TabsContent>
    </Tabs>
  );
}
