/**
 * useOAuthLogin
 *
 * Production-ready OAuth helpers for Google (PKCE) and Apple (native).
 * Returns { token, user } from backend. Token stored in AsyncStorage.
 *
 * Required env vars:
 *   EXPO_PUBLIC_GOOGLE_CLIENT_ID  – Google Cloud Console iOS OAuth 2.0 Client ID
 *   EXPO_PUBLIC_API_URL            – https://<domain>/api  (or /api for web)
 */

import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "/api");

export interface OAuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar?: string | null;
}

export type OAuthResult = {
  token: string;
  user: OAuthUser;
  isNewUser: boolean;
};

export type OAuthError = {
  code: "no_credentials" | "cancel" | "no_token" | "network" | "server" | "platform";
  message: string;
};

/* ── helpers ────────────────────────────────────────────────────── */

async function postToBackend(
  path: string,
  body: Record<string, string>
): Promise<{ token: string; user: OAuthUser; isNewUser: boolean }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Giriş başarısız");
  return data as { token: string; user: OAuthUser; isNewUser: boolean };
}

/* ── Google (PKCE via expo-auth-session) ────────────────────────────── */
export function useGoogleLogin() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  };

  // Redirect URI: expo-auth-session resolves via scheme (com.canyoldasi.app) for native
  // and window.location.origin for web automatically.
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "com.canyoldasi.app",
    preferLocalhost: false,
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
      extraParams: { nonce: Math.random().toString(36).slice(2) },
    },
    discovery
  );

  async function login(): Promise<OAuthResult> {
    if (!clientId) {
      throw Object.assign(
        new Error(
          "EXPO_PUBLIC_GOOGLE_CLIENT_ID ayarlı değil.\n" +
            "Google Cloud Console → Credentials → iOS OAuth 2.0 Client ID oluşturun."
        ),
        { code: "no_credentials" as const }
      );
    }
    const result = await promptAsync();
    if (result.type !== "success") {
      throw Object.assign(
        new Error("Google girişi iptal edildi."),
        { code: result.type === "cancel" ? ("cancel" as const) : ("no_token" as const) }
      );
    }
    const idToken = result.params.id_token;
    if (!idToken) {
      throw Object.assign(
        new Error("Google'dan kimlik token'ı alınamadı."),
        { code: "no_token" as const }
      );
    }
    return postToBackend("/auth/google", { idToken });
  }

  return { login, request, isConfigured: !!clientId };
}

/* ── Apple (native expo-apple-authentication) ────────────────────────────── */
export function useAppleLogin() {
  async function login(): Promise<OAuthResult> {
    if (Platform.OS !== "ios") {
      throw Object.assign(
        new Error("Apple ile giriş yalnızca iOS cihazlarda kullanılabilir."),
        { code: "platform" as const }
      );
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw Object.assign(
        new Error("Apple'dan kimlik token'ı alınamadı."),
        { code: "no_token" as const }
      );
    }

    const fullName = [
      credential.fullName?.givenName,
      credential.fullName?.familyName,
    ]
      .filter(Boolean)
      .join(" ") || null;

    return postToBackend("/auth/apple", {
      identityToken: credential.identityToken,
      ...(fullName ? { fullName } : {}),
    });
  }

  return { login, isConfigured: Platform.OS === "ios" };
}
