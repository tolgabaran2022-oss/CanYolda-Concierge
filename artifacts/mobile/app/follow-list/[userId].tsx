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
import { useTheme } from "@/hooks/useTheme";
import {
  apiGetFollowersList,
  apiGetFollowingList,
  apiToggleFollow,
  type FollowUser,
} from "@/lib/socialApi";

export default function FollowListScreen() {
  const T               = useTheme();
  const insets          = useSafeAreaInsets();
  const router          = useRouter();
  const { user }        = useAuth();
  const { userId, mode } = useLocalSearchParams<{ userId: string; mode: "followers" | "following" }>();

  const isFollowers = mode !== "following";
  const title       = isFollowers ? "Takipçiler" : "Takip Edilenler";

  const [users,   setUsers]   = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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

  /* Deduplicate: prefer real user over @seed- duplicate */
  const deduplicated = useMemo(() => {
    const seen = new Map<string, FollowUser>();
    for (const u of users) {
      const key = u.username.toLowerCase();
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, u);
      } else if (existing.userId.startsWith("seed-") && !u.userId.startsWith("seed-")) {
        seen.set(key, u);
      }
    }
    return [...seen.values()];
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deduplicated;
    return deduplicated.filter((u) => u.username.toLowerCase().includes(q));
  }, [deduplicated, query]);

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

  const renderItem = ({ item }: { item: FollowUser }) => {
    const isSelf   = user && (user.id === item.userId || user.username === item.userId);
    const initial  = item.username.charAt(0).toUpperCase();
    return (
      <Pressable
        style={({ pressed }) => [
          S.row,
          { backgroundColor: pressed ? T.bgSecondary : T.bg },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/user-profile/${encodeURIComponent(item.userId)}`);
        }}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={S.avatar} contentFit="cover" />
        ) : (
          <View style={[S.avatar, S.avatarInitials, { backgroundColor: T.purple + "22" }]}>
            <Text style={[S.avatarInitialTxt, { color: T.purple }]}>{initial}</Text>
          </View>
        )}

        <Text style={[S.username, { color: T.text }]} numberOfLines={1}>
          @{item.username}
        </Text>

        {!isSelf && (
          <Pressable
            style={({ pressed }) => [
              S.followBtn,
              item.isFollowing
                ? {
                    backgroundColor: pressed ? T.purple : "transparent",
                    borderWidth: 1.5,
                    borderColor: T.purple,
                  }
                : { backgroundColor: T.purple },
            ]}
            onPress={() => handleToggle(item)}
          >
            {({ pressed }: { pressed: boolean }) => (
              <Text
                style={[
                  S.followBtnTxt,
                  {
                    color: item.isFollowing && !pressed ? T.purple : "#FFF",
                  },
                ]}
              >
                {item.isFollowing
                  ? pressed ? "Takibi Bırak" : "Takiptesin"
                  : "Takip Et"}
              </Text>
            )}
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[S.root, { backgroundColor: T.bg, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[S.header, { backgroundColor: T.bg, borderBottomColor: T.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={14} style={S.backBtn}>
          <Ionicons name="chevron-back" size={26} color={T.purple} />
        </Pressable>
        <Text style={[S.title, { color: T.text }]}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search bar */}
      <View style={[S.searchRow, { backgroundColor: T.input }]}>
        <Ionicons name="search-outline" size={17} color={T.textMuted} style={S.searchIcon} />
        <TextInput
          style={[S.searchInput, { color: T.text }]}
          placeholder="Ara"
          placeholderTextColor={T.placeholder}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={T.purple} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={S.center}>
          <Ionicons name="people-outline" size={52} color={T.textFaint} />
          <Text style={[S.emptyTitle, { color: T.textMuted }]}>
            {query
              ? "Sonuç bulunamadı"
              : isFollowers
                ? "Henüz takipçi yok"
                : "Henüz takip edilen kullanıcı yok"}
          </Text>
          {!query && (
            <Text style={[S.emptySub, { color: T.textFaint }]}>
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
          ItemSeparatorComponent={() => (
            <View style={[S.separator, { backgroundColor: T.border }]} />
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
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
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
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
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
    marginTop: -4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  avatarInitials: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialTxt: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  username: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    marginLeft: 8,
  },
  followBtnTxt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  separator: {
    height: 0.5,
    marginLeft: 74,
  },
});
