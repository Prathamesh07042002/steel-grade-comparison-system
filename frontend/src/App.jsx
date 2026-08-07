import { useState } from "react";
import AppShell from "./components/layout/AppShell";
import Landing from "./pages/Landing";
import ManualCompare from "./pages/ManualCompare";
import AutoMatch from "./pages/AutoMatch";

const PAGE_COPY = {
  manual: {
    title: "Manual Grade Comparison",
    subtitle: "Upload a test certificate, pick a standard, compare properties.",
  },
  auto: {
    title: "Automatic Grade Matching",
    subtitle: "Upload a test certificate and let AI find the closest standard.",
  },
};

export default function App() {
  const [activePage, setActivePage] = useState("landing");
  const [headerActions, setHeaderActions] = useState(null);
  const [sharedFile, setSharedFile] = useState(null);

  const navigate = (page, file) => {
    setHeaderActions(null);
    if (file) setSharedFile(file);
    setActivePage(page);
  };

  if (activePage === "landing") {
    return <Landing onNavigate={navigate} />;
  }

  const copy = PAGE_COPY[activePage];

  return (
    <AppShell
      activePage={activePage}
      onNavigate={navigate}
      title={copy.title}
      subtitle={copy.subtitle}
      actions={headerActions}
    >
      {activePage === "manual" && (
        <ManualCompare initialFile={sharedFile} onFileChange={setSharedFile} />
      )}
      {activePage === "auto" && (
        <AutoMatch
          onHeaderActionsChange={setHeaderActions}
          initialFile={sharedFile}
          onFileChange={setSharedFile}
        />
      )}
    </AppShell>
  );
}
