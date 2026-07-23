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
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nextProvider, useTranslation } from "react-i18next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdoptionProvider } from "@/contexts/AdoptionContext";
import { AnimalsProvider } from "@/contexts/AnimalsContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BoostProvider } from "@/contexts/BoostContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { PetsProvider } from "@/contexts/PetsContext";
import { PetPremiumProvider } from "@/contexts/PetPremiumContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import i18n, { initI18n } from "@/i18n";

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30 * 1000,
      retry:                2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const currentScreen = (segments as readonly string[])[1];
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
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="add-animal"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen name="animal/[id]" />
      <Stack.Screen
        name="add-pet"
        options={{
          presentation: "modal",
          headerShown: true,
          title: t("pets.addPetTitle"),
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
      <Stack.Screen name="evcilim/[petId]" />
      <Stack.Screen name="evcilim/[petId]/vaccinations" />
      <Stack.Screen name="evcilim/[petId]/appointments" />
      <Stack.Screen name="evcilim/[petId]/identification" />
      <Stack.Screen name="evcilim/[petId]/nutrition" />
      <Stack.Screen name="evcilim/[petId]/notes" />
      <Stack.Screen name="evcilim/[petId]/reminders" />
      <Stack.Screen name="evcilim/[petId]/medications" />
      <Stack.Screen name="evcilim/[petId]/documents" />
      <Stack.Screen name="evcilim-premium" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="add-adoption" />
      <Stack.Screen name="adoption/edit/[id]" />
      <Stack.Screen name="user-profile/[userId]" />
      <Stack.Screen name="pet-profile/[petId]" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="adoption-notifications" options={{ headerShown: false }} />
      <Stack.Screen name="adoption/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="boost-packages" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
      <Stack.Screen name="adoption-request/[listingId]" options={{ headerShown: false }} />
      <Stack.Screen name="help-update/[animalId]" options={{ headerShown: false }} />
      <Stack.Screen name="evcilim/[petId]/appointments/[apptId]" options={{ headerShown: false }} />
      <Stack.Screen name="evcilim/add" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <LanguageProvider>
              <AuthProvider>
                <AnimalsProvider>
                  <PetsProvider>
                    <PetPremiumProvider>
                    <AdoptionProvider>
                      <BoostProvider>
                        <QueryClientProvider client={queryClient}>
                          <GestureHandlerRootView style={{ flex: 1 }}>
                            {Platform.OS === "web" ? (
                              <View
                                style={{
                                  flex: 1,
                                  width: "100%",
                                  maxWidth: 430,
                                  alignSelf: "center",
                                  overflow: "hidden",
                                }}
                              >
                                <RootLayoutNav />
                              </View>
                            ) : (
                              <RootLayoutNav />
                            )}
                          </GestureHandlerRootView>
                        </QueryClientProvider>
                      </BoostProvider>
                    </AdoptionProvider>
                    </PetPremiumProvider>
                  </PetsProvider>
                </AnimalsProvider>
              </AuthProvider>
            </LanguageProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}
