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

type Message = {
  _id: string;
  senderId: User;
  receiverId: User;
  content: string;
  read: boolean;
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
  const [showChat, setShowChat] = useState(false); // mobile: show chat or list
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      const convs = (data.conversations || []).map((msg: Message) => {
        const isMe = msg.senderId._id === session?.user?.id;
        const partner = isMe ? msg.receiverId : msg.senderId;
        return { ...msg, partnerId: partner._id, partnerName: partner.name, partnerImage: partner.image };
      });
      setConversations(convs);
      setLoadingConvs(false);
    } catch { setLoadingConvs(false); }
  }, [session?.user?.id]);

  const fetchMessages = useCallback(async (userId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/messages?with=${userId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { }
    setLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [session, fetchConversations]);

  useEffect(() => {
    if (!withUserId || !session?.user) return;
    fetchMessages(withUserId);
    setShowChat(true);
    fetch(`/api/users/${withUserId}`)
      .then(r => r.json())
      .then(d => setActiveUser(d.user || { _id: withUserId, name: "User" }))
      .catch(() => setActiveUser({ _id: withUserId, name: "User" }));
  }, [withUserId, session, fetchMessages]);

  useEffect(() => {
    if (!session?.user?.id || !activeUser) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?with=${activeUser._id}`);
        const data = await res.json();
        if (data.messages) {
          setMessages(prev => {
            const hasNew = data.messages.some((m: Message) => !prev.find(p => p._id === m._id));
            if (!hasNew) return prev;
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            return data.messages;
          });
        }
      } catch { }
    }, 3000);

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
    } catch { }

    return () => {
      clearInterval(interval);
      try {
        if (channelName) getPusherClient()?.unsubscribe(channelName);
      } catch { }
    };
  }, [session?.user?.id, activeUser, fetchConversations]);

  async function selectUser(userId: string, user: User) {
    setActiveUser(user);
    setShowChat(true);
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
        body: JSON.stringify({ receiverId: activeUser._id, content, listingId: listingId || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setContent("");
        setMessages(prev => prev.find(m => m._id === data.message._id) ? prev : [...prev, data.message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        fetchConversations();
      }
    } catch { }
    setSending(false);
  }

  function formatTime(d: string) {
    const date = new Date(d);
    const isToday = date.toDateString() === new Date().toDateString();
    return isToday
      ? date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  }

  function getInitial(name?: string) { return name?.[0]?.toUpperCase() || "?"; }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <>
      <style>{`
        .messages-wrap {
          display: flex;
          height: calc(100vh - 64px);
          background: #f6f8fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .conv-sidebar {
          width: 300px;
          flex-shrink: 0;
          background: white;
          border-right: 1px solid #e1e4e8;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
          background: #f6f8fa;
        }
        @media (max-width: 768px) {
          .conv-sidebar {
            width: 100%;
            position: absolute;
            inset: 0;
            z-index: 2;
            transform: translateX(0);
            transition: transform 0.25s ease;
          }
          .conv-sidebar.slide-out {
            transform: translateX(-100%);
          }
          .chat-area {
            position: absolute;
            inset: 0;
            z-index: 1;
            transform: translateX(100%);
            transition: transform 0.25s ease;
            background: white;
          }
          .chat-area.slide-in {
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="messages-wrap">

        {/* Conversations sidebar */}
        <div className={`conv-sidebar ${showChat ? "slide-out" : ""}`}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e1e4e8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#0d1117" }}>Messages</h1>
            <span style={{ fontSize: "12px", color: "#8c959f" }}>{conversations.length} chats</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingConvs ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: "flex", gap: "10px", padding: "12px 0", opacity: 0.4 }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e1e4e8", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: "12px", background: "#e1e4e8", borderRadius: "4px", marginBottom: "6px", width: "60%" }} />
                      <div style={{ height: "10px", background: "#e1e4e8", borderRadius: "4px", width: "80%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>💬</div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#0d1117", marginBottom: "4px" }}>No messages yet</p>
                <p style={{ fontSize: "12px", color: "#8c959f" }}>Start by messaging a seller from any listing</p>
              </div>
            ) : conversations.map(conv => {
              const isActive = activeUser?._id === conv.partnerId;
              const isMe = conv.senderId._id === session?.user?.id;
              return (
                <div key={conv.partnerId} onClick={() => selectUser(conv.partnerId, { _id: conv.partnerId, name: conv.partnerName, image: conv.partnerImage })}
                  style={{ padding: "12px 16px", cursor: "pointer", background: isActive ? "#f6f8fa" : "white", borderLeft: `3px solid ${isActive ? "#0d1117" : "transparent"}`, display: "flex", alignItems: "center", gap: "10px", transition: "background 0.1s" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, flexShrink: 0, position: "relative" }}>
                    {conv.partnerImage ? (
                      <Image src={conv.partnerImage} alt="" fill sizes="38px" style={{ borderRadius: "50%", objectFit: "cover" }} />
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
        <div className={`chat-area ${showChat ? "slide-in" : ""}`}>
          {!activeUser ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", height: "100%" }}>
              <div style={{ fontSize: "56px" }}>💬</div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#0d1117" }}>Select a conversation</p>
              <p style={{ fontSize: "13px", color: "#57606a" }}>Choose from the left to start chatting</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Chat header */}
              <div style={{ padding: "12px 16px", background: "white", borderBottom: "1px solid #e1e4e8", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {/* Back button — mobile only */}
                <button
                  onClick={() => setShowChat(false)}
                  style={{ width: "32px", height: "32px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  className="mobile-only">
                  ←
                </button>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#0d1117", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, position: "relative", flexShrink: 0 }}>
                  {activeUser.image ? (
                    <Image src={activeUser.image} alt="" fill sizes="36px" style={{ borderRadius: "50%", objectFit: "cover" }} />
                  ) : getInitial(activeUser.name)}
                </div>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#0d1117" }}>{activeUser.name}</p>
                  <p style={{ fontSize: "11px", color: "#57606a" }}>AutoMarket member</p>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: "center", color: "#8c959f", fontSize: "13px", marginTop: "40px" }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#8c959f", fontSize: "13px", marginTop: "60px" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>👋</div>
                    Say hello to {activeUser.name}!
                  </div>
                ) : messages.map((msg, i) => {
                  const isMe = msg.senderId._id === session?.user?.id;
                  const showDate = i === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString();
                  return (
                    <div key={msg._id}>
                      {showDate && (
                        <div style={{ textAlign: "center", margin: "10px 0" }}>
                          <span style={{ fontSize: "11px", color: "#8c959f", background: "#f0f0f0", padding: "3px 10px", borderRadius: "20px" }}>
                            {new Date(msg.createdAt).toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: "2px" }}>
                          <div style={{ padding: "10px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isMe ? "#0d1117" : "white", border: isMe ? "none" : "1px solid #e1e4e8", color: isMe ? "white" : "#0d1117", fontSize: "14px", lineHeight: 1.5, wordBreak: "break-word" }}>
                            {msg.content}
                          </div>
                          <p style={{ fontSize: "10px", color: "#8c959f", padding: "0 4px" }}>
                            {formatTime(msg.createdAt)}
                            {isMe && <span style={{ marginLeft: "3px" }}>{msg.read ? "✓✓" : "✓"}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} style={{ padding: "12px 16px", background: "white", borderTop: "1px solid #e1e4e8", display: "flex", gap: "8px", flexShrink: 0 }}>
                <input ref={inputRef} value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: "10px 14px", border: "1px solid #d0d7de", borderRadius: "24px", fontSize: "14px", outline: "none", background: "#f6f8fa", minWidth: 0 }} />
                <button type="submit" disabled={!content.trim() || sending}
                  style={{ width: "40px", height: "40px", borderRadius: "50%", background: !content.trim() || sending ? "#e1e4e8" : "#0d1117", border: "none", cursor: !content.trim() || sending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke={!content.trim() || sending ? "#8c959f" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={!content.trim() || sending ? "#8c959f" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
