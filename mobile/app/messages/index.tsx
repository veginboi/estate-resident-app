import { Feather } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { LIST_POLL_MS, formatListTime } from "@/components/chat";
import { colors } from "@/components/theme";
import { Avatar, EmptyState, ErrorState, IconButton, LoadingState, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { useUnread } from "@/lib/unread";
import { useData } from "@/lib/use-data";
import { usePolling } from "@/lib/use-polling";

function ChatAvatar({ conversation, size = 46 }: { conversation: Conversation; size?: number }) {
  return conversation.type === "estate" ? (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
      <Feather name="users" size={size * 0.45} color={colors.white} />
    </View>
  ) : (
    <Avatar name={conversation.title} size={size} />
  );
}

function preview(c: Conversation) {
  const last = c.lastMessage;
  if (!last) return c.type === "estate" ? "Say hello to your neighbours" : "No messages yet";
  if (last.mine) return `You: ${last.body}`;
  return c.type === "estate" ? `${last.senderName}: ${last.body}` : last.body;
}

export default function MessagesScreen() {
  const router = useRouter();
  const unread = useUnread();
  const { data, setData, error, loading, refreshing, refresh } = useData(() => api.getConversations());

  const quietRefresh = useCallback(() => {
    api
      .getConversations()
      .then(setData)
      .catch(() => undefined);
    unread.refresh();
  }, [setData, unread]);

  // Refresh when coming back from a chat, and every few seconds while open.
  useFocusEffect(quietRefresh);
  usePolling(quietRefresh, LIST_POLL_MS);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Messages",
          headerRight: () => <IconButton icon="edit" label="New chat" color={colors.brand} onPress={() => router.push("/messages/new")} />,
        }}
      />
      {loading ? (
        <LoadingState />
      ) : error && !data ? (
        <View style={{ padding: 16 }}>
          <ErrorState message={error} onRetry={refresh} />
        </View>
      ) : (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={data ?? []}
          keyExtractor={(c) => String(c.id)}
          style={{ backgroundColor: colors.white }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
          ListEmptyComponent={<EmptyState>No chats yet.</EmptyState>}
          renderItem={({ item: c }) => (
            <Pressable
              onPress={() => router.push(`/messages/${c.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${c.title}${c.unreadCount ? `, ${c.unreadCount} unread` : ""}. ${preview(c)}`}
              style={({ pressed }) => [
                { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.row },
                pressed && { backgroundColor: colors.brandTint },
              ]}
            >
              <ChatAvatar conversation={c} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Txt weight={c.unreadCount ? "semibold" : "medium"} numberOfLines={1} style={{ flex: 1 }}>
                    {c.title}
                  </Txt>
                  {c.lastMessage && <Txt style={{ fontSize: 12, color: colors.muted }}>{formatListTime(c.lastMessage.createdAt)}</Txt>}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Txt numberOfLines={1} style={{ flex: 1, fontSize: 14, color: c.unreadCount ? colors.ink : colors.muted }}>
                    {preview(c)}
                  </Txt>
                  {c.unreadCount > 0 && (
                    <View style={{ backgroundColor: colors.brand, borderRadius: 999, paddingHorizontal: 7, minWidth: 20, alignItems: "center" }}>
                      <Txt weight="semibold" style={{ color: colors.white, fontSize: 11 }}>
                        {c.unreadCount > 99 ? "99+" : c.unreadCount}
                      </Txt>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </>
  );
}
