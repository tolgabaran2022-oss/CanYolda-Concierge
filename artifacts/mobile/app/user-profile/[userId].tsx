import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { apiGetOrCreateConversation } from "@/lib/messagesApi";
import { apiGetUserPets, type ApiPetProfile } from "@/lib/petsApi";
import { apiGetFullProfile } from "@/lib/socialApi";

const CAT_FALLBACK = "https://loremflickr.com/300/300/cat?lock=500";

const PET_TYPE_LABELS: Record<string, string> = {
  cat: "Kedi", dog: "Köpek", bird: "Kuş",
  rabbit: "Tavşan", hamster: "Hamster", fish: "Balık",
};

/* ── TopBar ─────────────────────────────────────────────────── */
function TopBar({ username, onBack }: { username: string; onBack: () => void }) {
  const T = useTheme();
  return (
    <View style={[TB.row, { borderBottomColor: T.border }]}>
      <Pressable onPress={onBack} style={TB.back} hitSlop={12}>
        <Icon name="chevron-back" size={22} color={T.text} />
      </Pressable>
      <Text style={[TB.title, { color: T.text }]} numberOfLines={1}>
        {username ? `@${username}` : "Profil"}
      </Text>
      <View style={TB.placeholder} />
    </View>
  );
}

/* ── Screen ─────────────────────────────────────────────────── */
export default function UserProfileScreen() {
  const T           = useTheme();
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const { user, token } = useAuth();
  const { userId }  = useLocalSearchParams<{ userId: string }>();

  const [username,   setUsername]   = useState("");
  const [avatarUrl,  setAvatarUrl]  = useState(CAT_FALLBACK);
  const [bio,        setBio]        = useState("");
  const [location,   setLocation]   = useState("");
  const [pets,       setPets]       = useState<ApiPetProfile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [msgSending, setMsgSending] = useState(false);

  const isOwn  = user?.id === userId;
  const topPad = Platform.OS === "web" ? 16 : insets.top;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profile, userPets] = await Promise.all([
        apiGetFullProfile(userId).catch(() => null),
        apiGetUserPets(userId).catch(() => [] as ApiPetProfile[]),
      ]);

      if (profile) {
        setUsername(profile.username ?? profile.name ?? "");
        setAvatarUrl(profile.avatarUrl || CAT_FALLBACK);
        setBio(profile.bio ?? "");
        setLocation(profile.location ?? "");
        setPets(userPets);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleMessage = async () => {
    if (!user || !userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMsgSending(true);
    try {
      const conv = await apiGetOrCreateConversation(token ?? "", userId);
      router.push(`/messages/${encodeURIComponent(conv.id)}` as any);
    } catch {
      router.push("/messages" as any);
    } finally {
      setMsgSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[S.root, { backgroundColor: T.bg, paddingTop: topPad }]}>
        <TopBar username="" onBack={() => router.back()} />
        <View style={S.center}>
          <ActivityIndicator size="large" color={T.purple} />
        </View>
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={[S.root, { backgroundColor: T.bg, paddingTop: topPad }]}>
        <TopBar username="Profil" onBack={() => router.back()} />
        <View style={S.center}>
          <View style={[S.notFoundCircle, { backgroundColor: T.purpleFaint }]}>
            <Icon name="person-outline" size={36} color={T.purple} />
          </View>
          <Text style={[S.notFoundTitle, { color: T.text }]}>Profil bulunamadı</Text>
          <Text style={[S.notFoundSub, { color: T.textMuted }]}>
            Bu kullanıcı mevcut değil veya hesabını silmiş olabilir.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[S.root, { backgroundColor: T.bg, paddingTop: topPad }]}>
      <TopBar username={username} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Profile header ───────────────────────────── */}
        <View style={[S.profileBlock, { backgroundColor: T.card, borderBottomColor: T.border }]}>
          <View style={S.avatarRow}>
            <Image
              source={{ uri: avatarUrl }}
              style={S.avatar}
              contentFit="cover"
            />
            <View style={S.profileInfo}>
              <Text style={[S.displayName, { color: T.text }]}>@{username}</Text>
              {bio ? (
                <Text style={[S.bio, { color: T.textMuted }]} numberOfLines={3}>
                  {bio}
                </Text>
              ) : null}
              {location ? (
                <View style={S.locRow}>
                  <Icon name="location-outline" size={13} color={T.textMuted} />
                  <Text style={[S.locTxt, { color: T.textMuted }]}>{location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Action buttons ──────────────────────────── */}
          <View style={S.btnRow}>
            {isOwn ? (
              <Pressable
                style={({ pressed }) => [
                  S.btnOutline, S.btnFlex,
                  { backgroundColor: T.bgSecondary, borderColor: T.border },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => router.push("/profile-edit" as any)}
              >
                <Text style={[S.btnOutlineTxt, { color: T.text }]}>Profili Düzenle</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  S.btnOutline, S.btnFlex,
                  { backgroundColor: T.bgSecondary, borderColor: T.border },
                  { opacity: (pressed || msgSending) ? 0.7 : 1 },
                ]}
                onPress={handleMessage}
                disabled={msgSending}
              >
                {msgSending ? (
                  <ActivityIndicator size="small" color={T.purple} />
                ) : (
                  <>
                    <Icon name="chatbubble-outline" size={15} color={T.purple} style={{ marginRight: 5 }} />
                    <Text style={[S.btnOutlineTxt, { color: T.purple }]}>Mesaj Gönder</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Pets section ─────────────────────────────── */}
        {pets.length > 0 && (
          <View style={S.petsSection}>
            <Text style={[S.sectionTitle, { color: T.text }]}>Evcil Hayvanları</Text>
            {pets.map((pet) => (
              <Pressable
                key={pet.id}
                style={[S.petRow, { backgroundColor: T.card, borderColor: T.border }]}
                onPress={() => router.push(`/pet-profile/${encodeURIComponent(pet.id)}` as any)}
              >
                <Image
                  source={{ uri: pet.avatarUrl || CAT_FALLBACK }}
                  style={S.petThumb}
                  contentFit="cover"
                />
                <View style={S.petInfo}>
                  <Text style={[S.petName, { color: T.text }]}>{pet.name}</Text>
                  <Text style={[S.petType, { color: T.textMuted }]}>
                    {PET_TYPE_LABELS[pet.type] ?? pet.type}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={16} color={T.textFaint} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const TB = StyleSheet.create({
  row:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  back:        { width: 36, alignItems: "flex-start" },
  title:       { flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  placeholder: { width: 36 },
});

const S = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

  profileBlock: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInfo: { flex: 1, gap: 4 },
  displayName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  bio:         { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  locRow:      { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt:      { fontSize: 13, fontFamily: "Inter_400Regular" },

  btnRow:       { flexDirection: "row", gap: 10 },
  btnFlex:      { flex: 1 },
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  btnOutlineTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  petsSection:  { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  petRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  petThumb: { width: 48, height: 48, borderRadius: 8 },
  petInfo:  { flex: 1 },
  petName:  { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  petType:  { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  notFoundCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  notFoundTitle:  { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  notFoundSub:    { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
