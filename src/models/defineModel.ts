import mongoose, { type Model, type Schema } from "mongoose";

/**
 * Registers a model once per process, like `mongoose.models.X || mongoose.model(...)`.
 * In development, hot reload re-runs the model file after a schema change, so the cached
 * model is replaced; otherwise the old schema would stay in memory until a restart,
 * silently dropping new fields and failing populate() on new paths.
 * Typed `Model<any>` like the old `models.X || model()` expression, so callers are unaffected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineModel<T>(name: string, schema: Schema<T>): Model<any> {
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }
  return mongoose.models[name] || mongoose.model<T>(name, schema);
}
