import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiSearchUsers, type SocialUser } from "@/lib/socialApi";
import { useTheme } from "@/hooks/useTheme";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";
const CAT_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

const SUGGESTED: SocialUser[] = [
  { userId: "miyav.house",     username: "miyav.house",     avatarUrl: "https://loremflickr.com/100/100/kitten?lock=11", postCount: 8 },
  { userId: "patili.bir.dunya",username: "patili.bir.dunya",avatarUrl: "https://loremflickr.com/100/100/puppy?lock=22",  postCount: 6 },
  { userId: "sokak.dostlari",  username: "sokak.dostlari",  avatarUrl: "https://loremflickr.com/100/100/puppy?lock=66",  postCount: 5 },
  { userId: "koydeki.patiler", username: "koydeki.patiler", avatarUrl: "https://loremflickr.com/100/100/dog?lock=44",   postCount: 5 },
  { userId: "kucuk.pawlar",    username: "kucuk.pawlar",    avatarUrl: "https://loremflickr.com/100/100/cat?lock=55",   postCount: 4 },
];

export default function SearchScreen() {
  const T      = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SocialUser[]>([]);
  const [loading,  setLoading]  = useState(false);
  const debounce   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await apiSearchUsers(q.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.length === 0) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounce.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, doSearch]);

  const goProfile = (u: SocialUser) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user-profile/${encodeURIComponent(u.userId)}`);
  };

  const displayList = query.trim() ? results : SUGGESTED;

  return (
    <View style={[S.root, { paddingTop: topPad, backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[S.header, { backgroundColor: T.card, borderBottomColor: T.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={T.text} />
        </Pressable>
        <Text style={[S.headerTitle, { color: T.text }]}>Ara</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search bar */}
      <View style={[S.searchBar, { backgroundColor: T.card, borderColor: T.border }]}>
        <Ionicons name="search-outline" size={18} color={T.textFaint} />
        <TextInput
          style={[S.searchInput, { color: T.text, outlineStyle: "none" } as any]}
          value={query}
          onChangeText={setQuery}
          placeholder="Kullanıcı ara..."
          placeholderTextColor={T.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoFocus
        />
        {loading && <ActivityIndicator size="small" color={T.purple} />}
      </View>

      {/* Section label */}
      <Text style={[S.sectionLabel, { color: T.textFaint }]}>
        {query.trim() ? `"${query}" için sonuçlar` : "Önerilen Kullanıcılar"}
      </Text>

      <FlatList
        data={displayList}
        keyExtractor={(u) => u.userId}
        contentContainerStyle={[S.list, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && query.trim() ? (
            <View style={S.empty}>
              <Ionicons name="person-outline" size={48} color="#C5BAE8" />
              <Text style={[S.emptyText, { color: T.textMuted }]}>Kullanıcı bulunamadı</Text>
            </View>
          ) : null
        }
        renderItem={({ item: u }) => (
          <Pressable
            style={({ pressed }) => [S.userRow, { backgroundColor: T.card, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => goProfile(u)}
          >
            <Image
              source={{ uri: u.avatarUrl || CAT_DEFAULT }}
              style={S.avatar}
              contentFit="cover"
            />
            <View style={S.userInfo}>
              <Text style={[S.userName, { color: T.text }]}>@{u.username}</Text>
              <Text style={[S.userMeta, { color: T.textMuted }]}>{u.postCount} gönderi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
          </Pressable>
        )}
      />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.10)",
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginTop: 14, marginBottom: 6,
    backgroundColor: "#FFF",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(123,94,167,0.18)",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: PURPLE_DARK,
  },

  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_700Bold", color: "#8888AA",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginHorizontal: 18, marginTop: 12, marginBottom: 6,
  },

  list:      { paddingTop: 4 },
  userRow:   {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.06)",
  },
  avatar:    { width: 48, height: 48, borderRadius: 24 },
  userInfo:  { flex: 1, gap: 3 },
  userName:  { fontSize: 15, fontFamily: "Inter_600SemiBold", color: PURPLE_DARK },
  userMeta:  { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8888AA" },

  empty:     { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#AAAACC" },
});
