import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "@theinnerwar.app/api/routers/index";
import { TRPCClientError, createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

import { clearSession, readSession } from "./session";

export const serverUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000").replace(/\/$/, "");

function onUnauthorized(error: unknown) {
  const code = error instanceof TRPCClientError ? (error.data as { code?: string } | undefined)?.code : undefined;
  if (code === "UNAUTHORIZED" && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    console.warn("[dispatch] session rejected by the server, signing out");
    clearSession();
    window.location.href = "/login";
    return true;
  }
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error("[dispatch] query failed", query.queryKey, error);
      if (!onUnauthorized(error)) toast.error(error.message);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error("[dispatch] mutation failed", error);
      if (!onUnauthorized(error)) toast.error(error.message);
    },
  }),
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    // Logs every request and response in the browser console (development, or ?debug in the URL).
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === "development" ||
        (typeof window !== "undefined" && window.location.search.includes("debug")) ||
        (op.direction === "down" && op.result instanceof Error),
    }),
    httpBatchLink({
      url: `${serverUrl}/trpc`,
      headers() {
        const session = readSession();
        return session ? { Authorization: `Bearer ${session.token}` } : {};
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });
