// ─── Onboarding Wizard ───
// Shown when user has 0 agents

import { useState, useCallback } from "react";

interface OnboardingWizardProps {
  readonly apiKey: string;
}

const INSTALL_COMMANDS: Record<string, string> = {
  npm: "npm install @agentsid/sdk",
  pip: "pip install agentsid",
  gem: "gem install agentsid",
  maven:
    '<dependency>\n  <groupId>dev.agentsid</groupId>\n  <artifactId>agentsid-sdk</artifactId>\n</dependency>',
};

const AI_PROMPTS = [
  "I just signed up for AgentsID (agentsid.dev). Help me install the TypeScript SDK, register my first agent with permissions for search and save, and add the validation middleware to my MCP server. My API key is [paste key].",
  "I have an MCP server built with FastMCP in Python. Help me add AgentsID authentication so each tool call is validated against per-tool permissions. I want search tools allowed but delete tools blocked.",
  "I'm building a multi-agent system with LangChain. I need each agent to have its own identity with AgentsID, scoped permissions, and a delegation chain back to the user who authorized it. Walk me through the setup.",
];

function OnboardingWizard({ apiKey }: OnboardingWizardProps) {
  const [activeInstall, setActiveInstall] = useState("npm");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

  const copyKey = useCallback(() => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  }, [apiKey]);

  const copyPrompt = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPromptIndex(index);
      setTimeout(() => setCopiedPromptIndex(null), 2000);
    });
  }, []);

  return (
    <div className="max-w-[720px] mx-auto py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to AgentsID
        </h2>
        <p className="text-muted-foreground text-base">
          Let's get your first agent protected in 5 minutes.
        </p>
      </div>

      {/* Step 1: API Key */}
      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-amber-600 text-white flex items-center justify-center text-[13px] font-bold shrink-0">
            1
          </span>
          <h3 className="text-base font-semibold">Copy your API key</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-3">
          Your project key is saved in your browser. You'll need it to connect
          your AI tools.
        </p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 bg-background border border-border rounded-lg px-3.5 py-2.5 font-mono text-[13px] text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
            {apiKey}
          </code>
          <button
            onClick={copyKey}
            className="px-4 py-2 bg-gradient-to-br from-primary to-amber-600 text-white rounded-lg text-[13px] font-semibold whitespace-nowrap hover:shadow-md transition-shadow"
          >
            {copiedKey ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Step 2: Install SDK */}
      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-amber-600 text-white flex items-center justify-center text-[13px] font-bold shrink-0">
            2
          </span>
          <h3 className="text-base font-semibold">Install the SDK</h3>
        </div>
        <div className="flex gap-2 flex-wrap mb-3">
          {Object.keys(INSTALL_COMMANDS).map((pkg) => (
            <button
              key={pkg}
              onClick={() => setActiveInstall(pkg)}
              className={`px-3.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                activeInstall === pkg
                  ? "bg-background border-border"
                  : "bg-card border-border hover:bg-background"
              }`}
            >
              {pkg}
            </button>
          ))}
        </div>
        <code className="block bg-background border border-border rounded-lg px-3.5 py-2.5 font-mono text-[13px] text-foreground whitespace-pre-wrap">
          {INSTALL_COMMANDS[activeInstall]}
        </code>
      </div>

      {/* Step 3: Register agent */}
      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-amber-600 text-white flex items-center justify-center text-[13px] font-bold shrink-0">
            3
          </span>
          <h3 className="text-base font-semibold">Register your first agent</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-3">
          Use the CLI or paste this code into your project:
        </p>
        <pre className="bg-background border border-border rounded-lg p-3.5 font-mono text-xs leading-relaxed text-foreground overflow-x-auto m-0">
          <span className="text-amber-400">import</span>
          {" { AgentsID } "}
          <span className="text-amber-400">from</span>{" "}
          <span className="text-green-600">'@agentsid/sdk'</span>;{"\n\n"}
          <span className="text-amber-400">const</span> aid ={" "}
          <span className="text-amber-400">new</span>{" "}
          <span className="text-blue-600">AgentsID</span>
          {"({ projectKey: "}
          <span className="text-green-600">'YOUR_KEY'</span>
          {" });\n\n"}
          <span className="text-amber-400">const</span>
          {" { agent, token } = "}
          <span className="text-amber-400">await</span> aid.
          <span className="text-blue-600">registerAgent</span>
          {"({\n"}
          {"  name: "}
          <span className="text-green-600">'my-first-agent'</span>,{"\n"}
          {"  onBehalfOf: "}
          <span className="text-green-600">'user_123'</span>,{"\n"}
          {"  permissions: ["}
          <span className="text-green-600">'search_*'</span>,{" "}
          <span className="text-green-600">'save_memory'</span>],{"\n"}
          {"});"}
        </pre>
      </div>

      {/* Step 4: AI Prompts */}
      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-amber-600 text-white flex items-center justify-center text-[13px] font-bold shrink-0">
            {"\uD83D\uDCA1"}
          </span>
          <h3 className="text-base font-semibold">Need help? Ask your AI</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Paste any of these prompts into Claude, ChatGPT, or Codex to get help
          setting up:
        </p>
        <div className="flex flex-col gap-2.5">
          {AI_PROMPTS.map((prompt, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-lg px-3.5 py-3 flex items-center justify-between gap-3"
            >
              <p className="text-[13px] text-foreground leading-snug flex-1 m-0">
                "{prompt}"
              </p>
              <button
                onClick={() => copyPrompt(prompt, i)}
                className="px-3 py-1.5 bg-card border border-border rounded-md text-[11px] text-muted-foreground whitespace-nowrap shrink-0 hover:border-primary/30 transition-colors"
              >
                {copiedPromptIndex === i ? "Copied!" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Docs link */}
      <div className="text-center mt-6">
        <a
          href="/docs"
          className="text-primary text-sm font-medium no-underline hover:underline"
        >
          Read the full documentation {"\u2192"}
        </a>
      </div>
    </div>
  );
}

export { OnboardingWizard };
