import { type ReactNode, useState, useEffect } from "react";
import { Book, ExternalLink, FileText, LayoutDashboard, Menu, Shield, Trophy, Zap } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AgentsIDLogo } from "@/components/blocks/logo";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: ReactNode;
  items?: MenuItem[];
  external?: boolean;
}

interface NavbarProps {
  logo?: {
    url: string;
    title: string;
  };
  menu?: MenuItem[];
  mobileExtraLinks?: {
    name: string;
    url: string;
  }[];
  auth?: {
    login: {
      text: string;
      url: string;
    };
    signup: {
      text: string;
      url: string;
    };
  };
}

const Navbar = ({
  logo = {
    url: "/",
    title: "AgentsID",
  },
  menu = [
    {
      title: "Product",
      url: "#",
      items: [
        {
          title: "Documentation",
          description: "API reference, SDKs, and integration guides",
          icon: <Book className="size-5 shrink-0" />,
          url: "/docs",
        },
        {
          title: "Guides",
          description: "Setup tutorials for Claude, Cursor, Codex, and more",
          icon: <FileText className="size-5 shrink-0" />,
          url: "/guides",
        },
        {
          title: "Dashboard",
          description: "Manage your agents, permissions, and audit logs",
          icon: <LayoutDashboard className="size-5 shrink-0" />,
          url: "/dashboard",
        },
        {
          title: "Security",
          description: "HMAC tokens, deny-first permissions, audit chains",
          icon: <Shield className="size-5 shrink-0" />,
          url: "/docs#security",
        },
      ],
    },
    {
      title: "Resources",
      url: "#",
      items: [
        {
          title: "MCP Registry",
          description: "Security grades for 100+ MCP servers",
          icon: <Trophy className="size-5 shrink-0" />,
          url: "/registry",
        },
        {
          title: "Quick Start",
          description: "Get up and running in under 5 minutes",
          icon: <Zap className="size-5 shrink-0" />,
          url: "/guides#quick-start",
        },
        {
          title: "GitHub",
          description: "SDKs, CLI tools, and example integrations",
          icon: <ExternalLink className="size-5 shrink-0" />,
          url: "https://github.com/stevenkozeniesky02/agentsid",
          external: true,
        },
        {
          title: "Terms of Service",
          description: "Our terms and conditions",
          icon: <FileText className="size-5 shrink-0" />,
          url: "/terms",
        },
        {
          title: "Privacy Policy",
          description: "How we handle your data",
          icon: <Shield className="size-5 shrink-0" />,
          url: "/privacy",
        },
      ],
    },
    { title: "Docs", url: "/docs" },
    { title: "Guides", url: "/guides" },
    { title: "Registry", url: "/registry" },
    { title: "Spec", url: "/spec" },
    { title: "Blog", url: "/blog" },
  ],
  mobileExtraLinks = [
    { name: "Terms", url: "/terms" },
    { name: "Privacy", url: "/privacy" },
    { name: "GitHub", url: "https://github.com/stevenkozeniesky02/agentsid" },
  ],
  auth = {
    login: { text: "Dashboard", url: "/dashboard" },
    signup: { text: "Start Free", url: "/dashboard" },
  },
}: NavbarProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("agentsid_api_key"));
    const handleStorage = () => setIsLoggedIn(!!localStorage.getItem("agentsid_api_key"));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <section className="py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 lg:px-8">
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <a href={logo.url} className="flex items-center gap-2">
              <AgentsIDLogo className="w-8 h-8" />
              <span className="text-lg font-semibold tracking-tight">
                {logo.title}
              </span>
            </a>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {menu.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex gap-2">
            {isLoggedIn ? (
              <Button asChild size="sm">
                <a href={auth.login.url}>{auth.login.text}</a>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <a href={auth.login.url}>{auth.login.text}</a>
                </Button>
                <Button asChild size="sm">
                  <a href={auth.signup.url}>{auth.signup.text}</a>
                </Button>
              </>
            )}
          </div>
        </nav>
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <a href={logo.url} className="flex items-center gap-2">
              <AgentsIDLogo className="w-8 h-8" />
              <span className="text-lg font-semibold tracking-tight">
                {logo.title}
              </span>
            </a>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <a href={logo.url} className="flex items-center gap-2">
                      <AgentsIDLogo className="w-8 h-8" />
                      <span className="text-lg font-semibold">
                        {logo.title}
                      </span>
                    </a>
                  </SheetTitle>
                </SheetHeader>
                <div className="my-6 flex flex-col gap-6">
                  <Accordion
                    type="single"
                    collapsible
                    className="flex w-full flex-col gap-4"
                  >
                    {menu.map((item) => renderMobileMenuItem(item))}
                  </Accordion>
                  <div className="border-t py-4">
                    <div className="grid grid-cols-2 justify-start">
                      {mobileExtraLinks.map((link, idx) => (
                        <a
                          key={idx}
                          className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                          href={link.url}
                          {...(link.url.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {link.name}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {isLoggedIn ? (
                      <Button asChild>
                        <a href={auth.login.url}>{auth.login.text}</a>
                      </Button>
                    ) : (
                      <>
                        <Button asChild variant="outline">
                          <a href={auth.login.url}>{auth.login.text}</a>
                        </Button>
                        <Button asChild>
                          <a href={auth.signup.url}>{auth.signup.text}</a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title} className="text-muted-foreground">
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="w-80 p-3">
            <NavigationMenuLink>
              {item.items.map((subItem) => (
                <li key={subItem.title}>
                  <a
                    className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
                    href={subItem.url}
                    {...(subItem.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {subItem.icon}
                    <div>
                      <div className="text-sm font-semibold">
                        {subItem.title}
                      </div>
                      {subItem.description && (
                        <p className="text-sm leading-snug text-muted-foreground">
                          {subItem.description}
                        </p>
                      )}
                    </div>
                  </a>
                </li>
              ))}
            </NavigationMenuLink>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <a
      key={item.title}
      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
      href={item.url}
      {...(item.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {item.title}
    </a>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <AccordionItem
        key={item.title}
        value={item.title}
        className="border-b-0"
      >
        <AccordionTrigger className="py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2">
          {item.items.map((subItem) => (
            <a
              key={subItem.title}
              className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
              href={subItem.url}
              {...(subItem.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {subItem.icon}
              <div>
                <div className="text-sm font-semibold">{subItem.title}</div>
                {subItem.description && (
                  <p className="text-sm leading-snug text-muted-foreground">
                    {subItem.description}
                  </p>
                )}
              </div>
            </a>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <a key={item.title} href={item.url} className="font-semibold">
      {item.title}
    </a>
  );
};

export { Navbar };
