import { AppTabs } from "@/components/app-tabs";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <div className="flex flex-col" style={{ height: "100dvh" }}>
      <Header />
      <main
        className="overflow-hidden"
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
      >
        <AppTabs />
      </main>
    </div>
  );
}
