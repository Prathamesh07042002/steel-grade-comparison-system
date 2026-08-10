import { useState, useEffect } from "react";
import AppShell from "./components/layout/AppShell";
import Landing from "./pages/Landing";
import ManualCompare from "./pages/ManualCompare";
import AutoMatch from "./pages/AutoMatch";
import { loadGA } from "./ga";

const PAGE_COPY = {
  manual: {
    title: "Manual Grade Comparison",
  },
  auto: {
    title: "Automatic Grade Matching",
  },
};

export default function App() {
  const [activePage, setActivePage] = useState("landing");
  const [headerActions, setHeaderActions] = useState(null);
  const [sharedFile, setSharedFile] = useState(null);

  useEffect(() => {
    loadGA("Test Certificate Compliance");
  }, []);

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
