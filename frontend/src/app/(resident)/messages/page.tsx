"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { ChatThread, ConversationList, LIST_POLL_MS, NewChatModal, UNREAD_CHANGED_EVENT } from "@/components/chat";
import { Card, ErrorState, LoadingState, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { useData } from "@/lib/use-data";
import { usePolling } from "@/lib/use-polling";

function MessagesView() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = Number(params.get("chat")) || null;
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { data: conversations, setData, error, loading } = useData(() => api.getConversations());

  const refreshList = useCallback(() => {
    api
      .getConversations()
      .then(setData)
      .catch(() => undefined);
    window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));
  }, [setData]);
  usePolling(refreshList, LIST_POLL_MS);

  const select = (id: number | null) => router.push(id ? `/messages?chat=${id}` : "/messages", { scroll: false });

  return (
    <Card className="flex h-[calc(100dvh-12rem)] min-h-[420px] overflow-hidden lg:h-[calc(100dvh-10rem)]">
      {/* On phones, show either the list or the open chat */}
      <div className={cx("w-full border-r border-row lg:block lg:w-80 lg:shrink-0 xl:w-96", selectedId !== null && "hidden")}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-4"><ErrorState message={error} /></div>
        ) : (
          <ConversationList
            conversations={conversations ?? []}
            selectedId={selectedId}
            onSelect={select}
            onNewChat={() => setNewChatOpen(true)}
          />
        )}
      </div>
      <div className={cx("min-w-0 flex-1", selectedId === null && "hidden lg:block")}>
        {selectedId ? (
          <ChatThread conversationId={selectedId} onBack={() => select(null)} onActivity={refreshList} />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted">
            Pick a chat on the left, or start a new one with a neighbour.
          </div>
        )}
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onStarted={(c) => {
          setNewChatOpen(false);
          select(c.id);
        }}
      />
    </Card>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MessagesView />
    </Suspense>
  );
}
