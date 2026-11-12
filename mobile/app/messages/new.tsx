import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@/components/theme";
import { Avatar, EmptyState, ErrorState, LoadingState, Txt } from "@/components/ui";
import { api } from "@/lib/api";
import type { Neighbour } from "@/lib/types";

export default function NewChatScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Neighbour[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api
        .getNeighbours(query)
        .then((r) => active && (setResults(r), setError(null)))
        .catch((e: Error) => active && setError(e.message));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const start = async (n: Neighbour) => {
    setStartingId(n.id);
    setError(null);
    try {
      const conversation = await api.startConversation(n.id);
      router.replace(`/messages/${conversation.id}`);
    } catch (e) {
      setError((e as Error).message);
      setStartingId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Stack.Screen options={{ title: "New chat" }} />
      <View style={{ padding: 16, gap: 12 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or resident code"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Search residents"
          autoFocus
          autoCorrect={false}
          style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 15, color: colors.ink }}
        />
        {error && <ErrorState message={error} />}
      </View>
      {results === null ? (
        <LoadingState />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(n) => String(n.id)}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState>No residents found. Only residents who accept messages are listed.</EmptyState>}
          renderItem={({ item: n }) => (
            <Pressable
              onPress={() => start(n)}
              disabled={startingId !== null}
              accessibilityRole="button"
              accessibilityLabel={`Chat with ${n.name}`}
              style={({ pressed }) => [
                { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.row },
                pressed && { backgroundColor: colors.brandTint },
                startingId !== null && startingId !== n.id && { opacity: 0.5 },
              ]}
            >
              <Avatar name={n.name} size={42} />
              <View style={{ flex: 1 }}>
                <Txt weight="medium">{n.name}</Txt>
                <Txt style={{ fontSize: 12, color: colors.muted }}>
                  {n.residentCode}
                  {n.plot ? ` · Plot ${n.plot}` : ""}
                </Txt>
              </View>
              {startingId === n.id && <Txt style={{ fontSize: 12, color: colors.muted }}>Opening…</Txt>}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
