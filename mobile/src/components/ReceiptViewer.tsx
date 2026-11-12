import * as Sharing from "expo-sharing";
import { useState } from "react";
import { ActivityIndicator, Image, Linking, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import type { BillReceipt } from "@/lib/types";
import { colors } from "./theme";
import { Button, IconButton, Txt } from "./ui";

/**
 * Opens an uploaded receipt. Photos show full screen in the app; PDFs open in the phone's
 * own viewer through the share sheet ("Open in…").
 */
export function useReceiptViewer() {
  const [image, setImage] = useState<{ uri: string; name: string } | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (receipt: BillReceipt) => {
    setOpeningId(receipt.id);
    setError(null);
    try {
      const file = await api.downloadReceipt(receipt.id, receipt.fileName);
      if (file.mimeType.startsWith("image/")) {
        setImage({ uri: file.uri, name: receipt.fileName });
      } else if (Platform.OS === "web") {
        await Linking.openURL(file.uri);
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: file.mimeType, UTI: "com.adobe.pdf", dialogTitle: receipt.fileName });
      } else {
        throw new Error("This phone can't open PDF receipts.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOpeningId(null);
    }
  };

  const viewer = <ImageViewer key={image?.uri ?? "closed"} image={image} onClose={() => setImage(null)} />;

  return { open, openingId, error, clearError: () => setError(null), viewer };
}

function ImageViewer({ image, onClose }: { image: { uri: string; name: string } | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  return (
    <Modal visible={!!image} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: insets.top + 8,
            paddingHorizontal: 12,
            paddingBottom: 8,
            gap: 8,
          }}
        >
          <Txt weight="medium" numberOfLines={1} style={{ flex: 1, color: colors.white }}>
            {image?.name}
          </Txt>
          <IconButton icon="x" label="Close receipt" color={colors.white} onPress={onClose} />
        </View>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close receipt">
          {image && (
            <Image
              source={{ uri: image.uri }}
              style={{ flex: 1 }}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
              accessibilityLabel={`Receipt ${image.name}`}
            />
          )}
          {loading && <ActivityIndicator color={colors.white} style={{ position: "absolute", top: "50%", alignSelf: "center" }} />}
        </Pressable>
        {image && Platform.OS !== "web" && (
          <View style={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
            <Button title="Share or save" icon="share" variant="outline" onPress={() => Sharing.shareAsync(image.uri)} />
          </View>
        )}
      </View>
    </Modal>
  );
}
