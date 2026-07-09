import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
} from "@/lib/socialApi";
import { apiGetUserPets, type ApiPetProfile } from "@/lib/petsApi";

const { width: SW } = Dimensions.get("window");
const GRID_GAP  = 1.5;
const GRID_ITEM = (SW - GRID_GAP * 2) / 3;

const P     = "#7B5EA7";
const PDARK = "#3D2070";
const PLIGHT = "#EDE8F8";
const BG    = "#F9F8FF";
const WHITE = "#FFFFFF";
const MUTED = "#9187B0";
const TEXT  = "#1C1033";
const CAT   = "https://loremflickr.com/300/300/cat?lock=500";

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

const PET_TYPE_LABELS: Record<string, string> = {
  cat: "🐱 Kedi", dog: "🐶 Köpek", bird: "🐦 Kuş",
  rabbit: "🐰 Tavşan", hamster: "🐹 Hamster", fish: "🐟 Balık",
};

type ProfileTab = "posts" | "pets";
type FollowListMode = "followers" | "following" | null;

export default function UserProfileScreen() {
  const insets     = useSafeAreaInsets();
  const router     = useRouter();
  const { user }   = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  /* ── Data ── */
  const [username,   setUsername]   = useState("");
  const [avatarUrl,  setAvatarUrl]  = useState(CAT);
  const [bio,        setBio]        = useState("");
  const [location,   setLocation]   = useState("");
  const [postCount,  setPostCount]  = useState(0);
  const [counts,     setCounts]     = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following,  setFollowing]  = useState(false);
  const [posts,      setPosts]      = useState<ApiPost[]>([]);
  const [pets,       setPets]       = useState<ApiPetProfile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toggling,   setToggling]   = useState(false);
  const [activeTab,  setActiveTab]  = useState<ProfileTab>("posts");

  /* ── Follow list modal ── */
  const [listMode,    setListMode]    = useState<FollowListMode>(null);
  const [listUsers,   setListUsers]   = useState<FollowUser[]>([]);
  const [listLoading, setListLoading] = useState(false);

  /* ── Animated tab indicator ── */
  const tabAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isOwn  = !!(user && (
    user.id === userId || user.username === userId || user.name === userId || user.email === userId
  ));

  /* ── Load all profile data ── */
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [postsData, countsData, petsData] = await Promise.all([
        apiFetchUserPosts(userId).catch(() => [] as ApiPost[]),
        apiGetFollowCounts(userId).catch(() => ({ followers: 0, following: 0 })),
        apiGetUserPets(userId).catch(() => [] as ApiPetProfile[]),
      ]);
      setPosts(postsData);
      setCounts(countsData);
      setPets(petsData);

      /* Full profile for bio/location */
      const full = await apiGetFullProfile(userId).catch(() => null);
      if (full) {
        setUsername(full.username ?? full.name ?? userId);
        setBio(full.bio ?? "");
        setLocation(full.location ?? "");
        setAvatarUrl(full.avatarUrl || postsData[0]?.avatarUrl || SEED_AVATARS[full.username ?? ""] || CAT);
        setPostCount(full.postsCount ?? postsData.length);
      } else if (postsData.length > 0) {
        setUsername(postsData[0].username);
        setAvatarUrl(postsData[0].avatarUrl || SEED_AVATARS[postsData[0].username] || CAT);
        setPostCount(postsData.length);
      } else {
        setUsername(userId);
        setAvatarUrl(SEED_AVATARS[userId] || CAT);
        setPostCount(0);
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

  /* ── Tab switch animation ── */
  const switchTab = (tab: ProfileTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === "posts" ? 0 : 1,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start();
  };

  /* ── Follow / Unfollow ── */
  const handleFollow = async () => {
    if (!user || !userId || isOwn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setToggling(true);
    try {
      const { following: newF } = await apiToggleFollow(user.id, userId);
      setFollowing(newF);
      setCounts((p) => ({ ...p, followers: p.followers + (newF ? 1 : -1) }));
    } catch { /* ignore */ }
    finally { setToggling(false); }
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
    } catch { setListUsers([]); }
    finally { setListLoading(false); }
  };

  const handleListToggleFollow = async (targetId: string) => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { following: newF } = await apiToggleFollow(user.id, targetId);
      setListUsers((p) => p.map((u) => u.userId === targetId ? { ...u, isFollowing: newF } : u));
    } catch { /* ignore */ }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <View style={[S.root, { paddingTop: topPad }]}>
        <TopBar username="" onBack={() => router.back()} />
        <View style={S.center}>
          <ActivityIndicator size="large" color={P} />
        </View>
      </View>
    );
  }

  const tabIndicatorX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SW / 2],
  });

  return (
    <View style={[S.root, { paddingTop: topPad }]}>
      <TopBar username={username} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ─── Profile Header Block ─── */}
        <View style={S.profileBlock}>

          {/* Avatar row */}
          <View style={S.avatarRow}>
            <LinearGradient
              colors={["#E040FB", "#9C27B0", "#5B3FD6"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={S.avatarRing}
            >
              <View style={S.avatarBorder}>
                <Image source={{ uri: avatarUrl }} style={S.avatarImg} contentFit="cover" />
              </View>
            </LinearGradient>

            {/* Stats — Instagram horizontal */}
            <View style={S.statsRow}>
              <StatCol value={postCount}        label="Gönderi"  onPress={undefined} />
              <StatCol value={counts.followers} label="Takipçi"  onPress={() => openList("followers")} />
              <StatCol value={counts.following} label="Takip"    onPress={() => openList("following")} />
            </View>
          </View>

          {/* Name / bio / location */}
          <Text style={S.displayName}>@{username}</Text>
          {bio ? <Text style={S.bio}>{bio}</Text> : null}
          {location ? (
            <View style={S.locRow}>
              <Ionicons name="location-outline" size={13} color={MUTED} />
              <Text style={S.locTxt}>{location}</Text>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={S.btnRow}>
            {isOwn ? (
              <Pressable
                style={({ pressed }) => [S.btnOutline, S.btnFlex, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => router.push("/profile-edit")}
              >
                <Text style={S.btnOutlineTxt}>Profili Düzenle</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  style={({ pressed }) => [
                    following ? S.btnOutline : S.btnFill,
                    S.btnFlex,
                    { opacity: (pressed || toggling) ? 0.78 : 1 },
                  ]}
                  onPress={handleFollow}
                  disabled={toggling}
                >
                  {toggling ? (
                    <ActivityIndicator size="small" color={following ? P : WHITE} />
                  ) : (
                    <Text style={following ? S.btnOutlineTxt : S.btnFillTxt}>
                      {following ? "Takiptesin ✓" : "Takip Et"}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [S.btnOutline, S.btnFlex, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={PDARK} style={{ marginRight: 4 }} />
                  <Text style={S.btnOutlineTxt}>Mesaj Gönder</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* ─── Sticky Tab Bar ─── */}
        <View style={S.tabBar}>
          <Pressable style={S.tabBtn} onPress={() => switchTab("posts")}>
            <Ionicons
              name="grid-outline"
              size={22}
              color={activeTab === "posts" ? P : MUTED}
            />
          </Pressable>
          <Pressable style={S.tabBtn} onPress={() => switchTab("pets")}>
            <Ionicons
              name="paw-outline"
              size={22}
              color={activeTab === "pets" ? P : MUTED}
            />
          </Pressable>
          {/* Sliding indicator */}
          <Animated.View
            style={[S.tabIndicator, { transform: [{ translateX: tabIndicatorX }] }]}
          />
        </View>

        {/* ─── Tab Content ─── */}
        {activeTab === "posts" ? (
          <PostsGrid posts={posts} onPressPost={(id) => router.push(`/post-detail/${encodeURIComponent(id)}`)} />
        ) : (
          <PetsGrid pets={pets} onPressPet={(petId) => router.push(`/pet/${encodeURIComponent(petId)}`)} />
        )}
      </ScrollView>

      {/* ─── Followers / Following Modal ─── */}
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
              <Ionicons name="close" size={24} color={PDARK} />
            </Pressable>
          </View>

          {listLoading ? (
            <View style={L.center}>
              <ActivityIndicator size="large" color={P} />
            </View>
          ) : listUsers.length === 0 ? (
            <View style={L.center}>
              <Ionicons name="people-outline" size={52} color="#C5BAE8" />
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
                  <Image source={{ uri: item.avatarUrl || CAT }} style={L.avatar} contentFit="cover" />
                  <Text style={L.username} numberOfLines={1}>@{item.username}</Text>
                  {item.userId !== user?.id && (
                    <Pressable
                      style={[L.fBtn, item.isFollowing && L.fBtnActive]}
                      onPress={() => handleListToggleFollow(item.userId)}
                    >
                      <Text style={[L.fTxt, item.isFollowing && L.fTxtActive]}>
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

/* ── Sub-components ─────────────────────────────────────────── */

function TopBar({ username, onBack }: { username: string; onBack: () => void }) {
  return (
    <View style={S.topBar}>
      <Pressable onPress={onBack} hitSlop={14} style={S.topBackBtn}>
        <Ionicons name="chevron-back" size={26} color={PDARK} />
      </Pressable>
      <Text style={S.topUsername} numberOfLines={1}>
        {username ? `@${username}` : "Profil"}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function StatCol({
  value, label, onPress,
}: { value: number; label: string; onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [S.statCol, onPress && pressed && { opacity: 0.65 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={S.statVal}>{value}</Text>
      <Text style={S.statLbl}>{label}</Text>
    </Pressable>
  );
}

function PostsGrid({ posts, onPressPost }: { posts: ApiPost[]; onPressPost: (id: string) => void }) {
  if (posts.length === 0) {
    return (
      <View style={S.emptyWrap}>
        <View style={S.emptyIconCircle}>
          <Ionicons name="images-outline" size={36} color={P} />
        </View>
        <Text style={S.emptyTitle}>Henüz gönderi yok</Text>
        <Text style={S.emptySub}>Paylaşımlar burada görünecek</Text>
      </View>
    );
  }
  return (
    <View style={S.grid}>
      {posts.map((p, idx) => (
        <Pressable
          key={p.id}
          style={[
            S.gridItem,
            { marginRight: idx % 3 !== 2 ? GRID_GAP : 0 },
            { marginBottom: GRID_GAP },
          ]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPressPost(p.id); }}
        >
          <Image source={{ uri: p.imageUrl }} style={S.gridImg} contentFit="cover" />
          {/* like overlay */}
          <View style={S.gridOverlay}>
            <Ionicons name="heart" size={13} color={WHITE} />
            <Text style={S.gridLikes}>{p.likesCount}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function PetsGrid({ pets, onPressPet }: { pets: ApiPetProfile[]; onPressPet: (petId: string) => void }) {
  if (pets.length === 0) {
    return (
      <View style={S.emptyWrap}>
        <View style={S.emptyIconCircle}>
          <Ionicons name="paw-outline" size={36} color={P} />
        </View>
        <Text style={S.emptyTitle}>Evcil Dostu Yok</Text>
        <Text style={S.emptySub}>Bu kullanıcının evcil hayvanları burada görünecek</Text>
      </View>
    );
  }
  return (
    <View style={S.petsWrap}>
      {pets.map((pet) => (
        <Pressable
          key={pet.id}
          style={({ pressed }) => [S.petCard, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPressPet(pet.id); }}
        >
          <LinearGradient
            colors={["#EDE8FF", "#F5F2FF"]}
            style={S.petAvatarWrap}
          >
            {pet.avatarUrl ? (
              <Image source={{ uri: pet.avatarUrl }} style={S.petAvatar} contentFit="cover" />
            ) : (
              <Text style={S.petEmoji}>{pet.type === "dog" ? "🐶" : pet.type === "bird" ? "🐦" : pet.type === "rabbit" ? "🐰" : "🐱"}</Text>
            )}
          </LinearGradient>

          <View style={S.petInfo}>
            <Text style={S.petName}>{pet.name}</Text>
            <Text style={S.petMeta}>{PET_TYPE_LABELS[pet.type] ?? pet.type}{pet.breed ? ` · ${pet.breed}` : ""}</Text>
            {pet.bio ? <Text style={S.petBio} numberOfLines={2}>{pet.bio}</Text> : null}
          </View>

          <Ionicons name="chevron-forward" size={18} color="#C0B8D8" />
        </Pressable>
      ))}
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  /* Top bar */
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 6, paddingVertical: 10,
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(123,94,167,0.12)",
  },
  topBackBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topUsername: { fontSize: 16, fontFamily: "Inter_700Bold", color: PDARK, maxWidth: SW - 120 },

  /* Profile block */
  profileBlock: {
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(123,94,167,0.10)",
  },

  /* Avatar + stats row */
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center",
    padding: 2.5,
  },
  avatarBorder: {
    width: 85, height: 85, borderRadius: 42.5,
    overflow: "hidden",
    borderWidth: 2, borderColor: WHITE,
  },
  avatarImg: { width: "100%", height: "100%" },

  /* Stats */
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statCol:  { alignItems: "center", gap: 2, flex: 1 },
  statVal:  { fontSize: 20, fontFamily: "Inter_700Bold", color: PDARK },
  statLbl:  { fontSize: 11, fontFamily: "Inter_400Regular", color: MUTED },

  /* Name / bio */
  displayName: { fontSize: 15, fontFamily: "Inter_700Bold", color: PDARK, marginTop: 2 },
  bio:  { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT, lineHeight: 19 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED },

  /* Action buttons */
  btnRow:  { flexDirection: "row", gap: 10, marginTop: 4 },
  btnFlex: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },

  btnFill: {
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: P,
    ...Platform.select({
      ios:     { shadowColor: P, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10 },
      android: { elevation: 5 },
      default: {},
    }),
  },
  btnFillTxt:   { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },

  btnOutline: {
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: PLIGHT,
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.20)",
  },
  btnOutlineTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: PDARK },

  /* Tabs */
  tabBar: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(123,94,167,0.12)",
    position: "relative",
  },
  tabBtn: {
    flex: 1, paddingVertical: 13,
    alignItems: "center", justifyContent: "center",
  },
  tabIndicator: {
    position: "absolute", bottom: 0, left: 0,
    width: SW / 2, height: 2.5,
    backgroundColor: P,
    borderRadius: 99,
  },

  /* Grid */
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: GRID_ITEM, height: GRID_ITEM, position: "relative" },
  gridImg:  { width: "100%", height: "100%" },
  gridOverlay: {
    position: "absolute", bottom: 5, left: 5,
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  gridLikes: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: WHITE },

  /* Empty */
  emptyWrap: { alignItems: "center", paddingVertical: 64, gap: 12, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PLIGHT,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PDARK },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center" },

  /* Pets grid */
  petsWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  petCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: WHITE, borderRadius: 18,
    padding: 14,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.10)",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  petAvatarWrap: {
    width: 58, height: 58, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  petAvatar: { width: "100%", height: "100%" },
  petEmoji:  { fontSize: 28 },
  petInfo:   { flex: 1, gap: 3 },
  petName:   { fontSize: 15, fontFamily: "Inter_700Bold", color: PDARK },
  petMeta:   { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED },
  petBio:    { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT, lineHeight: 17 },
});

/* ── Follow list modal styles ─────────────────────────────── */

const L = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(123,94,167,0.12)",
  },
  title:  { fontSize: 16, fontFamily: "Inter_700Bold", color: PDARK },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  empty:  { fontSize: 14, fontFamily: "Inter_400Regular", color: "#AAAACC" },

  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0EDF8",
    gap: 12,
  },
  avatar:   { width: 46, height: 46, borderRadius: 23, backgroundColor: "#EEE" },
  username: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: PDARK },

  fBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    backgroundColor: P,
  },
  fBtnActive: {
    backgroundColor: "transparent",
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.35)",
  },
  fTxt:       { fontSize: 13, fontFamily: "Inter_600SemiBold", color: WHITE },
  fTxtActive: { color: P },
});
