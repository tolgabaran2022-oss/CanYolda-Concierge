import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Dimensions,
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
import { ProfileStoryAvatar } from "@/components/ProfileStoryAvatar";
import { apiFetchUserPosts, apiFetchBookmarkedPosts } from "@/lib/feedApi";
import type { ApiPost } from "@/lib/feedApi";
import { apiGetFollowCounts } from "@/lib/socialApi";
import type { FollowCounts } from "@/lib/socialApi";

const _RAW_PROF_W = Dimensions.get("window").width;
const SW          = Math.min(_RAW_PROF_W, 430);
const GRID_GAP    = 2;
const GRID_ITEM   = (SW - GRID_GAP * 2) / 3;

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";
const BG          = "#F9F8FF";
const CAT_AVATAR_DEFAULT = "https://loremflickr.com/300/300/cat?lock=500";

const TAB_FLOAT_H    = 64;
const TAB_BOTTOM_GAP = Platform.OS === "web" ? 12 : 10;

type GridTab = "posts" | "saved";

export default function ProfileScreen() {
  const T      = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const topPad       = Platform.OS === "web" ? 67 : insets.top;
  const tabClearance = insets.bottom + TAB_BOTTOM_GAP + TAB_FLOAT_H;

  const [gridTab,       setGridTab]       = useState<GridTab>("posts");
  const [userPosts,     setUserPosts]     = useState<ApiPost[]>([]);
  const [savedPosts,    setSavedPosts]    = useState<ApiPost[]>([]);
  const [savedLoading,  setSavedLoading]  = useState(true);
  const [followCounts,  setFollowCounts]  = useState<FollowCounts>({ followers: 0, following: 0 });

  /* Refresh posts + follow counts every time this tab comes into focus */
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      apiFetchUserPosts(user.id)
        .then(setUserPosts)
        .catch(() => setUserPosts([]));
      setSavedLoading(true);
      apiFetchBookmarkedPosts(user.id)
        .then(setSavedPosts)
        .catch(() => setSavedPosts([]))
        .finally(() => setSavedLoading(false));
      apiGetFollowCounts(user.id)
        .then(setFollowCounts)
        .catch(() => {});
    }, [user?.id])
  );

  if (!user) return null;

  /* ── Grid data ── */
  const postGridImages = userPosts.map((p) => ({
    id: `p-${p.id}`, uri: p.imageUrl, label: p.caption,
  }));

  const savedImages = savedPosts.map((p) => ({
    id: `p-${p.id}`, uri: p.imageUrl, label: p.caption,
  }));

  const currentGrid = gridTab === "posts" ? postGridImages : savedImages;

  const totalPostCount = userPosts.length;

  return (
    <View style={[S.root, { backgroundColor: T.bg }]}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.container, { paddingTop: topPad, paddingBottom: tabClearance + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ─────────────────────────────── */}
        <View style={S.profileHeader}>
          {/* Avatar + stats row */}
          <View style={S.avatarStatsRow}>
            <ProfileStoryAvatar
              userId={user.id}
              username={user.username ?? user.name}
              avatarUrl={user.avatar}
              size={90}
            />
            <View style={S.statsArea}>
              <StatPill value={totalPostCount} label="Gönderi" />
              <Pressable onPress={() => user && router.push(`/follow-list/${encodeURIComponent(user.id)}?mode=followers`)}>
                <StatPill value={followCounts.followers} label="Takipçi" />
              </Pressable>
              <Pressable onPress={() => user && router.push(`/follow-list/${encodeURIComponent(user.id)}?mode=following`)}>
                <StatPill value={followCounts.following} label="Takip" />
              </Pressable>
            </View>
          </View>

          {/* Name + bio */}
          <Text style={[S.userName, { color: T.text }]}>{user.name}</Text>
          {user.username ? (
            <Text style={[S.userHandle, { color: T.purple }]}>@{user.username}</Text>
          ) : null}
          <Text style={[S.userBio, { color: T.textMuted }]}>
            {user.bio || "Sokak dostlarının yanındayım"}
            {user.location ? ` · ${user.location}` : " · İstanbul"}
          </Text>
          <Text style={[S.userEmail, { color: T.textFaint }]}>{user.email}</Text>

          {/* Action buttons */}
          <View style={S.actionBtnRow}>
            <Pressable
              style={({ pressed }) => [S.editBtn, { opacity: pressed ? 0.8 : 1, backgroundColor: T.purpleFaint, borderColor: T.borderStrong }]}
              onPress={() => router.push("/profile-edit")}
            >
              <Text style={[S.editBtnText, { color: T.purpleDark }]}>Profili Düzenle</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [S.msgBtn, { opacity: pressed ? 0.8 : 1, backgroundColor: T.purpleFaint, borderColor: T.borderStrong }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/messages"); }}
            >
              <Icon name="chatbubble-outline" size={19} color={T.purple} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [S.newPostBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/create-post"); }}
            >
              <Icon name="add" size={22} color="#FFF" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [S.shareBtn, { opacity: pressed ? 0.8 : 1, backgroundColor: T.purpleFaint, borderColor: T.borderStrong }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Icon name="share-outline" size={18} color={T.purple} />
            </Pressable>
          </View>
        </View>

        {/* ── Grid Tabs ──────────────────────────────────── */}
        <View style={[S.gridTabBar, { backgroundColor: T.card, borderColor: T.border }]}>
          {([
            { key: "posts",  inactive: "grid-outline",     active: "grid"     },
            { key: "saved",  inactive: "bookmark-outline",  active: "bookmark" },
          ] as const).map(({ key, inactive, active }) => (
            <Pressable
              key={key}
              style={[S.gridTabBtn, gridTab === key && S.gridTabActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGridTab(key); }}
            >
              <Icon
                name={gridTab === key ? active : inactive}
                size={22}
                color={gridTab === key ? T.purple : T.textFaint}
              />
            </Pressable>
          ))}
        </View>

        {/* ── Photo Grid ─────────────────────────────────── */}
        {gridTab === "saved" && savedLoading ? (
          <View style={S.emptyGrid}>
            <ActivityIndicator color={PURPLE} />
          </View>
        ) : currentGrid.length === 0 ? (
          <View style={S.emptyGrid}>
            <Icon
              name={gridTab === "saved" ? "bookmark-outline" : "images-outline"}
              size={48}
              color="#C5BAE8"
            />
            <Text style={S.emptyGridText}>
              {gridTab === "saved"
                ? "Henüz kaydedilen gönderi yok"
                : "Henüz paylaşım yok"}
            </Text>
            {gridTab === "saved" && (
              <Text style={S.emptyGridSub}>Kaydettiğin gönderiler burada görünecek.</Text>
            )}
          </View>
        ) : (
          <View style={S.grid}>
            {currentGrid.map((item, idx) => {
              const postId = item.id.startsWith("p-") ? item.id.replace(/^p-/, "") : null;
              return (
                <Pressable
                  key={item.id}
                  style={[S.gridItem, idx % 3 !== 2 && { marginRight: GRID_GAP }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (postId) router.push(`/post-detail/${encodeURIComponent(postId)}`);
                  }}
                >
                  <Image source={{ uri: item.uri }} style={S.gridImage} contentFit="cover" />
                </Pressable>
              );
            })}
          </View>
        )}

      </ScrollView>

    </View>
  );
}

/* ── StatPill ──────────────────────────────────────────────── */
function StatPill({ value, label }: { value: number; label: string }) {
  const T = useTheme();
  return (
    <View style={S.statPill}>
      <Text style={[S.statValue, { color: T.text }]}>{value}</Text>
      <Text style={[S.statLabel, { color: T.textMuted }]}>{label}</Text>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────── */
const S = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG },
  scroll:    { flex: 1 },
  container: { flexGrow: 1 },

  /* Profile header */
  profileHeader: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  avatarStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 16,
  },
  statsArea: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statPill:  { alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold",    color: "#1A0A3C" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888",   marginTop: 2 },

  userName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#1A0A3C",
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: PURPLE,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#555",
    lineHeight: 18,
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#999",
    marginBottom: 14,
  },

  /* Action buttons */
  actionBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EDE5F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(123,94,167,0.20)",
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: PURPLE_DARK,
  },
  msgBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#EDE5F8",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(123,94,167,0.20)",
  },
  newPostBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
  },
  shareBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#EDE5F8",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(123,94,167,0.20)",
  },

  /* Grid tab bar */
  gridTabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(123,94,167,0.12)",
    marginTop: 16,
    backgroundColor: "#FFF",
  },
  gridTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
  },

  /* Photo grid */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  gridItem: {
    width: GRID_ITEM,
    height: GRID_ITEM,
    marginBottom: GRID_GAP,
  },
  gridImage: { width: "100%", height: "100%" },
  emptyGrid: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyGridText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#9B8EBD",
  },
  emptyGridSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#B0A8C8",
    textAlign: "center",
    paddingHorizontal: 32,
    marginTop: -4,
  },

});
