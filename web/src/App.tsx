import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/blocks/navbar";
import { Footer } from "@/components/blocks/footer";
import { ErrorBoundary } from "@/components/blocks/error-boundary";

// Lazy-load pages — only the visited page's code is downloaded
const Landing = lazy(() => import("@/pages/landing").then((m) => ({ default: m.Landing })));
const Docs = lazy(() => import("@/pages/docs").then((m) => ({ default: m.Docs })));
const Guides = lazy(() => import("@/pages/guides").then((m) => ({ default: m.Guides })));
const Dashboard = lazy(() => import("@/pages/dashboard").then((m) => ({ default: m.Dashboard })));
const Terms = lazy(() => import("@/pages/terms").then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import("@/pages/privacy").then((m) => ({ default: m.Privacy })));
const Blog = lazy(() => import("@/pages/blog").then((m) => ({ default: m.Blog })));
const BlogPost = lazy(() => import("@/pages/blog-post").then((m) => ({ default: m.BlogPost })));
const Spec = lazy(() => import("@/pages/spec").then((m) => ({ default: m.Spec })));
const Research = lazy(() => import("@/pages/research").then((m) => ({ default: m.Research })));
const Grade = lazy(() => import("@/pages/grade").then((m) => ({ default: m.Grade })));
const Claim = lazy(() => import("@/pages/claim").then((m) => ({ default: m.Claim })));
const Digest = lazy(() => import("@/pages/digest").then((m) => ({ default: m.Digest })));
const Badges = lazy(() => import("@/pages/badges").then((m) => ({ default: m.Badges })));

const RegistryV2 = lazy(() => import("@/pages/registry-v2").then((m) => ({ default: m.RegistryV2 })));
const RegistryServerV2 = lazy(() => import("@/pages/registry-server-v2").then((m) => ({ default: m.RegistryServerV2 })));
const NotFound = lazy(() => import("@/pages/not-found").then((m) => ({ default: m.NotFound })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <ErrorBoundary>
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/guides" element={<Guides />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/spec" element={<Spec />} />
                <Route path="/research" element={<Research />} />
                <Route path="/docs/grade" element={<Grade />} />
                <Route path="/grade" element={<Grade />} />
                <Route path="/claim" element={<Claim />} />
                <Route path="/claim/:slug" element={<Claim />} />
                <Route path="/digest" element={<Digest />} />
                <Route path="/badges" element={<Badges />} />
                <Route path="/hall-of-mcps" element={<RegistryV2 />} />
                <Route path="/registry" element={<RegistryV2 />} />
                <Route path="/registry/:slug" element={<RegistryServerV2 />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </ErrorBoundary>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
