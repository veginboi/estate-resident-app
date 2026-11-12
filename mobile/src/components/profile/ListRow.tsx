import { View } from "react-native";
import { colors } from "@/components/theme";
import { IconButton, Txt } from "@/components/ui";

/** One family member or property: a title, a line of details, and edit/remove buttons. */
export function ListRow({
  title,
  details,
  shaded,
  onEdit,
  onRemove,
}: {
  title: string;
  details: string;
  shaded: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, backgroundColor: shaded ? colors.row : colors.white, borderRadius: 6 }}
    >
      <View style={{ flex: 1 }}>
        <Txt weight="medium">{title}</Txt>
        <Txt style={{ color: colors.muted, fontSize: 13 }}>{details}</Txt>
      </View>
      <IconButton icon="edit-2" label={`Edit ${title}`} onPress={onEdit} />
      <IconButton icon="trash-2" label={`Remove ${title}`} onPress={onRemove} color={colors.danger} />
    </View>
  );
}
