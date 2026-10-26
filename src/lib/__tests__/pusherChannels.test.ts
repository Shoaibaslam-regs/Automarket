import { describe, expect, it } from "vitest";
import { canJoinChannel, chatChannel, privateName, userChannel } from "@/lib/pusherChannels";

const ME = "a".repeat(24);
const YOU = "b".repeat(24);
const THEM = "c".repeat(24);

describe("channel names", () => {
  it("are private and the same for both sides of a chat", () => {
    expect(userChannel(ME)).toBe(`private-user-${ME}`);
    expect(chatChannel(YOU, ME)).toBe(chatChannel(ME, YOU));
    expect(chatChannel(ME, YOU)).toBe(`private-chat-${ME}-${YOU}`);
    expect(privateName(`user-${ME}`)).toBe(`private-user-${ME}`);
    expect(privateName(`private-user-${ME}`)).toBe(`private-user-${ME}`);
  });
});

describe("canJoinChannel", () => {
  it("lets a user join only their own notifications", () => {
    expect(canJoinChannel(userChannel(ME), ME)).toBe(true);
    expect(canJoinChannel(userChannel(YOU), ME)).toBe(false);
  });
  it("lets a user join only chats they are part of", () => {
    expect(canJoinChannel(chatChannel(ME, YOU), ME)).toBe(true);
    expect(canJoinChannel(chatChannel(ME, YOU), YOU)).toBe(true);
    expect(canJoinChannel(chatChannel(YOU, THEM), ME)).toBe(false);
  });
  it("refuses public, malformed and look-alike names", () => {
    expect(canJoinChannel(`user-${ME}`, ME)).toBe(false);
    expect(canJoinChannel(`private-user-${ME}-x`, ME)).toBe(false);
    expect(canJoinChannel(`private-chat-${ME}`, ME)).toBe(false);
    expect(canJoinChannel(`private-chat-${ME}-${YOU}-${THEM}`, ME)).toBe(false);
    expect(canJoinChannel(userChannel(ME), "not-an-id")).toBe(false);
  });
});
