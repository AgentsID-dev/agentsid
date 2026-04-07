import { FileText, ExternalLink } from "lucide-react";

const PAPERS = [
  {
    title: "Invisible Ink: Unicode Smuggling in MCP Tool Descriptions",
    date: "April 2026",
    abstract:
      "GPT-5.4 follows invisible tag-block instructions embedded in MCP tool descriptions 100% of the time. Claude detects them. Gemini ignores them. No registry, client, or SDK sanitizes these bytes. We scanned 3,471 servers and found 298 hidden codepoints across 63 servers — then demonstrated that replacing benign bytes with weaponized payloads produces a server that scores better on current scanners, not worse.",
    href: "https://github.com/stevenkozeniesky02/agentsid/blob/master/docs/census-2026/invisible-ink.md",
    stats: ["120 LLM trials", "3 models tested", "63 servers flagged"],
  },
  {
    title: "Weaponized by Design: A Census-Scale Analysis of Security Failures in the MCP Ecosystem",
    date: "April 2026",
    abstract:
      "The first census-scale security audit of the MCP ecosystem: 15,982 servers, 40,081 tools, and 137,070 security findings. We document the Complexity Tax (tool count vs. security score is a near-perfect negative correlation), introduce a Toxic Flow taxonomy of five vulnerability classes in tool descriptions, and argue that natural language is a structurally failed authorization layer.",
    href: "https://github.com/stevenkozeniesky02/agentsid/blob/master/docs/census-2026/weaponized-by-design.md",
    stats: ["15,982 servers", "137,070 findings", "72% scored F"],
  },
  {
    title: "The A2A Security Gap: Six Structural Vulnerabilities in the Agent Communication Standard",
    date: "April 2026",
    abstract:
      "Google's Agent2Agent protocol is the most credible attempt to standardize agent communication. We identify six structural gaps in the v1.0 specification: self-attestation signing, void-by-default push notification requirements, credential chain exposure, SSRF via Part.url, cross-session context injection, and no authorization model. None are implementation bugs — they are in the spec.",
    href: "https://github.com/stevenkozeniesky02/agentsid/blob/master/docs/a2a-security-gaps-2026.md",
    stats: ["6 gaps identified", "v1.0 spec analysis", "Exact spec citations"],
  },
  {
    title: "The Multi-Agent Auth Gap: Four Security Gaps in Every Major Agent Framework",
    date: "March 2026",
    abstract:
      "We analyzed five major agent frameworks — Claude Code Agent Teams, AutoGen, CrewAI, LangGraph, and OpenAI Agents SDK — and found four structural security gaps present in all of them: agent identity is a string with no cryptographic verification, no credential scoping between agents, no inter-agent authentication, and no audit trail for agent-to-agent delegation.",
    href: "https://github.com/stevenkozeniesky02/agentsid/blob/master/docs/agent-teams-auth-gap-2026.md",
    stats: ["5 frameworks analyzed", "4 gaps per framework", "Zero use delegation chains"],
  },
  {
    title: "The State of MCP Server Security — 2026",
    date: "March 2026",
    abstract:
      "The first large-scale security analysis of the MCP ecosystem. We scanned 15,983 MCP servers across npm and PyPI and found that 72.6% scored below 60/100. 88% have no real authentication. 53% rely on static API keys. Only 8.5% implement OAuth. The ecosystem has grown faster than its security infrastructure.",
    href: "https://github.com/stevenkozeniesky02/agentsid/blob/master/docs/state-of-agent-security-2026.md",
    stats: ["15,983 servers scanned", "72.6% scored F", "88% no auth"],
  },
] as const;

const PaperCard = ({ paper }: { readonly paper: (typeof PAPERS)[number] }) => (
  <a
    href={paper.href}
    target="_blank"
    rel="noopener noreferrer"
    className="group bg-card border border-border/50 rounded-xl p-6 hover:border-primary/20 transition-colors flex flex-col gap-4"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="w-4 h-4" />
        <span>{paper.date}</span>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
    </div>
    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
      {paper.title}
    </h2>
    <p className="text-sm text-muted-foreground leading-relaxed">
      {paper.abstract}
    </p>
    <div className="flex flex-wrap gap-2 mt-auto pt-2">
      {paper.stats.map((stat) => (
        <span
          key={stat}
          className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
        >
          {stat}
        </span>
      ))}
    </div>
  </a>
);

const Research = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          Research
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Security research on the AI agent ecosystem. All papers are open access with full methodology, datasets, and reproducibility details.
        </p>
        <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
          <span><strong className="text-foreground">5</strong> papers published</span>
          <span><strong className="text-foreground">15,982</strong> servers scanned</span>
          <span><strong className="text-foreground">137,070</strong> findings documented</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PAPERS.map((paper) => (
          <PaperCard key={paper.title} paper={paper} />
        ))}
      </div>

      <div className="mt-12 p-6 bg-card border border-border/50 rounded-xl text-center">
        <p className="text-muted-foreground text-sm">
          All research is available on{" "}
          <a
            href="https://github.com/stevenkozeniesky02/agentsid"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub
          </a>
          . The scanner is open source:{" "}
          <code className="px-1.5 py-0.5 bg-muted rounded text-xs">npx @agentsid/scanner</code>
        </p>
      </div>
    </div>
  );
};

export { Research };
