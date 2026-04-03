import { BLOG_POSTS, getCategoryStyle } from "@/pages/blog-data";
import type { BlogPost } from "@/pages/blog-data";

const PostCard = ({ post }: { readonly post: BlogPost }) => (
  <a
    href={`/blog/${post.slug}`}
    className="group bg-card border border-border/50 rounded-xl p-6 hover:border-primary/20 transition-colors flex flex-col gap-3"
  >
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getCategoryStyle(post.category)}`}
      >
        {post.category}
      </span>
      <span>{post.date}</span>
      <span>{post.readTime} read</span>
    </div>
    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
      {post.title}
    </h2>
    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
      {post.description}
    </p>
  </a>
);

const Blog = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          Blog
        </h1>
        <p className="text-muted-foreground text-lg">
          Thoughts on agent security, tutorials, and product updates
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BLOG_POSTS.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {BLOG_POSTS.length === 0 && (
        <p className="text-center text-muted-foreground py-20">
          No posts yet. Check back soon.
        </p>
      )}
    </div>
  );
};

export { Blog };
