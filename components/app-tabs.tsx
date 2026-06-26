"use client";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { GenerateTab } from "@/components/generate-tab";
import { PlayerTab } from "@/components/player-tab";

export function AppTabs() {
  return (
    <Tabs
      defaultValue="generate"
      style={{ display: "flex", flex: 1, minHeight: 0 }}
    >
      <TabsContent
        value="generate"
        style={{ display: "flex", flex: 1, minHeight: 0 }}
      >
        <GenerateTab />
      </TabsContent>
      <TabsContent
        value="player"
        style={{ display: "flex", flex: 1, minHeight: 0 }}
      >
        <PlayerTab />
      </TabsContent>
    </Tabs>
  );
}
