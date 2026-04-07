// PostHog is loaded via script tag in index.html.
// Type augmentation is in components/dashboard/AuthPanel.tsx.
// This module provides typed wrappers for custom event tracking.

function capture(event: string, properties?: Record<string, unknown>): void {
  window.posthog?.capture?.(event, properties);
}

export function trackScanStarted(server: string): void {
  capture("scan_started", { server });
}

export function trackScanCompleted(server: string, score: number, grade: string): void {
  capture("scan_completed", { server, score, grade });
}

export function trackRegistryView(server: string): void {
  capture("registry_view", { server });
}

export function trackBlogRead(slug: string, title: string): void {
  capture("blog_read", { slug, title });
}

export function trackResearchView(paper: string): void {
  capture("research_view", { paper });
}
