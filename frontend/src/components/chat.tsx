"use client";

import { ArrowLeft, MessageSquarePlus, Send, Users } from "lucide-react";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, Conversation, Neighbour } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";
import { Avatar, Button, EmptyState, ErrorState, LoadingState, Modal, cx } from "./ui";

export const THREAD_POLL_MS = 4000;
export const LIST_POLL_MS = 10000;
export const BADGE_POLL_MS = 30000;

/** Tells the sidebar badge to refresh straight away instead of waiting for its next check. */
export const UNREAD_CHANGED_EVENT = "le:unread-changed";

// ---- formatting ----

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const yesterday = () => new Date(Date.now() - 86_400_000);

function clock(d: Date) {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

/** "6:45pm" today, "Yesterday", or "12 Nov" for the chat list. */
export function formatListTime(iso: string) {
  const d = new Date(iso);
  if (sameDay(d, new Date())) return clock(d);
  if (sameDay(d, yesterday())) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function dayLabel(d: Date) {
  if (sameDay(d, new Date())) return "Today";
  if (sameDay(d, yesterday())) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function ChatAvatar({ conversation, size = 44 }: { conversation: Conversation; size?: number }) {
  return conversation.type === "estate" ? (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand text-white" style={{ width: size, height: size }}>
      <Users size={size * 0.5} aria-hidden />
    </span>
  ) : (
    <Avatar name={conversation.title} size={size} />
  );
}

// ---- chat list ----

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-row px-4 py-3">
        <h1 className="text-lg font-semibold text-brand">Messages</h1>
        <Button variant="outline" onClick={onNewChat} className="px-3 py-1.5 sm:text-sm">
          <MessageSquarePlus size={18} aria-hidden /> New chat
        </Button>
      </div>
      <ul className="flex-1 overflow-y-auto" aria-label="Chats">
        {conversations.map((c) => {
          const last = c.lastMessage;
          const preview = last
            ? `${last.mine ? "You" : c.type === "estate" ? last.senderName : ""}${last.mine || c.type === "estate" ? ": " : ""}${last.body}`
            : c.type === "estate"
              ? "Say hello to your neighbours"
              : "No messages yet";
          return (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c.id)}
                aria-current={c.id === selectedId ? "true" : undefined}
                className={cx(
                  "flex w-full items-center gap-3 border-b border-row px-4 py-3 text-left transition-colors hover:bg-brand-tint",
                  c.id === selectedId && "bg-brand-tint",
                )}
              >
                <ChatAvatar conversation={c} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cx("truncate", c.unreadCount ? "font-semibold text-ink" : "font-medium text-ink")}>{c.title}</span>
                    {last && <span className="shrink-0 text-xs text-muted">{formatListTime(last.createdAt)}</span>}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={cx("truncate text-sm", c.unreadCount ? "text-ink" : "text-muted")}>{preview}</span>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 rounded-full bg-brand px-2 text-xs font-semibold leading-5 text-white">
                        <span className="sr-only">Unread messages: </span>
                        {c.unreadCount > 99 ? "99+" : c.unreadCount}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---- one chat ----

const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const seen = new Set(current.map((m) => m.id));
  return [...current, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id);
};

export function ChatThread({
  conversationId,
  onBack,
  onActivity,
}: {
  conversationId: number;
  onBack: () => void;
  /** Called after messages are read or sent, so the chat list can refresh. */
  onActivity: () => void;
}) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const keepOffsetFromBottom = useRef<number | null>(null);

  // Load the chat and its latest messages.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setMessages([]);
    setDraft("");
    setSendError(null);
    stickToBottom.current = true;
    Promise.all([api.getConversation(conversationId), api.getMessages(conversationId)])
      .then(([c, page]) => {
        if (!active) return;
        setConversation(c);
        setMessages(page.messages);
        setHasMore(page.hasMore);
        onActivity();
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const lastId = messages.at(-1)?.id ?? 0;

  // Check for new messages every few seconds.
  const poll = useCallback(async () => {
    if (loading || error) return;
    try {
      const page = await api.getMessages(conversationId, { after: lastId });
      if (page.messages.length) {
        setMessages((m) => mergeMessages(m, page.messages));
        onActivity();
      }
    } catch {
      /* try again on the next tick */
    }
  }, [conversationId, lastId, loading, error, onActivity]);
  usePolling(poll, THREAD_POLL_MS);

  // Keep the view pinned to the newest message, unless the resident has scrolled up to read.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (keepOffsetFromBottom.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffsetFromBottom.current;
      keepOffsetFromBottom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    const first = messages[0];
    if (!first) return;
    setLoadingOlder(true);
    try {
      const page = await api.getMessages(conversationId, { before: first.id });
      const el = scroller.current;
      keepOffsetFromBottom.current = el ? el.scrollHeight - el.scrollTop : null;
      setMessages((m) => mergeMessages(page.messages, m));
      setHasMore(page.hasMore);
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await api.sendMessage(conversationId, text);
      stickToBottom.current = true;
      setMessages((m) => mergeMessages(m, [message]));
      setDraft("");
      onActivity();
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const blocked = conversation?.type === "direct" && conversation.resident && !conversation.resident.acceptsMessages;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-row px-4 py-3">
        <button onClick={onBack} aria-label="Back to chats" className="rounded p-1 text-brand hover:bg-brand-tint lg:hidden">
          <ArrowLeft size={22} />
        </button>
        {conversation && <ChatAvatar conversation={conversation} size={40} />}
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-ink">{conversation?.title ?? " "}</h2>
          <p className="truncate text-xs text-muted">
            {conversation?.type === "estate"
              ? "Everyone in the estate can read this chat"
              : conversation?.resident
                ? `Resident ${conversation.resident.residentCode}`
                : " "}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto bg-page px-4 py-4" aria-live="polite">
        {loading ? (
          <LoadingState label="Loading messages…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            {hasMore && (
              <div className="mb-4 text-center">
                <Button variant="ghost" onClick={loadOlder} disabled={loadingOlder} className="sm:text-sm">
                  {loadingOlder ? "Loading…" : "Show earlier messages"}
                </Button>
              </div>
            )}
            {messages.length === 0 && (
              <EmptyState>{conversation?.type === "estate" ? "No messages yet. Start the conversation!" : "Say hello 👋"}</EmptyState>
            )}
            <ol className="space-y-2">
              {messages.map((m, i) => {
                const date = new Date(m.createdAt);
                const prev = messages[i - 1];
                const newDay = !prev || !sameDay(new Date(prev.createdAt), date);
                const showName = conversation?.type === "estate" && !m.mine && (newDay || prev?.sender.id !== m.sender.id);
                return (
                  <Fragment key={m.id}>
                    {newDay && (
                      <li className="py-2 text-center text-xs font-medium text-muted" aria-hidden>
                        {dayLabel(date)}
                      </li>
                    )}
                    <li className={cx("flex", m.mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cx(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.08)] sm:max-w-[65%]",
                          m.mine ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-white text-ink",
                        )}
                      >
                        {showName && <p className="mb-0.5 text-xs font-semibold text-brand-dark">{m.sender.name}</p>}
                        {!m.mine && !showName && <span className="sr-only">{m.sender.name}: </span>}
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={cx("mt-1 text-right text-[11px]", m.mine ? "text-white/80" : "text-muted")}>
                          <time dateTime={m.createdAt}>{clock(date)}</time>
                        </p>
                      </div>
                    </li>
                  </Fragment>
                );
              })}
            </ol>
          </>
        )}
      </div>

      {/* Composer */}
      {!loading && !error && (
        <div className="border-t border-row bg-white p-3">
          {sendError && <div className="mb-2"><ErrorState message={sendError} /></div>}
          {blocked ? (
            <p className="py-2 text-center text-sm text-muted">{conversation?.title} isn&apos;t accepting messages.</p>
          ) : (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label htmlFor="chat-message" className="sr-only">Message</label>
              <textarea
                id="chat-message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Write a message…"
                className="max-h-32 min-h-10 flex-1 resize-none rounded border border-line px-3 py-2 text-sm outline-none [field-sizing:content] focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
              <Button type="submit" disabled={sending || !draft.trim()} aria-label="Send message" className="h-10 px-4">
                <Send size={18} aria-hidden />
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ---- start a chat ----

export function NewChatModal({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: (c: Conversation) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Neighbour[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .getNeighbours(query)
        .then((r) => active && (setResults(r), setError(null)))
        .catch((e: Error) => active && setError(e.message));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setError(null);
      setStartingId(null);
    }
  }, [open]);

  const start = async (n: Neighbour) => {
    setStartingId(n.id);
    setError(null);
    try {
      onStarted(await api.startConversation(n.id));
    } catch (e) {
      setError((e as Error).message);
      setStartingId(null);
    }
  };

  return (
    <Modal title="New chat" open={open} onClose={onClose}>
      <label htmlFor="neighbour-search" className="sr-only">Search residents</label>
      <input
        id="neighbour-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or resident code"
        autoFocus
        className="mb-4 w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
      />
      {error && <div className="mb-3"><ErrorState message={error} /></div>}
      {results === null ? (
        <LoadingState />
      ) : results.length === 0 ? (
        <EmptyState>No residents found. Only residents who accept messages are listed.</EmptyState>
      ) : (
        <ul className="-mx-2 max-h-80 overflow-y-auto">
          {results.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => start(n)}
                disabled={startingId !== null}
                className="flex w-full items-center gap-3 rounded px-2 py-2.5 text-left hover:bg-brand-tint disabled:opacity-60"
              >
                <Avatar name={n.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{n.name}</span>
                  <span className="block text-xs text-muted">
                    {n.residentCode}
                    {n.plot && ` · Plot ${n.plot}`}
                  </span>
                </span>
                {startingId === n.id && <span className="text-xs text-muted">Opening…</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
