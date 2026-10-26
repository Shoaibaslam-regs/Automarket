// Pusher channel names, shared by the server (triggering) and the browser (subscribing). Client-safe.
//
// Every channel is private: Pusher only lets a browser join after /api/pusher/auth agrees, so knowing someone's
// account id isn't enough to read their notifications or chats (public channels let anyone with the app key in).

const ID = /^[0-9a-f]{24}$/i;

/** A user's own notifications (badges, chimes, message previews). */
export const userChannel = (userId: string) => `private-user-${userId}`;

/** The live chat between two accounts; the same name whichever side opens it. */
export const chatChannel = (a: string, b: string) => `private-chat-${[a, b].sort().join("-")}`;

/** The private name for a channel the server code still calls by its short name ("user-…", "chat-…"). */
export const privateName = (channel: string) => (channel.startsWith("private-") ? channel : `private-${channel}`);

/**
 * Whether `userId` may join `channel`: their own user channel, or a chat they are one side of.
 * Anything else (another user's channel, a malformed or public name) is refused.
 */
export function canJoinChannel(channel: string, userId: string): boolean {
  if (!ID.test(userId)) return false;
  const user = /^private-user-([0-9a-f]{24})$/i.exec(channel);
  if (user) return user[1].toLowerCase() === userId.toLowerCase();
  const chat = /^private-chat-([0-9a-f]{24})-([0-9a-f]{24})$/i.exec(channel);
  if (chat) return [chat[1], chat[2]].some(id => id.toLowerCase() === userId.toLowerCase());
  return false;
}
