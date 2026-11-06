import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

// One throwaway MongoDB for the whole run (a one-node replica set, like the browser tests, so transactions work).
// Its address is handed to the test files through `provide`; nothing here can reach a real database.
let repl: MongoMemoryReplSet | undefined;

export async function setup(project: TestProject) {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  project.provide("mongoUri", repl.getUri("autogo-dbtest"));
}

export async function teardown() {
  await repl?.stop();
}

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
