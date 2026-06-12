"use client";

import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;

 export function getPusherClient(): PusherClient {
  if (typeof window === "undefined") {
    throw new Error("Pusher can only run in browser");
  }

  if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
    throw new Error("Missing Pusher key");
  }

  if (!pusherClient) {
    pusherClient = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
      }
    );
  }

  return pusherClient;
}
