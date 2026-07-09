import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiGetFollowersList,
  apiGetFollowingList,
  apiToggleFollow,
  type FollowUser,
} from "@/lib/socialApi";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";
const MUTED       = "#9187B0";
const TEXT        = "#1C1033";
const BORDER      = "#EDE8F8";
const PLACEHOLDER = "https://loremflickr.com/100/100/cat?lock=1";

export default function FollowListScreen() {
  const insets            = useSafeAreaInsets();
  const router            = useRouter();
  const { user }          = useAuth();
  const { userId, mode }  = useLocalSearchParams<{ userId: string; mode: "followers" | "following" }>();

  const isFollowers = mode !== "following";
  const title       = isFollowers ? "Takipçiler" : "Takip Edilenler";

  const [users,   setUsers]   = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  /* ── Load list ── */
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = isFollowers
        ? await apiGetFollowersList(userId, user?.id)
        : await apiGetFollowingList(userId, user?.id);
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.id, isFollowers]);

  useEffect(() => { load(); }, [load]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q)
    );
  }, [users, query]);

  /* ── Toggle follow ── */
  const handleToggle = async (target: FollowUser) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (target.isFollowing) {
      Alert.alert(
        "Takipten Çık",
        `@${target.username} kullanıcısını takipten çıkarmak istiyor musun?`,
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Takipten Çık",
            style: "destructive",
            onPress: async () => {
              try {
                const { following: newF } = await apiToggleFollow(user.id, target.userId);
                setUsers((p) =>
                  p.map((u) => u.userId === target.userId ? { ...u, isFollowing: newF } : u)
                );
              } catch { /* ignore */ }
            },
          },
        ]
      );
    } else {
      try {
        const { following: newF } = await apiToggleFollow(user.id, target.userId);
        setUsers((p) =>
          p.map((u) => u.userId === target.userId ? { ...u, isFollowing: newF } : u)
        );
      } catch { /* ignore */ }
    }
  };

  /* ── Row ── */
  const renderItem = ({ item }: { item: FollowUser }) => {
    const isSelf = user && (user.id === item.userId || user.username === item.userId);
    return (
      <Pressable
        style={({ pressed }) => [S.row, pressed && { backgroundColor: "#F3EFF9" }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/user-profile/${encodeURIComponent(item.userId)}`);
        }}
      >
        <Image
          source={{ uri: item.avatarUrl || PLACEHOLDER }}
          style={S.avatar}
          contentFit="cover"
        />
        <Text style={S.username} numberOfLines={1}>@{item.username}</Text>
        {!isSelf && (
          <Pressable
            style={({ pressed }) => [
              S.followBtn,
              item.isFollowing && S.followBtnActive,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => handleToggle(item)}
          >
            <Text style={[S.followBtnTxt, item.isFollowing && S.followBtnTxtActive]}>
              {item.isFollowing ? "Takiptesin" : "Takip Et"}
            </Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[S.root, { paddingTop: topPad }]}>
      {/* ── Header ── */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={14} style={S.backBtn}>
          <Ionicons name="chevron-back" size={26} color={PURPLE_DARK} />
        </Pressable>
        <Text style={S.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Search bar ── */}
      <View style={S.searchRow}>
        <Ionicons name="search-outline" size={17} color={MUTED} style={S.searchIcon} />
        <TextInput
          style={S.searchInput}
          placeholder="Ara"
          placeholderTextColor={MUTED}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={S.center}>
          <Ionicons name="people-outline" size={52} color="#C5BAE8" />
          <Text style={S.emptyTitle}>
            {query
              ? "Sonuç bulunamadı"
              : isFollowers
                ? "Henüz takipçi yok"
                : "Henüz takip edilen kullanıcı yok"}
          </Text>
          {!query && (
            <Text style={S.emptySub}>
              {isFollowers
                ? "Takipçiler burada görünecek"
                : "Takip edilen kullanıcılar burada görünecek"}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.userId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={S.separator} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  backBtn: {
    width: 40,
    alignItems: "flex-start",
    paddingLeft: 4,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: TEXT,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    marginBottom: 4,
    backgroundColor: "#EDE8F8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: TEXT,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: MUTED,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#B0A8C8",
    textAlign: "center",
    paddingHorizontal: 40,
    marginTop: -4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: "#E0D9F5",
  },
  username: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: TEXT,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: PURPLE,
    marginLeft: 8,
  },
  followBtnActive: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: PURPLE,
  },
  followBtnTxt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
  },
  followBtnTxtActive: {
    color: PURPLE,
  },
  separator: {
    height: 0.5,
    backgroundColor: BORDER,
    marginLeft: 74,
  },
});
