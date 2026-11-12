import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THREAD_POLL_MS, clock, dayLabel, mergeMessages, sameDay } from "@/components/chat";
import { colors, fonts } from "@/components/theme";
import { EmptyState, ErrorState, LoadingState, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { ChatMessage, Conversation } from "@/lib/types";
import { useUnread } from "@/lib/unread";
import { usePolling } from "@/lib/use-polling";

type Row = { kind: "message"; message: ChatMessage; showName: boolean } | { kind: "day"; key: string; label: string };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const insets = useSafeAreaInsets();
  const unread = useUnread();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.getConversation(conversationId), api.getMessages(conversationId)])
      .then(([c, page]) => {
        if (!active) return;
        setConversation(c);
        setMessages(page.messages);
        setHasMore(page.hasMore);
        setError(null);
        unread.refresh();
      })
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const lastId = messages.at(-1)?.id ?? 0;
  const poll = useCallback(async () => {
    if (loading || error) return;
    try {
      const page = await api.getMessages(conversationId, { after: lastId });
      if (page.messages.length) {
        setMessages((m) => mergeMessages(m, page.messages));
        unread.refresh();
      }
    } catch {
      /* try again on the next tick */
    }
  }, [conversationId, lastId, loading, error, unread]);
  usePolling(poll, THREAD_POLL_MS);

  const loadOlder = async () => {
    const first = messages[0];
    if (!first || !hasMore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api.getMessages(conversationId, { before: first.id });
      setMessages((m) => mergeMessages(page.messages, m));
      setHasMore(page.hasMore);
    } catch {
      /* the resident can scroll up again to retry */
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
      setMessages((m) => mergeMessages(m, [message]));
      setDraft("");
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  // The list is inverted (newest at the bottom, next to the composer), so rows go newest first.
  const rows = useMemo(() => {
    const out: Row[] = [];
    messages.forEach((m, i) => {
      const date = new Date(m.createdAt);
      const prev = messages[i - 1];
      const newDay = !prev || !sameDay(new Date(prev.createdAt), date);
      if (newDay) out.push({ kind: "day", key: `day-${m.id}`, label: dayLabel(date) });
      const showName = conversation?.type === "estate" && !m.mine && (newDay || prev?.sender.id !== m.sender.id);
      out.push({ kind: "message", message: m, showName });
    });
    return out.reverse();
  }, [messages, conversation?.type]);

  const blocked = conversation?.type === "direct" && conversation.resident && !conversation.resident.acceptsMessages;
  const subtitle =
    conversation?.type === "estate" ? "Everyone in the estate" : conversation?.resident ? `Resident ${conversation.resident.residentCode}` : "";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.page }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
    >
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Txt weight="semibold" numberOfLines={1} style={{ color: colors.brand, fontSize: 16 }}>
                {conversation?.title ?? ""}
              </Txt>
              {subtitle ? <Txt style={{ color: colors.muted, fontSize: 11 }}>{subtitle}</Txt> : null}
            </View>
          ),
        }}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <View style={{ padding: 16 }}>
          <ErrorState message={error} />
        </View>
      ) : (
        <>
          <FlatList
            inverted
            data={rows}
            keyExtractor={(r) => (r.kind === "day" ? r.key : String(r.message.id))}
            contentContainerStyle={{ padding: 12, gap: 6, flexGrow: 1 }}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={loadingOlder ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 12 }} /> : undefined}
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }] }}>
                <EmptyState>{conversation?.type === "estate" ? "No messages yet. Start the conversation!" : "Say hello 👋"}</EmptyState>
              </View>
            }
            renderItem={({ item }) =>
              item.kind === "day" ? (
                <Txt weight="medium" style={{ textAlign: "center", color: colors.muted, fontSize: 12, marginVertical: 8 }}>
                  {item.label}
                </Txt>
              ) : (
                <Bubble message={item.message} showName={item.showName} />
              )
            }
          />

          <View style={{ backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.row, padding: 10, paddingBottom: 10 + insets.bottom, gap: 8 }}>
            {sendError && <ErrorState message={sendError} />}
            {blocked ? (
              <Txt style={{ textAlign: "center", color: colors.muted, fontSize: 14, paddingVertical: 6 }}>
                {conversation?.title} isn&apos;t accepting messages.
              </Txt>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Write a message…"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="Message"
                  multiline
                  maxLength={2000}
                  style={{
                    flex: 1,
                    maxHeight: 120,
                    minHeight: 42,
                    borderWidth: 1,
                    borderColor: colors.line,
                    borderRadius: 21,
                    paddingHorizontal: 14,
                    paddingTop: 10,
                    paddingBottom: 10,
                    fontFamily: fonts.regular,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                />
                <Pressable
                  onPress={send}
                  disabled={sending || !draft.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  style={({ pressed }) => ({
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? colors.brandDark : colors.brand,
                    opacity: sending || !draft.trim() ? 0.5 : 1,
                  })}
                >
                  {sending ? <ActivityIndicator color={colors.white} size="small" /> : <Feather name="send" size={18} color={colors.white} />}
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

function Bubble({ message: m, showName }: { message: ChatMessage; showName: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: m.mine ? "flex-end" : "flex-start" }}>
      <View
        accessible
        accessibilityLabel={`${m.mine ? "You" : m.sender.name}, ${clock(new Date(m.createdAt))}: ${m.body}`}
        style={{
          maxWidth: "80%",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 14,
          borderBottomRightRadius: m.mine ? 4 : 14,
          borderBottomLeftRadius: m.mine ? 14 : 4,
          backgroundColor: m.mine ? colors.brand : colors.white,
        }}
      >
        {showName && (
          <Txt weight="semibold" style={{ color: colors.brandDark, fontSize: 12, marginBottom: 2 }}>
            {m.sender.name}
          </Txt>
        )}
        <Txt style={{ color: m.mine ? colors.white : colors.ink, fontSize: 15 }}>{m.body}</Txt>
        <Txt style={{ color: m.mine ? "rgba(255,255,255,0.8)" : colors.muted, fontSize: 11, textAlign: "right", marginTop: 2 }}>
          {clock(new Date(m.createdAt))}
        </Txt>
      </View>
    </View>
  );
}
