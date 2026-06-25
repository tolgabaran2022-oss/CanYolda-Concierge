/**
 * useOAuthLogin
 *
 * Expo-compatible OAuth helper for Google, Apple, and Facebook.
 *
 * Google + Facebook → expo-auth-session (browser-based PKCE flow)
 * Apple            → expo-apple-authentication (native iOS module)
 *
 * Each method returns a { token, user } pair from the backend,
 * where `token` is the JWT to store in AsyncStorage.
 *
 * REQUIRED ENV VARS (set in Replit Secrets):
 *   EXPO_PUBLIC_GOOGLE_CLIENT_ID   – iOS OAuth 2.0 client ID from Google Cloud Console
 *   EXPO_PUBLIC_FACEBOOK_APP_ID    – App ID from Facebook Developers Portal
 *   EXPO_PUBLIC_API_URL            – e.g. https://<your-replit-domain>/api
 */

import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "/api";

export interface OAuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

async function postToBackend(
  path: string,
  body: Record<string, string>
): Promise<{ token: string; user: OAuthUser }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Giriş başarısız");
  return data as { token: string; user: OAuthUser };
}

/* ── Google ──────────────────────────────────────────────── */
export function useGoogleLogin() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint:         "https://oauth2.googleapis.com/token",
  };

  const redirectUri = AuthSession.makeRedirectUri();

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

  async function login() {
    if (!clientId) {
      throw new Error(
        "EXPO_PUBLIC_GOOGLE_CLIENT_ID henüz ayarlanmamış.\n" +
        "Google Cloud Console → APIs & Services → Credentials → iOS OAuth 2.0 Client ID oluşturun."
      );
    }
    const result = await promptAsync();
    if (result.type !== "success") {
      throw new Error("Google girişi iptal edildi.");
    }
    const idToken = result.params.id_token;
    if (!idToken) throw new Error("Google'dan token alınamadı.");
    return postToBackend("/auth/google", { idToken });
  }

  return { login, request };
}

/* ── Apple ───────────────────────────────────────────────── */
export function useAppleLogin() {
  async function login() {
    if (Platform.OS !== "ios") {
      throw new Error("Apple ile giriş yalnızca iOS cihazlarda kullanılabilir.");
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple'dan kimlik token'ı alınamadı.");
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

  return { login };
}

/* ── Facebook ────────────────────────────────────────────── */
export function useFacebookLogin() {
  const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? "";

  const discovery = {
    authorizationEndpoint: "https://www.facebook.com/dialog/oauth",
    tokenEndpoint:         "https://graph.facebook.com/oauth/access_token",
  };

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: appId,
      redirectUri,
      scopes: ["public_profile", "email"],
      responseType: AuthSession.ResponseType.Token,
    },
    discovery
  );

  async function login() {
    if (!appId) {
      throw new Error(
        "EXPO_PUBLIC_FACEBOOK_APP_ID henüz ayarlanmamış.\n" +
        "Facebook Developers → My Apps → uygulamanızın App ID'sini ekleyin."
      );
    }
    const result = await promptAsync();
    if (result.type !== "success") {
      throw new Error("Facebook girişi iptal edildi.");
    }
    const accessToken = result.params.access_token;
    if (!accessToken) throw new Error("Facebook'tan token alınamadı.");
    return postToBackend("/auth/facebook", { accessToken });
  }

  return { login, request };
}
