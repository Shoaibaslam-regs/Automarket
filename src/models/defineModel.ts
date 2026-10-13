import mongoose, { type Model, type Schema } from "mongoose";

// A short description of a schema's fields (names, types, enums, nested schemas), used to tell a real
// schema edit apart from the same model file simply being loaded again by another route.
function fingerprint(schema: Schema): string {
  return Object.entries(schema.paths)
    .map(([path, type]) => {
      const t = type as { instance?: string; schema?: Schema; enumValues?: unknown[] };
      return `${path}:${t.instance}${t.enumValues?.length ? `[${t.enumValues.join("|")}]` : ""}${t.schema ? `{${fingerprint(t.schema)}}` : ""}`;
    })
    .sort()
    .join(",");
}

const globalForModels = global as unknown as { __modelFingerprints?: Map<string, string> };
const fingerprints = (globalForModels.__modelFingerprints ??= new Map());

/**
 * Registers a model once per process, like `mongoose.models.X || mongoose.model(...)`.
 * In development, a model whose schema was edited is replaced on hot reload; otherwise the old schema
 * would stay in memory until a restart, silently dropping new fields and failing populate() on new paths.
 * It is only replaced when the schema really changed: replacing it on every reload can leave a route
 * holding a model that was created while the connection was still opening, and that model's queries
 * then wait forever ("buffering timed out").
 * Typed `Model<any>` like the old `models.X || model()` expression, so callers are unaffected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineModel<T>(name: string, schema: Schema<T>): Model<any> {
  if (process.env.NODE_ENV !== "production") {
    const print = fingerprint(schema as Schema);
    const existing = mongoose.models[name];
    if (existing && fingerprints.get(name) === print) return existing;
    if (existing) mongoose.deleteModel(name);
    fingerprints.set(name, print);
  }
  return mongoose.models[name] || mongoose.model<T>(name, schema);
}
