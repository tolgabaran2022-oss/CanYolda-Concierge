import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdoptionProvider } from "@/contexts/AdoptionContext";
import { AnimalsProvider } from "@/contexts/AnimalsContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BoostProvider } from "@/contexts/BoostContext";
import { PetsProvider } from "@/contexts/PetsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const currentScreen = segments[1] as string | undefined;
    const openScreens   = ["forgot-password", "reset-password"];
    const isOpenScreen  = openScreens.includes(currentScreen ?? "");

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup && !isOpenScreen) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-animal"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Sokak Hayvanı Ekle",
          headerStyle: { backgroundColor: "#FAF7F0" },
          headerTintColor: "#E07A35",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        }}
      />
      <Stack.Screen
        name="animal/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="add-pet"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Evcil Hayvan Ekle",
          headerStyle: { backgroundColor: "#FAF7F0" },
          headerTintColor: "#E07A35",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        }}
      />
      <Stack.Screen
        name="pet/[id]"
        options={{
          headerShown: true,
          title: "",
          headerStyle: { backgroundColor: "#FAF7F0" },
          headerTintColor: "#E07A35",
        }}
      />
      <Stack.Screen
        name="add-adoption"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="adoption/[id]"
        options={{
          headerShown: true,
          title: "İlan Detayı",
          headerStyle: { backgroundColor: "#FAF7F0" },
          headerTintColor: "#E07A35",
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        }}
      />
      <Stack.Screen
        name="boost-packages"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-post"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="search"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="profile-edit"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="post-detail/[postId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="user-profile/[userId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="follow-list/[userId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="messages"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="pet-profile/[petId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="adoption/edit/[id]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            <AnimalsProvider>
              <PetsProvider>
                <AdoptionProvider>
                  <BoostProvider>
                    <QueryClientProvider client={queryClient}>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <RootLayoutNav />
                      </GestureHandlerRootView>
                    </QueryClientProvider>
                  </BoostProvider>
                </AdoptionProvider>
              </PetsProvider>
            </AnimalsProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
