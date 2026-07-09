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
import { apiGetOrCreateConversation } from "@/lib/messagesApi";
import { apiGetUserPets, type ApiPetProfile } from "@/lib/petsApi";
import {
  apiCheckFollowing,
  apiGetFollowCounts,
  apiGetFullProfile,
  apiToggleFollow,
  type FollowCounts,
} from "@/lib/socialApi";

const { width: SW } = Dimensions.get("window");
const GRID_GAP  = 1.5;
const GRID_ITEM = (SW - GRID_GAP * 2) / 3;

const P      = "#7B5EA7";
const PDARK  = "#3D2070";
const PLIGHT = "#EDE8F8";
const BG     = "#F9F8FF";
const WHITE  = "#FFFFFF";
const MUTED  = "#9187B0";
const TEXT   = "#1C1033";
const CAT    = "https://loremflickr.com/300/300/cat?lock=500";

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

type OwnTab = "posts" | "pets";

export default function UserProfileScreen() {
  const insets     = useSafeAreaInsets();
  const router     = useRouter();
  const { user }   = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [username,        setUsername]        = useState("");
  const [avatarUrl,       setAvatarUrl]       = useState(CAT);
  const [bio,             setBio]             = useState("");
  const [location,        setLocation]        = useState("");
  const [postCount,       setPostCount]       = useState(0);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [counts,          setCounts]          = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following,       setFollowing]       = useState(false);
  const [posts,           setPosts]           = useState<ApiPost[]>([]);
  const [pets,            setPets]            = useState<ApiPetProfile[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [toggling,        setToggling]        = useState(false);
  const [msgSending,      setMsgSending]      = useState(false);
  const [activeTab,       setActiveTab]       = useState<OwnTab>("posts");

  const tabAnim = useRef(new Animated.Value(0)).current;
  const topPad  = Platform.OS === "web" ? 67 : insets.top;

  const isOwn = !!(user && (
    user.id === userId || user.username === userId || user.name === userId || user.email === userId
  ));

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const fetches: Promise<any>[] = [
        apiFetchUserPosts(userId).catch(() => [] as ApiPost[]),
        apiGetFollowCounts(userId).catch(() => ({ followers: 0, following: 0 })),
      ];
      if (isOwn) fetches.push(apiGetUserPets(userId).catch(() => [] as ApiPetProfile[]));

      const [postsData, countsData, petsData] = await Promise.all(fetches);
      setPosts(postsData as ApiPost[]);
      setCounts(countsData as FollowCounts);
      if (isOwn && petsData) setPets(petsData as ApiPetProfile[]);

      const full = await apiGetFullProfile(userId).catch(() => null);
      if (full) {
        setUsername(full.username ?? full.name ?? userId);
        setBio(full.bio ?? "");
        setLocation(full.location ?? "");
        setAvatarUrl(full.avatarUrl || (postsData as ApiPost[])[0]?.avatarUrl || SEED_AVATARS[full.username ?? ""] || CAT);
        setPostCount(full.postsCount ?? (postsData as ApiPost[]).length);
        setIsProfilePublic(full.isProfilePublic ?? true);
      } else if ((postsData as ApiPost[]).length > 0) {
        const p0 = (postsData as ApiPost[])[0];
        setUsername(p0.username);
        setAvatarUrl(p0.avatarUrl || SEED_AVATARS[p0.username] || CAT);
        setPostCount((postsData as ApiPost[]).length);
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

  const switchTab = (tab: OwnTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === "posts" ? 0 : 1,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start();
  };

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

  const handleMessage = async () => {
    if (!user || !userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMsgSending(true);
    try {
      const conv = await apiGetOrCreateConversation(user.id, userId);
      router.push(`/messages/${encodeURIComponent(conv.id)}` as any);
    } catch {
      router.push("/messages" as any);
    } finally {
      setMsgSending(false);
    }
  };

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

  const isLocked = !isOwn && !isProfilePublic && !following;

  return (
    <View style={[S.root, { paddingTop: topPad }]}>
      <TopBar username={username} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={isOwn ? [1] : undefined}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ─── Profile Header ─── */}
        <View style={S.profileBlock}>

          <View style={S.avatarRow}>
            <LinearGradient
              colors={["#E040FB", "#9C27B0", "#5B3FD6"]}
              start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
              style={S.avatarRing}
            >
              <View style={S.avatarBorder}>
                <Image source={{ uri: avatarUrl }} style={S.avatarImg} contentFit="cover" />
              </View>
            </LinearGradient>

            <View style={S.statsRow}>
              <StatCol value={postCount}        label="Gönderi" />
              <StatCol
                value={counts.followers}
                label="Takipçi"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/follow-list/${encodeURIComponent(userId ?? "")}?mode=followers` as any);
                }}
              />
              <StatCol
                value={counts.following}
                label="Takip"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/follow-list/${encodeURIComponent(userId ?? "")}?mode=following` as any);
                }}
              />
            </View>
          </View>

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
                onPress={() => router.push("/profile-edit" as any)}
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
                  style={({ pressed }) => [S.btnOutline, S.btnFlex, { opacity: (pressed || msgSending) ? 0.7 : 1 }]}
                  onPress={handleMessage}
                  disabled={msgSending}
                >
                  {msgSending ? (
                    <ActivityIndicator size="small" color={PDARK} />
                  ) : (
                    <>
                      <Ionicons name="chatbubble-outline" size={15} color={PDARK} style={{ marginRight: 5 }} />
                      <Text style={S.btnOutlineTxt}>Mesaj Gönder</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* ─── Own Profile: Two-tab bar ─── */}
        {isOwn && (
          <View style={S.tabBar}>
            <Pressable style={S.tabBtn} onPress={() => switchTab("posts")}>
              <Ionicons name="grid-outline" size={22} color={activeTab === "posts" ? P : MUTED} />
            </Pressable>
            <Pressable style={S.tabBtn} onPress={() => switchTab("pets")}>
              <Ionicons name="paw-outline" size={22} color={activeTab === "pets" ? P : MUTED} />
            </Pressable>
            <Animated.View style={[S.tabIndicator, { transform: [{ translateX: tabIndicatorX }] }]} />
          </View>
        )}

        {/* ─── Content ─── */}
        {isOwn ? (
          activeTab === "posts" ? (
            <PostsGrid
              posts={posts}
              onPressPost={(id) => router.push(`/post-detail/${encodeURIComponent(id)}` as any)}
            />
          ) : (
            <PetsGrid
              pets={pets}
              onPressPet={(petId) => router.push(`/pet/${encodeURIComponent(petId)}` as any)}
            />
          )
        ) : isLocked ? (
          <PrivateLockState />
        ) : (
          <PostsGrid
            posts={posts}
            onPressPost={(id) => router.push(`/post-detail/${encodeURIComponent(id)}` as any)}
          />
        )}
      </ScrollView>
    </View>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

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

function StatCol({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPressPost(p.id);
          }}
        >
          <Image source={{ uri: p.imageUrl }} style={S.gridImg} contentFit="cover" />
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
        <Text style={S.emptySub}>Evcil hayvanlar burada görünecek</Text>
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
          <LinearGradient colors={["#EDE8FF", "#F5F2FF"]} style={S.petAvatarWrap}>
            {pet.avatarUrl ? (
              <Image source={{ uri: pet.avatarUrl }} style={S.petAvatar} contentFit="cover" />
            ) : (
              <Text style={S.petEmoji}>
                {pet.type === "dog" ? "🐶" : pet.type === "bird" ? "🐦" : pet.type === "rabbit" ? "🐰" : "🐱"}
              </Text>
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

function PrivateLockState() {
  return (
    <View style={S.lockWrap}>
      <View style={S.lockCircle}>
        <Ionicons name="lock-closed" size={32} color={P} />
      </View>
      <Text style={S.lockTitle}>Bu hesap gizli</Text>
      <Text style={S.lockSub}>Gönderileri görmek için takip et</Text>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 6, paddingVertical: 10,
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(123,94,167,0.12)",
  },
  topBackBtn:  { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topUsername: { fontSize: 16, fontFamily: "Inter_700Bold", color: PDARK, maxWidth: SW - 120 },

  profileBlock: {
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(123,94,167,0.10)",
  },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center",
    padding: 2.5,
  },
  avatarBorder: {
    width: 85, height: 85, borderRadius: 42.5,
    overflow: "hidden", borderWidth: 2, borderColor: WHITE,
  },
  avatarImg: { width: "100%", height: "100%" },

  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statCol:  { alignItems: "center", gap: 2, flex: 1 },
  statVal:  { fontSize: 20, fontFamily: "Inter_700Bold", color: PDARK },
  statLbl:  { fontSize: 11, fontFamily: "Inter_400Regular", color: MUTED },

  displayName: { fontSize: 15, fontFamily: "Inter_700Bold", color: PDARK, marginTop: 2 },
  bio:         { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT, lineHeight: 19 },
  locRow:      { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt:      { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED },

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
  btnFillTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: WHITE },

  btnOutline: {
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: PLIGHT,
    borderWidth: 1.5, borderColor: "rgba(123,94,167,0.20)",
  },
  btnOutlineTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: PDARK },

  /* Tab bar — only rendered for own profile */
  tabBar: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(123,94,167,0.12)",
    position: "relative",
  },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  tabIndicator: {
    position: "absolute", bottom: 0, left: 0,
    width: SW / 2, height: 2.5,
    backgroundColor: P, borderRadius: 99,
  },

  /* Posts grid */
  grid:     { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: GRID_ITEM, height: GRID_ITEM, position: "relative" },
  gridImg:  { width: "100%", height: "100%" },
  gridOverlay: {
    position: "absolute", bottom: 5, left: 5,
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  gridLikes: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: WHITE },

  /* Empty state */
  emptyWrap: { alignItems: "center", paddingVertical: 64, gap: 12, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PLIGHT, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: PDARK },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center" },

  /* Private lock */
  lockWrap:   { alignItems: "center", paddingVertical: 72, gap: 14, paddingHorizontal: 40 },
  lockCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PLIGHT, alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  lockTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", color: PDARK },
  lockSub:    { fontSize: 14, fontFamily: "Inter_400Regular", color: MUTED, textAlign: "center" },

  /* Pets list */
  petsWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  petCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: WHITE, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: "rgba(123,94,167,0.10)",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  petAvatarWrap: {
    width: 58, height: 58, borderRadius: 16,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  petAvatar: { width: "100%", height: "100%" },
  petEmoji:  { fontSize: 28 },
  petInfo:   { flex: 1, gap: 3 },
  petName:   { fontSize: 15, fontFamily: "Inter_700Bold", color: PDARK },
  petMeta:   { fontSize: 12, fontFamily: "Inter_400Regular", color: MUTED },
  petBio:    { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT, lineHeight: 17 },
});
