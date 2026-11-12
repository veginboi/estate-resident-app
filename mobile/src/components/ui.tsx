import { Feather } from "@expo/vector-icons";
import type { ComponentProps, ComponentRef, ReactNode, Ref } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, shadow } from "./theme";

type Weight = keyof typeof fonts;

/** Text in Poppins. React Native picks fonts by family name, so each weight is its own family. */
export function Txt({ weight = "regular", style, ...props }: TextProps & { weight?: Weight }) {
  return <Text {...props} style={[styles.text, { fontFamily: fonts[weight] }, style]} />;
}

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A scrolling screen body with pull-to-refresh. */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  contentStyle,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.page }}
      contentContainerStyle={[{ padding: 16, paddingBottom: 32, gap: 16 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

type ButtonVariant = "primary" | "outline" | "danger" | "ghost";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ComponentProps<typeof Feather>["name"];
  style?: StyleProp<ViewStyle>;
}) {
  const fg = variant === "outline" ? colors.brand : variant === "ghost" ? colors.muted : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && { backgroundColor: pressed ? colors.brandDark : colors.brand },
        variant === "danger" && { backgroundColor: pressed ? colors.dangerDark : colors.danger },
        variant === "outline" && { borderWidth: 1, borderColor: colors.brand, backgroundColor: pressed ? colors.brandTint : "transparent" },
        variant === "ghost" && { backgroundColor: pressed ? colors.row : "transparent" },
        disabled && { opacity: 0.6 },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={18} color={fg} />}
      <Txt weight="medium" style={{ color: fg, fontSize: 15 }}>
        {title}
      </Txt>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.muted,
}: {
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [{ padding: 8, borderRadius: 6 }, pressed && { backgroundColor: colors.row }]}
    >
      <Feather name={icon} size={18} color={color} />
    </Pressable>
  );
}

export function Avatar({ name, size = 40, style }: { name: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <View
      accessibilityLabel={name}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      <Txt weight="semibold" style={{ color: colors.brandDark, fontSize: size * 0.36, lineHeight: size * 0.5 }}>
        {initials}
      </Txt>
    </View>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string; ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt weight="medium" style={{ fontSize: 14 }}>
        {label}
      </Txt>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 110, textAlignVertical: "top" }, style]}
      />
    </View>
  );
}

/** A row of chips for picking one option. Easier to tap than a dropdown on a phone. */
export function ChoiceField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Txt weight="medium" style={{ fontSize: 14 }}>
        {label}
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const active = o === value;
          return (
            <Chip key={o} label={o} active={active} onPress={() => onChange(o)} role="radio" />
          );
        })}
      </View>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  role = "button",
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  role?: "button" | "radio";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === "radio" ? { checked: active } : { selected: active }}
      style={[styles.chip, active && { backgroundColor: colors.brand, borderColor: colors.brand }]}
    >
      <Txt weight="medium" style={{ fontSize: 13, color: active ? colors.white : colors.ink }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** A bottom sheet for forms and confirmations. */
export function Sheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close">
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
        </Pressable>
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]} accessibilityViewIsModal>
          <View style={styles.sheetHeader}>
            <Txt weight="semibold" style={{ fontSize: 18, color: colors.brand }} accessibilityRole="header">
              {title}
            </Txt>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function LoadingState() {
  return (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Txt style={{ color: colors.danger, fontSize: 14 }}>{message}</Txt>
      {onRetry && (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Txt weight="semibold" style={{ color: colors.danger, fontSize: 14, marginTop: 6 }}>
            Try again
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <Txt style={{ paddingVertical: 32, textAlign: "center", color: colors.muted, fontSize: 14 }}>{children}</Txt>;
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.brandSoft, borderRadius: 6, padding: 14 }}>
      <Txt weight="medium" style={{ color: colors.brandDark }}>
        {children}
      </Txt>
    </View>
  );
}

/** Formats "18:45" as "6:45pm", as shown in the design. */
export function formatTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

export const textStyles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 14 },
  heading: { fontSize: 18, color: colors.brand },
}) satisfies Record<string, TextStyle>;

const styles = StyleSheet.create({
  text: { color: colors.ink, fontSize: 15 },
  card: { backgroundColor: colors.white, borderRadius: 8, ...shadow },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 6,
    paddingHorizontal: 20,
    minHeight: 46,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 6, padding: 14 },
});
