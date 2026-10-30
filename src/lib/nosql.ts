// Client-safe guard against NoSQL (MongoDB operator) injection.
// API routes read JSON bodies and put their values into queries, e.g. User.findOne({ email: body.email }).
// If someone sends { "email": { "$ne": null } } instead of a string, MongoDB reads it as an operator and the
// query matches records it never should. No AutoGO form ever sends a key starting with "$", so the proxy refuses
// any JSON body that carries one (src/proxy.ts), before a route can use it.

/** How deep a body may nest before it is refused outright; real forms stay well under this. */
export const MAX_BODY_DEPTH = 20;

/** Keys that set prototypes when a parsed object is merged into another (prototype pollution). */
const PROTO_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** True for a key MongoDB would read as an operator ($ne, $gt, $where…) or one that could pollute prototypes. */
export function isDangerousKey(key: string): boolean {
  return key.startsWith("$") || PROTO_KEYS.has(key);
}

/**
 * The first dangerous key anywhere in a parsed JSON value (walked without recursion), or null when it is clean.
 * Bodies nested deeper than MAX_BODY_DEPTH count as unsafe too ("(too deep)").
 */
export function findUnsafeKey(value: unknown): string | null {
  const stack: Array<{ v: unknown; depth: number }> = [{ v: value, depth: 0 }];
  while (stack.length) {
    const { v, depth } = stack.pop()!;
    if (v === null || typeof v !== "object") continue;
    if (depth > MAX_BODY_DEPTH) return "(too deep)";
    if (Array.isArray(v)) {
      for (const item of v) stack.push({ v: item, depth: depth + 1 });
      continue;
    }
    for (const key of Object.keys(v)) {
      if (isDangerousKey(key)) return key;
      stack.push({ v: (v as Record<string, unknown>)[key], depth: depth + 1 });
    }
  }
  return null;
}

/** For routes: a value that must be a plain string (never an object or array that MongoDB could read as a query). */
export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
