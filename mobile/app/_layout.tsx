import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors, fonts } from "@/components/theme";
import { SessionProvider, useSession } from "@/lib/session";

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTint }}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

function RootStack() {
  const { signedIn } = useSession();
  if (signedIn === null) return <Splash />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.brand,
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.brand },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.page },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="section/[name]" options={{ title: "" }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SessionProvider>{fontsLoaded || fontError ? <RootStack /> : <Splash />}</SessionProvider>
    </SafeAreaProvider>
  );
}
