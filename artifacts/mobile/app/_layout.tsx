import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather, Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
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
        name="evcilim/[petId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="evcilim/[petId]/vaccinations"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="evcilim/[petId]/appointments"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="evcilim/[petId]/identification"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="evcilim/[petId]/nutrition"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="evcilim/[petId]/notes"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="add-adoption"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="adoption/edit/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="user-profile/[userId]"
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
  // Step 1: Load Inter (Google Fonts) — isolated so icon font errors don't affect it
  const [interLoaded, interError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Step 2: Load icon fonts separately via Font.loadAsync so that:
  //   - errors are caught and don't propagate to interLoaded state
  //   - the native font registration is awaited before we mark ready
  const [iconFontsReady, setIconFontsReady] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      ...Ionicons.font,
      ...Feather.font,
    })
      .catch((_e) => {
        // Fonts may already be registered by Expo Go's pre-bundled assets.
        // If loading fails for that reason the component's own componentDidMount
        // will attempt a second load — so we still proceed.
      })
      .finally(() => {
        setIconFontsReady(true);
      });
  }, []);

  const appReady = (interLoaded || !!interError) && iconFontsReady;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) return null;

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
                          {Platform.OS === "web" ? (
                            <View style={{ flex: 1, width: "100%", maxWidth: 430, alignSelf: "center", overflow: "hidden" }}>
                              <RootLayoutNav />
                            </View>
                          ) : (
                            <RootLayoutNav />
                          )}
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
