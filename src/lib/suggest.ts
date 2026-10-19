// Client-safe shape of a search suggestion (GET /api/search/suggest).

export type Suggestion =
  | { kind: "model"; label: string; sub: string; href: string; make: string; search: string }
  | { kind: "city"; label: string; sub: string; href: string; location: string }
  | { kind: "listing"; label: string; sub: string; href: string };
