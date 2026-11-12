import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { api } from "@/lib/api";
import { colors } from "./theme";
import { Button, Sheet, SuccessNote, Txt } from "./ui";

const EMERGENCY_LINE = "+234 810 000 0000";

/** The red "life under threat" button: asks for confirmation, then alerts estate security. */
export function EmergencyButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const send = async () => {
    setStatus("sending");
    try {
      await api.sendEmergencyAlert();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const close = () => {
    setOpen(false);
    setStatus("idle");
  };

  const call = () => Linking.openURL(`tel:${EMERGENCY_LINE.replace(/\s/g, "")}`);

  return (
    <>
      {compact ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Life under threat: send an emergency alert"
          hitSlop={6}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: pressed ? colors.dangerDark : colors.danger,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
          })}
        >
          <Feather name="alert-triangle" size={14} color={colors.white} />
          <Txt weight="bold" style={{ color: colors.white, fontSize: 12 }}>
            SOS
          </Txt>
        </Pressable>
      ) : (
        <Button title="life under threat" variant="danger" icon="alert-triangle" onPress={() => setOpen(true)} />
      )}

      <Sheet title="Emergency alert" open={open} onClose={close}>
        {status === "sent" ? (
          <>
            <SuccessNote>Alert sent. Estate security has been notified and is on its way.</SuccessNote>
            <Button title={`Call ${EMERGENCY_LINE}`} variant="outline" icon="phone" onPress={call} />
            <Button title="Close" onPress={close} />
          </>
        ) : (
          <>
            <Txt>This alerts estate security and the estate admin straight away. Only use it in a real emergency.</Txt>
            {status === "error" && (
              <Txt style={{ color: colors.danger, fontSize: 14 }}>
                The alert didn&apos;t go through. Try again, or call {EMERGENCY_LINE}.
              </Txt>
            )}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button title="Cancel" variant="ghost" onPress={close} style={{ flex: 1 }} />
              <Button
                title={status === "sending" ? "Sending…" : "Send alert"}
                variant="danger"
                onPress={send}
                disabled={status === "sending"}
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </Sheet>
    </>
  );
}
