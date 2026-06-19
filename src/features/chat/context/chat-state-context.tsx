'use client';

import React, { createContext, useContext, useCallback, useMemo, useRef } from 'react';

interface ChatStateApi {
  /** Reset the chat to a clean draft (used by Sidebar "New Chat"). */
  resetChat: () => void;
}

const ChatStateContext = createContext<ChatStateApi | null>(null);

/**
 * Provider that exposes a `resetChat` callback. The provider owns the
 * `useRef` so the function identity is stable for the entire app lifetime —
 * no spurious re-renders of consumers.
 *
 * Why this exists: the previous flow called `router.push('/dashboard/chat')`
 * from the sidebar, which caused Next.js to swap route components. That
 * remounted `useChat` and silently discarded the in-flight stream + messages.
 * Now the sidebar just calls `resetChat()`, no navigation involved.
 */
export function ChatStateProvider({ children }: { children: React.ReactNode }) {
  const resetRef = useRef<() => void>(() => {});

  const register = useCallback((fn: () => void) => {
    resetRef.current = fn;
  }, []);

  const value = useMemo<ChatStateApi & { register: (fn: () => void) => void }>(
    () => ({
      resetChat: () => resetRef.current(),
      register,
    }),
    [register],
  );

  return <ChatStateContext.Provider value={value}>{children}</ChatStateContext.Provider>;
}

export function useChatState(): ChatStateApi {
  const ctx = useContext(ChatStateContext);
  if (!ctx) {
    // Safe default so non-mounted contexts don't throw in tests
    return { resetChat: () => {} };
  }
  return ctx;
}

/** Internal: called by ChatLayout to expose its reset function. */
export function useChatStateRegistration(reset: () => void): void {
  const ctx = useContext(ChatStateContext) as
    | (ChatStateApi & { register: (fn: () => void) => void })
    | null;
  // No-op if outside provider — safe in Storybook/test contexts
  if (!ctx) return;
  // The ref-based register never triggers re-render
  ctx.register(reset);
}
