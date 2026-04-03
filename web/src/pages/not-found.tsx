import { Link } from "react-router-dom";
import { AgentsIDLogo } from "@/components/blocks/logo";
import { Button } from "@/components/ui/button";
import { Particles } from "@/components/ui/particles";
import { Home, BookOpen, LayoutDashboard, ArrowLeft } from "lucide-react";

const NAV_LINKS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/docs", label: "Docs", icon: BookOpen },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 overflow-hidden">
      <Particles
        className="absolute inset-0"
        color="#f59e0b"
        quantity={30}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg text-center">
        <AgentsIDLogo className="w-12 h-12" />

        <h1 className="text-8xl font-extrabold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="text-2xl font-semibold text-foreground">
          Page not found
        </h2>

        <p className="text-muted-foreground leading-relaxed max-w-sm">
          The page you are looking for does not exist or has been moved.
          Try one of the links below.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Button key={to} variant="outline" asChild>
              <Link to={to}>
                <Icon className="size-4 mr-2" />
                {label}
              </Link>
            </Button>
          ))}
        </div>

        <Button variant="ghost" asChild className="mt-1">
          <Link to="/">
            <ArrowLeft className="size-4 mr-2" />
            Go back home
          </Link>
        </Button>
      </div>
    </div>
  );
}

export { NotFound };
