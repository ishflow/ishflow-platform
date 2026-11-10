import { MDXRemote } from 'next-mdx-remote/rsc';
import type { ReactNode } from 'react';

interface BlogPostRendererProps {
  body: string;
}

/**
 * Renders MDX (or plain markdown) content for blog posts and any other
 * long-form marketing page (about/privacy/terms/security/changelog/roadmap).
 *
 * We don't have @tailwindcss/typography installed, so every element type
 * is styled explicitly here. Keep this minimal — marketing pages should
 * not embed arbitrary React.
 */
export function BlogPostRenderer({ body }: BlogPostRendererProps) {
  return (
    <article className="mx-auto max-w-3xl text-foreground">
      <MDXRemote
        source={body}
        components={{
          h1: ({ children }: { children?: ReactNode }) => (
            <h1 className="mt-0 mb-6 scroll-mt-24 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              {children}
            </h1>
          ),
          h2: ({ children }: { children?: ReactNode }) => (
            <h2 className="mt-12 mb-4 scroll-mt-24 text-balance text-2xl font-semibold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }: { children?: ReactNode }) => (
            <h3 className="mt-8 mb-3 scroll-mt-24 text-balance text-lg font-semibold tracking-tight">
              {children}
            </h3>
          ),
          p: ({ children }: { children?: ReactNode }) => (
            <p className="my-4 leading-relaxed text-foreground/90">{children}</p>
          ),
          a: ({ children, href }: { children?: ReactNode; href?: string }) => (
            <a
              href={href}
              className="text-primary underline-offset-4 hover:underline"
              rel={href?.startsWith('http') ? 'noreferrer noopener' : undefined}
              target={href?.startsWith('http') ? '_blank' : undefined}
            >
              {children}
            </a>
          ),
          ul: ({ children }: { children?: ReactNode }) => (
            <ul className="my-4 list-disc space-y-2 pl-6 text-foreground/90">{children}</ul>
          ),
          ol: ({ children }: { children?: ReactNode }) => (
            <ol className="my-4 list-decimal space-y-2 pl-6 text-foreground/90">{children}</ol>
          ),
          li: ({ children }: { children?: ReactNode }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }: { children?: ReactNode }) => (
            <blockquote className="my-6 border-l-2 border-primary/40 pl-4 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          code: ({ children }: { children?: ReactNode }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{children}</code>
          ),
          pre: ({ children }: { children?: ReactNode }) => (
            <pre className="my-6 overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 font-mono text-sm">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-10 border-border/60" />,
          strong: ({ children }: { children?: ReactNode }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      />
    </article>
  );
}
