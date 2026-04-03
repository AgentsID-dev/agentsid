import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CodeTab {
  readonly label: string;
  readonly language: string;
  readonly code: string;
}

interface CodeTabsProps {
  readonly tabs: readonly CodeTab[];
  readonly className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CodeTabs({ tabs, className = "" }: CodeTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeTab = tabs[activeIndex];

  const handleCopy = () => {
    const cleaned = activeTab.code
      .replace(/^\$\s*/gm, "")
      .replace(/^>\s*/gm, "")
      .trim();
    navigator.clipboard.writeText(cleaned).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`mb-5 ${className}`}>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border bg-muted rounded-t-lg px-3">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => {
              setActiveIndex(i);
              setCopied(false);
            }}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              i === activeIndex
                ? "text-primary border-b-primary"
                : "text-muted-foreground border-b-transparent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="relative group">
        <pre className="bg-[#1e1e2a] text-[#e4e4ef] rounded-b-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto">
          <code>{activeTab.code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className={`absolute top-2 right-2 px-2.5 py-1 text-xs rounded border transition-colors opacity-0 group-hover:opacity-100 ${
            copied
              ? "text-green-500 border-green-500 bg-[#1e1e2a]"
              : "text-muted-foreground border-border bg-card hover:text-foreground hover:border-primary"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export { CodeTabs };
export type { CodeTab, CodeTabsProps };
