import { useParams, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { trackBlogRead } from "@/lib/posthog";
import { ArrowLeft, Link as LinkIcon, ExternalLink } from "lucide-react";
import {
  findPostBySlug,
  getRelatedPosts,
  getCategoryStyle,
} from "@/pages/blog-data";
import type { ContentBlock, BlogPost as BlogPostType } from "@/pages/blog-data";

const renderBlock = (block: ContentBlock, index: number) => {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={index} className="mb-4 text-foreground leading-relaxed">
          {block.text}
        </p>
      );

    case "heading":
      return (
        <h2
          key={index}
          className="text-xl font-bold text-foreground mt-10 mb-4 pl-4 border-l-4 border-primary"
        >
          {block.text}
        </h2>
      );

    case "code":
      return (
        <div key={index} className="my-6 rounded-lg overflow-hidden">
          {block.language && (
            <div className="bg-[#0a0a15] px-4 py-2 text-xs text-muted-foreground font-mono border-b border-white/5">
              {block.language}
            </div>
          )}
          <pre className="bg-[#0f0f1a] p-4 overflow-x-auto text-sm leading-relaxed">
            <code className="text-gray-300 font-mono whitespace-pre">
              {block.text}
            </code>
          </pre>
        </div>
      );

    case "list":
      return (
        <ul
          key={index}
          className="list-disc pl-6 mb-4 space-y-2 text-foreground"
        >
          {block.items?.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );

    case "callout":
      return (
        <div
          key={index}
          className="rounded-lg border border-primary/25 border-l-4 border-l-primary bg-primary/5 p-4 my-6 text-sm leading-relaxed text-foreground"
        >
          {block.text}
        </div>
      );

    default:
      return null;
  }
};

const ShareButtons = ({ title, slug }: { readonly title: string; readonly slug: string }) => {
  const [copied, setCopied] = useState(false);
  const url = `https://agentsid.dev/blog/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-3 pt-8 border-t border-border mt-10">
      <span className="text-sm text-muted-foreground">Share:</span>
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        type="button"
      >
        <LinkIcon className="size-3.5" />
        {copied ? "Copied!" : "Copy link"}
      </button>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ExternalLink className="size-3.5" />
        Post on X
      </a>
    </div>
  );
};

const RelatedPostCard = ({ post }: { readonly post: BlogPostType }) => (
  <a
    href={`/blog/${post.slug}`}
    className="group bg-card border border-border/50 rounded-xl p-5 hover:border-primary/20 transition-colors"
  >
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
      <span
        className={`px-2 py-0.5 rounded-full font-semibold border ${getCategoryStyle(post.category)}`}
      >
        {post.category}
      </span>
      <span>{post.readTime} read</span>
    </div>
    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
      {post.title}
    </h3>
  </a>
);

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? findPostBySlug(slug) : undefined;

  useEffect(() => {
    if (post) trackBlogRead(post.slug, post.title);
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = getRelatedPosts(post.slug, 2);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Back link */}
      <a
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="size-3.5" />
        Back to blog
      </a>

      {/* Header */}
      <header className="mb-10 pb-8 border-b border-border">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryStyle(post.category)}`}
          >
            {post.category}
          </span>
          <span>{post.date}</span>
          <span>{post.readTime} read</span>
          <span className="text-foreground/60">AgentsID Team</span>
        </div>
      </header>

      {/* Content */}
      <div className="prose-agentsid">
        {post.content.map((block, index) => renderBlock(block, index))}
      </div>

      {/* Share */}
      <ShareButtons title={post.title} slug={post.slug} />

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-bold text-foreground mb-4">
            More posts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedPosts.map((relatedPost) => (
              <RelatedPostCard key={relatedPost.slug} post={relatedPost} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};

export { BlogPost };
