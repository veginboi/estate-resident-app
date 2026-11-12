import { View } from "react-native";
import { colors } from "./theme";
import { Txt } from "./ui";

export function Logo({ size = 44, subtitle = "Resident App" }: { size?: number; subtitle?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityRole="header" accessibilityLabel="LincolnEstate">
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}
      >
        <Txt weight="bold" style={{ color: colors.white, fontStyle: "italic", fontSize: size * 0.38 }}>
          LE
        </Txt>
      </View>
      <View>
        <Txt weight="bold" style={{ color: colors.brand, fontSize: size * 0.42, lineHeight: size * 0.56 }}>
          LincolnEstate
        </Txt>
        {subtitle ? (
          <Txt weight="medium" style={{ color: colors.brand, fontSize: 12, lineHeight: 16 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}
