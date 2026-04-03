import { AgentsIDLogo } from "@/components/blocks/logo";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-background py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-2">
            <AgentsIDLogo className="w-6 h-6" />
            <span className="text-sm font-semibold text-foreground">
              AgentsID
            </span>
          </a>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a
              href="/guides"
              className="hover:text-foreground transition-colors"
            >
              Guides
            </a>
            <a
              href="/blog"
              className="hover:text-foreground transition-colors"
            >
              Blog
            </a>
            <a
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </a>
            <a
              href="https://github.com/stevenkozeniesky02/agentsid"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </a>
            <a
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </a>
            <a
              href="mailto:support@agentsid.dev"
              className="hover:text-foreground transition-colors"
            >
              Support
            </a>
          </nav>
          <p className="text-sm text-muted-foreground">
            &copy; 2026 AgentsID
          </p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
