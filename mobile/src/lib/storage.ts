import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

/**
 * Small JSON files kept on the device (in the app's document folder, which the system doesn't
 * clear). On web, localStorage is used instead.
 */
export async function readJson<T>(name: string): Promise<T | null> {
  try {
    if (Platform.OS === "web") {
      const raw = localStorage.getItem(name);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const file = new File(Paths.document, name);
    return file.exists ? (JSON.parse(await file.text()) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson(name: string, value: unknown): Promise<void> {
  try {
    const text = JSON.stringify(value);
    if (Platform.OS === "web") {
      localStorage.setItem(name, text);
      return;
    }
    const file = new File(Paths.document, name);
    if (!file.exists) file.create();
    await file.write(text);
  } catch {
    /* storage unavailable; the cart still works until the app closes */
  }
}
