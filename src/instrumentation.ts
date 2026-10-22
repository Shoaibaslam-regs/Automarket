import type { Instrumentation } from "next";

/**
 * Uncaught server errors (pages, route handlers, server actions, proxy) are recorded in the admin Errors page.
 * Errors that routes catch themselves are recorded through reportError (src/lib/errorLog.ts).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const e = err as Error & { digest?: string };
  // Not-found and redirect "errors" are how Next.js stops rendering, not bugs
  if (e.digest?.startsWith("NEXT_")) return;
  const { recordError } = await import("@/lib/errorLog");
  await recordError({
    where: `${context.routeType} ${context.routePath}`,
    message: e.message || "Unknown error",
    stack: e.stack,
    path: request.path.split("?")[0],
    method: request.method,
    digest: e.digest,
  });
};
