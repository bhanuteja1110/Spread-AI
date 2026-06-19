'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
}

/**
 * WCAG-friendly Markdown renderer for both light and dark themes.
 * Body text contrast:
 *   - Light: foreground slate-900 on white = ~17:1 (AAA)
 *   - Dark:  foreground slate-100 on slate-950 = ~16:1 (AAA)
 */
function CodeBlock({
  language,
  children,
  isDark,
}: {
  language: string;
  children: string;
  isDark: boolean;
}) {
  return (
    <SyntaxHighlighter
      style={isDark ? oneDark : oneLight}
      language={language}
      PreTag="div"
      className="rounded-lg border border-border my-4 text-sm !bg-muted"
      customStyle={{
        background: 'transparent',
        padding: '1rem',
        borderRadius: '0.5rem',
        margin: 0,
      }}
    >
      {children}
    </SyntaxHighlighter>
  );
}

function buildComponents(isDark: boolean): Components {
  return {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const isCodeBlock = Boolean(match);

      return isCodeBlock ? (
        <CodeBlock language={match![1]} isDark={isDark}>
          {String(children).replace(/\n$/, '')}
        </CodeBlock>
      ) : (
        <code
          className="bg-muted text-foreground rounded px-1.5 py-0.5 text-[0.9em] font-mono border border-border"
          {...props}
        >
          {children}
        </code>
      );
    },

    h1: ({ children }) => (
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-6 mb-3">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mt-5 mb-2.5">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mt-4 mb-2">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold text-foreground mt-3 mb-1.5">{children}</h4>
    ),

    p: ({ children }) => <p className="text-foreground leading-7 my-2.5">{children}</p>,

    ul: ({ children }) => (
      <ul className="list-disc pl-6 my-2.5 space-y-1 marker:text-muted-foreground text-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 my-2.5 space-y-1 marker:text-muted-foreground text-foreground">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-7">{children}</li>,

    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic text-foreground/95">{children}</em>,

    hr: () => <hr className="my-5 border-border" />,

    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary/60 pl-4 italic text-foreground/85 my-4 bg-muted/60 py-2 pr-2 rounded-r">
        {children}
      </blockquote>
    ),

    table: ({ children }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-sm font-semibold text-foreground">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-sm text-foreground/90">{children}</td>
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'underline underline-offset-2 transition-colors font-medium',
          'text-blue-600 hover:text-blue-700 decoration-blue-600/40 hover:decoration-blue-600',
          'dark:text-blue-400 dark:hover:text-blue-300 dark:decoration-blue-400/40 dark:hover:decoration-blue-300',
        )}
      >
        {children}
      </a>
    ),

    input: ({ type, checked, disabled }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            readOnly
            className="mr-1.5 accent-primary h-3.5 w-3.5"
          />
        );
      }
      return null;
    },
  };
}

function MarkdownRendererImpl({ content }: MarkdownRendererProps) {
  // useTheme is safe here — this is the top-level component
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const components = React.useMemo(() => buildComponents(isDark), [isDark]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererImpl);
