import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetchUserPosts, type ApiPost } from "@/lib/feedApi";
import {
  apiCheckFollowing,
  apiGetFollowCounts,
  apiGetFollowersList,
  apiGetFollowingList,
  apiGetFullProfile,
  apiToggleFollow,
  type FollowCounts,
  type FollowUser,
  type SocialUser,
} from "@/lib/socialApi";

const { width: SW } = Dimensions.get("window");
const GRID_GAP  = 2;
const GRID_ITEM = (SW - GRID_GAP * 2) / 3;
const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";
const WHITE       = "#FFFFFF";
const CAT_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

const SEED_AVATARS: Record<string, string> = {
  "miyav.house":      "https://loremflickr.com/100/100/kitten?lock=11",
  "patili.bir.dunya": "https://loremflickr.com/100/100/puppy?lock=22",
  "koydeki.patiler":  "https://loremflickr.com/100/100/dog?lock=44",
  "pati_dostum":      "https://loremflickr.com/100/100/tabby?lock=33",
  "sokak.dostlari":   "https://loremflickr.com/100/100/puppy?lock=66",
  "kucuk.pawlar":     "https://loremflickr.com/100/100/cat?lock=55",
  "minnoslar.evi":    "https://loremflickr.com/100/100/kitten?lock=77",
  "patici.sultan":    "https://loremflickr.com/100/100/dog?lock=88",
};

type FollowListMode = "followers" | "following" | null;

export default function UserProfileScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { user } = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [profile,      setProfile]      = useState<SocialUser | null>(null);
  const [bio,          setBio]          = useState("");
  const [location,     setLocation]     = useState("");
  const [posts,        setPosts]        = useState<ApiPost[]>([]);
  const [counts,       setCounts]       = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following,    setFollowing]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState(false);

  /* ── Follow list modal ── */
  const [listMode,      setListMode]      = useState<FollowListMode>(null);
  const [listUsers,     setListUsers]     = useState<FollowUser[]>([]);
  const [listLoading,   setListLoading]   = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isOwn  = user?.id === userId || user?.username === userId || user?.name === userId;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [postsData, countsData] = await Promise.all([
        apiFetchUserPosts(userId).catch(() => [] as ApiPost[]),
        apiGetFollowCounts(userId).catch(() => ({ followers: 0, following: 0 })),
      ]);
      setPosts(postsData);
      setCounts(countsData);

      /* Try to get full profile for bio/location */
      const fullProfile = await apiGetFullProfile(userId).catch(() => null);
      if (fullProfile) {
        setBio(fullProfile.bio ?? "");
        setLocation(fullProfile.location ?? "");
        setProfile({
          userId,
          username:  fullProfile.username ?? fullProfile.name ?? userId,
          avatarUrl: fullProfile.avatarUrl || (postsData[0]?.avatarUrl) || SEED_AVATARS[userId] || CAT_DEFAULT,
          postCount: fullProfile.postsCount ?? postsData.length,
        });
      } else if (postsData.length > 0) {
        setProfile({
          userId,
          username:  postsData[0].username,
          avatarUrl: postsData[0].avatarUrl || SEED_AVATARS[postsData[0].username] || CAT_DEFAULT,
          postCount: postsData.length,
        });
      } else {
        setProfile({
          userId,
          username:  userId,
          avatarUrl: SEED_AVATARS[userId] || CAT_DEFAULT,
          postCount: 0,
        });
      }

      if (user && !isOwn) {
        const { following: f } = await apiCheckFollowing(user.id, userId).catch(() => ({ following: false }));
        setFollowing(f);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, user, isOwn]);

  useEffect(() => { load(); }, [load]);

  const handleFollow = async () => {
    if (!user || !userId || isOwn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setToggling(true);
    try {
      const { following: newFollowing } = await apiToggleFollow(user.id, userId);
      setFollowing(newFollowing);
      setCounts((prev) => ({
        ...prev,
        followers: prev.followers + (newFollowing ? 1 : -1),
      }));
    } catch {
      /* ignore */
    } finally {
      setToggling(false);
    }
  };

  /* ── Open followers/following sheet ── */
  const openList = async (mode: "followers" | "following") => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setListMode(mode);
    setListLoading(true);
    setListUsers([]);
    try {
      const data = mode === "followers"
        ? await apiGetFollowersList(userId, user?.id)
        : await apiGetFollowingList(userId, user?.id);
      setListUsers(data);
    } catch {
      setListUsers([]);
    } finally {
      setListLoading(false);
    }
  };

  const handleListToggleFollow = async (targetId: string) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { following: newF } = await apiToggleFollow(user.id, targetId);
      setListUsers((prev) => prev.map((u) => u.userId === targetId ? { ...u, isFollowing: newF } : u));
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <View style={[S.root, { paddingTop: topPad }]}>
        <View style={S.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={PURPLE_DARK} />
          </Pressable>
          <Text style={S.headerTitle}>Profil</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={S.center}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      </View>
    );
  }

  const avatarUri = profile?.avatarUrl || CAT_DEFAULT;
  const username  = profile?.username || userId || "";

  return (
    <View style={[S.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={PURPLE_DARK} />
        </Pressable>
        <Text style={S.headerTitle} numberOfLines={1}>@{username}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Profile info */}
        <View style={S.profileWrap}>
          {/* Avatar */}
          <LinearGradient
            colors={["#C278F0", "#7B5EA7", "#5B3FD6"]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={S.avatarRing}
          >
            <View style={S.avatarBorder}>
              <Image source={{ uri: avatarUri }} style={S.avatarImg} contentFit="cover" />
            </View>
          </LinearGradient>

          <Text style={S.username}>@{username}</Text>

          {bio ? <Text style={S.bio}>{bio}</Text> : null}
          {location ? (
            <View style={S.locationRow}>
              <Ionicons name="location-outline" size={13} color="#8874A8" />
              <Text style={S.locationTxt}>{location}</Text>
            </View>
          ) : null}

          {/* Stats row — tappable */}
          <View style={S.statsRow}>
            <StatPill value={profile?.postCount ?? 0} label="Gönderi" onPress={undefined} />
            <StatPill value={counts.followers} label="Takipçi" onPress={() => openList("followers")} />
            <StatPill value={counts.following} label="Takip" onPress={() => openList("following")} />
          </View>

          {/* Follow / Edit button */}
          {!isOwn && (
            <View style={S.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  S.followBtn,
                  following && S.followBtnActive,
                  { opacity: pressed || toggling ? 0.8 : 1 },
                ]}
                onPress={handleFollow}
                disabled={toggling}
              >
                {toggling ? (
                  <ActivityIndicator size="small" color={following ? PURPLE : WHITE} />
                ) : (
                  <Text style={[S.followBtnText, following && S.followBtnTextActive]}>
                    {following ? "Takiptesin ✓" : "Takip Et"}
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [S.msgBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Ionicons name="chatbubble-outline" size={18} color={PURPLE} />
              </Pressable>
            </View>
          )}
          {isOwn && (
            <Pressable
              style={({ pressed }) => [S.editProfileBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/profile-edit")}
            >
              <Text style={S.editProfileBtnText}>Profili Düzenle</Text>
            </Pressable>
          )}
        </View>

        {/* Posts grid */}
        {posts.length === 0 ? (
          <View style={S.emptyGrid}>
            <Ionicons name="images-outline" size={48} color="#C5BAE8" />
            <Text style={S.emptyText}>Henüz gönderi yok</Text>
          </View>
        ) : (
          <View style={S.grid}>
            {posts.map((p, idx) => (
              <Pressable
                key={p.id}
                style={[S.gridItem, idx % 3 !== 2 && { marginRight: GRID_GAP }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/post-detail/${encodeURIComponent(p.id)}`);
                }}
              >
                <Image source={{ uri: p.imageUrl }} style={S.gridImg} contentFit="cover" />
                <View style={S.gridOverlay}>
                  <Ionicons name="heart" size={12} color={WHITE} />
                  <Text style={S.gridLikes}>{p.likesCount}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Followers / Following modal ── */}
      <Modal
        visible={listMode !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setListMode(null)}
      >
        <View style={[L.root, { paddingTop: insets.top + 8 }]}>
          <View style={L.header}>
            <View style={{ width: 32 }} />
            <Text style={L.title}>
              {listMode === "followers" ? "Takipçiler" : "Takip Edilenler"}
            </Text>
            <Pressable onPress={() => setListMode(null)} hitSlop={12}>
              <Ionicons name="close" size={24} color={PURPLE_DARK} />
            </Pressable>
          </View>

          {listLoading ? (
            <View style={L.center}>
              <ActivityIndicator size="large" color={PURPLE} />
            </View>
          ) : listUsers.length === 0 ? (
            <View style={L.center}>
              <Ionicons name="people-outline" size={48} color="#C5BAE8" />
              <Text style={L.empty}>
                {listMode === "followers" ? "Henüz takipçi yok" : "Henüz takip edilen yok"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={listUsers}
              keyExtractor={(u) => u.userId}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              renderItem={({ item }) => (
                <Pressable
                  style={L.row}
                  onPress={() => {
                    setListMode(null);
                    router.push(`/user-profile/${encodeURIComponent(item.userId)}`);
                  }}
                >
                  <Image
                    source={{ uri: item.avatarUrl || CAT_DEFAULT }}
                    style={L.avatar}
                    contentFit="cover"
                  />
                  <Text style={L.username} numberOfLines={1}>@{item.username}</Text>
                  {item.userId !== user?.id && (
                    <Pressable
                      style={[L.followBtn, item.isFollowing && L.followBtnActive]}
                      onPress={() => handleListToggleFollow(item.userId)}
                    >
                      <Text style={[L.followTxt, item.isFollowing && L.followTxtActive]}>
                        {item.isFollowing ? "Takiptesin" : "Takip Et"}
                      </Text>
                    </Pressable>
                  )}
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function StatPill({
  value,
  label,
  onPress,
}: {
  value: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [S.statPill, onPress && pressed && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </Pressable>
  );
}

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 0 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.10)",
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK, maxWidth: 200 },

  profileWrap: {
    alignItems: "center", paddingVertical: 28, paddingHorizontal: 24,
    backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.10)",
    gap: 10,
  },

  avatarRing:   { width: 92, height: 92, borderRadius: 46, alignItems: "center", justifyContent: "center", padding: 3 },
  avatarBorder: { width: 86, height: 86, borderRadius: 43, overflow: "hidden", borderWidth: 2.5, borderColor: WHITE },
  avatarImg:    { width: "100%", height: "100%" },

  username: { fontSize: 17, fontFamily: "Inter_700Bold", color: PURPLE_DARK },

  bio: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555", textAlign: "center", paddingHorizontal: 16, lineHeight: 19 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8874A8" },

  statsRow:  { flexDirection: "row", gap: 32, marginVertical: 4 },
  statPill:  { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8874A8" },

  actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },

  followBtn: {
    paddingHorizontal: 48, paddingVertical: 11, borderRadius: 12,
    backgroundColor: PURPLE,
    ...Platform.select({
      ios:     { shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  followBtnActive: {
    backgroundColor: "rgba(123,94,167,0.10)",
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.30)",
  },
  followBtnText:       { fontSize: 15, fontFamily: "Inter_700Bold", color: WHITE },
  followBtnTextActive: { color: PURPLE },

  msgBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(123,94,167,0.10)",
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.22)",
    alignItems: "center", justifyContent: "center",
  },

  editProfileBtn: {
    paddingHorizontal: 32, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(123,94,167,0.10)",
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.22)",
  },
  editProfileBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: PURPLE_DARK },

  grid:        { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  gridItem:    { width: GRID_ITEM, height: GRID_ITEM, marginBottom: GRID_GAP, position: "relative" },
  gridImg:     { width: "100%", height: "100%" },
  gridOverlay: {
    position: "absolute", bottom: 4, left: 4,
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  gridLikes: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: WHITE },

  emptyGrid: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#AAAACC" },
});

/* ── Follow list modal styles ── */
const L = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(123,94,167,0.10)",
  },
  title:  { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  empty:  { fontSize: 14, fontFamily: "Inter_400Regular", color: "#AAAACC" },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F5F2FF",
    gap: 12,
  },
  avatar:   { width: 46, height: 46, borderRadius: 23, backgroundColor: "#EEE" },
  username: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: PURPLE_DARK },

  followBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10,
    backgroundColor: PURPLE,
  },
  followBtnActive: {
    backgroundColor: "transparent",
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.35)",
  },
  followTxt:       { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },
  followTxtActive: { color: PURPLE },
});
