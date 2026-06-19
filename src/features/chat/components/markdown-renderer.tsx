'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

// react-markdown v9+: className moved off <ReactMarkdown>, inline prop removed from code
const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const isCodeBlock = Boolean(match);

    return isCodeBlock ? (
      <SyntaxHighlighter
        style={oneDark}
        language={match![1]}
        PreTag="div"
        className="rounded-lg border border-border my-4 text-sm !bg-muted"
        customStyle={{ background: 'transparent', padding: '1rem', borderRadius: '0.5rem', margin: 0 }}
        {...(props as any)}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code
        className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono text-primary"
        {...props}
      >
        {children}
      </code>
    );
  },

  table({ children }) {
    return (
      <div className="overflow-x-auto my-4 rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border bg-card/50">
          {children}
        </table>
      </div>
    );
  },

  th({ children }) {
    return (
      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
        {children}
      </th>
    );
  },

  td({ children }) {
    return (
      <td className="px-4 py-3 border-t border-border text-sm text-foreground/80">
        {children}
      </td>
    );
  },

  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200 hover:underline transition-colors"
      >
        {children}
      </a>
    );
  },

  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-4">
        {children}
      </blockquote>
    );
  },
};

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    // Wrapper div carries className — react-markdown v9 removed className prop from component
    <div className="prose prose-invert max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
