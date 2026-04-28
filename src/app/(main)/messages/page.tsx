"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";
import Image from "next/image";

type User = {
  _id: string;
  name: string;
  image?: string;
};

type ListingInfo = {
  _id: string;
  title: string;
  images: string[];
  make: string;
  model: string;
};

type Message = {
  _id: string;
  senderId: User;
  receiverId: User;
  content: string;
  read: boolean;
  listingId?: ListingInfo;
  createdAt: string;
};

type Conversation = Message & {
  partnerId: string;
  partnerName: string;
  partnerImage?: string;
};

export default function MessagesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");
  const listingId = searchParams.get("listing");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      const convs = (data.conversations || []).map((msg: Message) => {
        const isMe = msg.senderId._id === session?.user?.id;
        const partner = isMe ? msg.receiverId : msg.senderId;
        return {
          ...msg,
          partnerId: partner._id,
          partnerName: partner.name,
          partnerImage: partner.image,
        };
      });
      setConversations(convs);
      setLoadingConvs(false);
    } catch (e) {
      console.error("fetchConversations error:", e);
      setLoadingConvs(false);
    }
  }, [session?.user?.id]);

  const fetchMessages = useCallback(async (userId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/messages?with=${userId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      console.error("fetchMessages error:", e);
    }
    setLoadingMsgs(false);
  }, []);

  // Initial load
  useEffect(() => {
    if (!session?.user) return;
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [session, fetchConversations]);

  // Load messages when withUserId is in URL
  useEffect(() => {
    if (!withUserId || !session?.user) return;
    fetchMessages(withUserId);
    fetch(`/api/users/${withUserId}`)
      .then(r => r.json())
      .then(data => {
        if (data.user) setActiveUser(data.user);
        else setActiveUser({ _id: withUserId, name: "User" });
      })
      .catch(() => setActiveUser({ _id: withUserId, name: "User" }));
  }, [withUserId, session, fetchMessages]);

  // Polling + Pusher for active chat
  useEffect(() => {
    if (!session?.user?.id || !activeUser) return;

    // Poll every 3 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?with=${activeUser._id}`);
        const data = await res.json();
        if (data.messages) {
          setMessages(prev => {
            const hasNew = data.messages.some(
              (m: Message) => !prev.find(p => p._id === m._id)
            );
            if (!hasNew) return prev;
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            return data.messages;
          });
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);

    // Pusher real-time
    let channelName: string | null = null;
    try {
      const client = getPusherClient();
      if (client) {
        channelName = `chat-${[session.user.id, activeUser._id].sort().join("-")}`;
        const channel = client.subscribe(channelName);
        channel.bind("new-message", (msg: Message) => {
          setMessages(prev => {
            if (prev.find(m => m._id === msg._id)) return prev;
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            return [...prev, msg];
          });
          fetchConversations();
        });
      }
    } catch (e) {
      console.error("Pusher error:", e);
    }

    return () => {
      clearInterval(interval);
      try {
        if (channelName) {
          const client = getPusherClient();
          client?.unsubscribe(channelName);
        }
      } catch (e) {
        console.error("Pusher unsubscribe error:", e);
      }
    };
  }, [session?.user?.id, activeUser, fetchConversations]);

  async function selectUser(userId: string, user: User) {
    setActiveUser(user);
    await fetchMessages(userId);
    inputRef.current?.focus();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !activeUser || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeUser._id,
          content,
          listingId: listingId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setContent("");
        setMessages(prev => {
          if (prev.find(m => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        fetchConversations();
      } else {
        alert(data.error || "Failed to send message");
      }
    } catch (e) {
      console.error("sendMessage error:", e);
    }
    setSending(false);
  }

  function formatTime(d: string) {
    const date = new Date(d);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  }

  function getInitial(name?: string) {
    return name?.[0]?.toUpperCase() || "?";
  }

  return (
    <div style={{ height: "calc(100vh - 56px)", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex" }}>

      {/* Sidebar */}
      <div style={{ width: "300px", background: "white", borderRight: "1px solid #e1e4e8", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e1e4e8" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#0d1117" }}>Messages</h1>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#8c959f", fontSize: "13px" }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#57606a", marginBottom: "4px" }}>No conversations yet</p>
              <p style={{ fontSize: "12px", color: "#8c959f" }}>Start by messaging a seller from a listing</p>
            </div>
          ) : conversations.map(conv => {
            const isActive = activeUser?._id === conv.partnerId;
            const isMe = conv.senderId._id === session?.user?.id;
            return (
              <div key={conv.partnerId}
                onClick={() => selectUser(conv.partnerId, { _id: conv.partnerId, name: conv.partnerName, image: conv.partnerImage })}
                style={{ padding: "12px 16px", cursor: "pointer", background: isActive ? "#f6f8fa" : "white", borderLeft: isActive ? "3px solid #0d1117" : "3px solid transparent", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0, position: "relative" }}>
                  {conv.partnerImage ? (
                    <Image src={conv.partnerImage} alt="" fill sizes="36px" style={{ borderRadius: "50%", objectFit: "cover" }} />
                  ) : getInitial(conv.partnerName)}
                  {!conv.read && !isMe && (
                    <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", background: "#cf222e", borderRadius: "50%", border: "2px solid white" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117" }}>{conv.partnerName}</p>
                    <p style={{ fontSize: "10px", color: "#8c959f" }}>{formatTime(conv.createdAt)}</p>
                  </div>
                  <p style={{ fontSize: "12px", color: "#57606a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isMe ? "You: " : ""}{conv.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!activeUser ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "48px" }}>💬</div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#0d1117" }}>Select a conversation</p>
            <p style={{ fontSize: "13px", color: "#57606a" }}>Choose from the left or start a new chat from a listing</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "14px 20px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, position: "relative", flexShrink: 0 }}>
                {activeUser.image ? (
                  <Image src={activeUser.image} alt="" fill sizes="36px" style={{ borderRadius: "50%", objectFit: "cover" }} />
                ) : getInitial(activeUser.name)}
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117" }}>{activeUser.name}</p>
                <p style={{ fontSize: "11px", color: "#57606a" }}>AutoMarket member</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {loadingMsgs ? (
                <div style={{ textAlign: "center", color: "#8c959f", fontSize: "13px", marginTop: "40px" }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#8c959f", fontSize: "13px", marginTop: "40px" }}>No messages yet. Say hello! 👋</div>
              ) : messages.map((msg, i) => {
                const isMe = msg.senderId._id === session?.user?.id;
                const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString();
                return (
                  <div key={msg._id}>
                    {showDate && (
                      <div style={{ textAlign: "center", margin: "12px 0" }}>
                        <span style={{ fontSize: "11px", color: "#8c959f", background: "#f6f8fa", padding: "3px 10px", borderRadius: "20px" }}>
                          {new Date(msg.createdAt).toLocaleDateString("en-PK", { weekday: "long", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: "2px" }}>
                        <div style={{
                          padding: "10px 14px",
                          borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          background: isMe ? "#0d1117" : "white",
                          border: isMe ? "none" : "1px solid #e1e4e8",
                          color: isMe ? "white" : "#0d1117",
                          fontSize: "14px",
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}>
                          {msg.content}
                        </div>
                        <p style={{ fontSize: "10px", color: "#8c959f", padding: "0 4px" }}>
                          {formatTime(msg.createdAt)}
                          {isMe && <span style={{ marginLeft: "4px" }}>{msg.read ? " ✓✓" : " ✓"}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} style={{ padding: "16px 20px", background: "white", borderTop: "1px solid #e1e4e8", display: "flex", gap: "10px" }}>
              <input
                ref={inputRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Type a message..."
                style={{ flex: 1, padding: "10px 14px", border: "1px solid #d0d7de", borderRadius: "24px", fontSize: "14px", outline: "none", background: "#f6f8fa" }}
              />
              <button type="submit" disabled={!content.trim() || sending}
                style={{ width: "40px", height: "40px", borderRadius: "50%", background: !content.trim() || sending ? "#e1e4e8" : "#0d1117", border: "none", cursor: !content.trim() || sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke={!content.trim() || sending ? "#8c959f" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={!content.trim() || sending ? "#8c959f" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
