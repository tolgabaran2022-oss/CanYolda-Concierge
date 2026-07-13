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
import { useTheme } from "@/hooks/useTheme";
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
import { ProfileStoryAvatar } from "@/components/ProfileStoryAvatar";

const { width: SW } = Dimensions.get("window");
const GRID_GAP  = 2;
const GRID_ITEM = (SW - GRID_GAP * 2) / 3;

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

const CAT_FALLBACK = "https://loremflickr.com/300/300/cat?lock=500";

const PET_TYPE_LABELS: Record<string, string> = {
  cat: "🐱 Kedi", dog: "🐶 Köpek", bird: "🐦 Kuş",
  rabbit: "🐰 Tavşan", hamster: "🐹 Hamster", fish: "🐟 Balık",
};

type OwnTab = "posts" | "pets";

export default function UserProfileScreen() {
  const T          = useTheme();
  const insets     = useSafeAreaInsets();
  const router     = useRouter();
  const { user }   = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [username,        setUsername]        = useState("");
  const [avatarUrl,       setAvatarUrl]       = useState(CAT_FALLBACK);
  const [bio,             setBio]             = useState("");
  const [location,        setLocation]        = useState("");
  const [postCount,       setPostCount]       = useState(0);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [counts,          setCounts]          = useState<FollowCounts>({ followers: 0, following: 0 });
  const [following,       setFollowing]       = useState(false);
  const [posts,           setPosts]           = useState<ApiPost[]>([]);
  const [pets,            setPets]            = useState<ApiPetProfile[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [notFound,        setNotFound]        = useState(false);
  const [toggling,        setToggling]        = useState(false);
  const [msgSending,      setMsgSending]      = useState(false);
  const [activeTab,       setActiveTab]       = useState<OwnTab>("posts");

  const tabAnim = useRef(new Animated.Value(0)).current;
  const topPad  = Platform.OS === "web" ? 67 : insets.top;

  const isOwn = !!(user && (
    user.id === userId || user.username === userId || user.name === userId || user.email === userId
  ));

  const load = useCallback(async () => {
    if (!userId) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    setNotFound(false);
    try {
      const isSeedUser   = userId.startsWith("seed-");
      const seedUsername = isSeedUser ? userId.slice("seed-".length) : "";

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
        setAvatarUrl(full.avatarUrl || (postsData as ApiPost[])[0]?.avatarUrl || SEED_AVATARS[full.username ?? ""] || CAT_FALLBACK);
        setPostCount(full.postsCount ?? (postsData as ApiPost[]).length);
        setIsProfilePublic(full.isProfilePublic ?? true);
      } else if ((postsData as ApiPost[]).length > 0) {
        const p0 = (postsData as ApiPost[])[0];
        setUsername(p0.username);
        setAvatarUrl(p0.avatarUrl || SEED_AVATARS[p0.username] || CAT_FALLBACK);
        setPostCount((postsData as ApiPost[]).length);
      } else if (isSeedUser) {
        setUsername(seedUsername);
        setAvatarUrl(SEED_AVATARS[seedUsername] || CAT_FALLBACK);
        setPostCount(0);
      } else {
        setNotFound(true);
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
            <Ionicons name="person-outline" size={36} color={T.purple} />
          </View>
          <Text style={[S.notFoundTitle, { color: T.text }]}>Profil bulunamadı</Text>
          <Text style={[S.notFoundSub, { color: T.textMuted }]}>
            Bu kullanıcı mevcut değil veya hesabını silmiş olabilir.
          </Text>
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
    <View style={[S.root, { backgroundColor: T.bg, paddingTop: topPad }]}>
      <TopBar username={username} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={isOwn ? [1] : undefined}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Profile Header */}
        <View style={[S.profileBlock, { backgroundColor: T.card, borderBottomColor: T.border }]}>

          <View style={S.avatarRow}>
            <ProfileStoryAvatar
              userId={userId ?? ""}
              username={username}
              avatarUrl={avatarUrl}
              viewerId={user?.id}
              size={90}
            />

            <View style={S.statsRow}>
              <StatCol value={postCount}     label="Gönderi" />
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

          <Text style={[S.displayName, { color: T.text }]}>@{username}</Text>
          {bio ? <Text style={[S.bio, { color: T.textMuted }]}>{bio}</Text> : null}
          {location ? (
            <View style={S.locRow}>
              <Ionicons name="location-outline" size={13} color={T.textMuted} />
              <Text style={[S.locTxt, { color: T.textMuted }]}>{location}</Text>
            </View>
          ) : null}

          {/* Action buttons */}
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
              <>
                <Pressable
                  style={({ pressed }) => [
                    following ? S.btnOutline : S.btnFill,
                    following && { backgroundColor: T.bgSecondary, borderColor: T.border },
                    S.btnFlex,
                    { opacity: (pressed || toggling) ? 0.78 : 1 },
                  ]}
                  onPress={handleFollow}
                  disabled={toggling}
                >
                  {toggling ? (
                    <ActivityIndicator size="small" color={following ? T.purple : "#FFF"} />
                  ) : (
                    <Text style={following
                      ? [S.btnOutlineTxt, { color: T.purple }]
                      : S.btnFillTxt}>
                      {following ? "Takiptesin" : "Takip Et"}
                    </Text>
                  )}
                </Pressable>

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
                      <Ionicons name="chatbubble-outline" size={15} color={T.purple} style={{ marginRight: 5 }} />
                      <Text style={[S.btnOutlineTxt, { color: T.purple }]}>Mesaj Gönder</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Tab bar — own profile only */}
        {isOwn && (
          <View style={[S.tabBar, { backgroundColor: T.card, borderBottomColor: T.border }]}>
            <Pressable style={S.tabBtn} onPress={() => switchTab("posts")}>
              <Ionicons name="grid-outline" size={22} color={activeTab === "posts" ? T.purple : T.textMuted} />
            </Pressable>
            <Pressable style={S.tabBtn} onPress={() => switchTab("pets")}>
              <Ionicons name="paw-outline" size={22} color={activeTab === "pets" ? T.purple : T.textMuted} />
            </Pressable>
            <Animated.View style={[S.tabIndicator, { backgroundColor: T.purple, transform: [{ translateX: tabIndicatorX }] }]} />
          </View>
        )}

        {/* Content */}
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

/* ── Sub-components ── */

function TopBar({ username, onBack }: { username: string; onBack: () => void }) {
  const T = useTheme();
  return (
    <View style={[S.topBar, { backgroundColor: T.card, borderBottomColor: T.border }]}>
      <Pressable onPress={onBack} hitSlop={14} style={S.topBackBtn}>
        <Ionicons name="chevron-back" size={26} color={T.purple} />
      </Pressable>
      <Text style={[S.topUsername, { color: T.text }]} numberOfLines={1}>
        {username ? `@${username}` : "Profil"}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function StatCol({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const T = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [S.statCol, onPress && pressed && { opacity: 0.65 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[S.statVal, { color: T.text }]}>{value}</Text>
      <Text style={[S.statLbl, { color: T.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function PostsGrid({ posts, onPressPost }: { posts: ApiPost[]; onPressPost: (id: string) => void }) {
  const T = useTheme();
  if (posts.length === 0) {
    return (
      <View style={[S.emptyWrap, { backgroundColor: T.bg }]}>
        <View style={[S.emptyIconCircle, { backgroundColor: T.purpleFaint }]}>
          <Ionicons name="images-outline" size={36} color={T.purple} />
        </View>
        <Text style={[S.emptyTitle, { color: T.text }]}>Henüz gönderi yok</Text>
        <Text style={[S.emptySub, { color: T.textMuted }]}>Paylaşımlar burada görünecek</Text>
      </View>
    );
  }
  return (
    <View style={[S.grid, { backgroundColor: T.bg }]}>
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
          {/* Scrim for readability on bright photos */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.52)"]}
            style={S.gridScrim}
          />
          <View style={S.gridOverlay}>
            <Ionicons name="heart" size={13} color="#FFF" />
            <Text style={S.gridLikes}>{p.likesCount}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function PetsGrid({ pets, onPressPet }: { pets: ApiPetProfile[]; onPressPet: (petId: string) => void }) {
  const T = useTheme();
  if (pets.length === 0) {
    return (
      <View style={[S.emptyWrap, { backgroundColor: T.bg }]}>
        <View style={[S.emptyIconCircle, { backgroundColor: T.purpleFaint }]}>
          <Ionicons name="paw-outline" size={36} color={T.purple} />
        </View>
        <Text style={[S.emptyTitle, { color: T.text }]}>Evcil Dostu Yok</Text>
        <Text style={[S.emptySub, { color: T.textMuted }]}>Evcil hayvanlar burada görünecek</Text>
      </View>
    );
  }
  return (
    <View style={[S.petsWrap, { backgroundColor: T.bg }]}>
      {pets.map((pet) => (
        <Pressable
          key={pet.id}
          style={({ pressed }) => [
            S.petCard,
            { backgroundColor: T.card, borderColor: T.border },
            { opacity: pressed ? 0.88 : 1 },
          ]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPressPet(pet.id); }}
        >
          <LinearGradient colors={[T.purpleFaint, T.purpleLight + "22"]} style={S.petAvatarWrap}>
            {pet.avatarUrl ? (
              <Image source={{ uri: pet.avatarUrl }} style={S.petAvatar} contentFit="cover" />
            ) : (
              <Text style={S.petEmoji}>
                {pet.type === "dog" ? "🐶" : pet.type === "bird" ? "🐦" : pet.type === "rabbit" ? "🐰" : "🐱"}
              </Text>
            )}
          </LinearGradient>
          <View style={S.petInfo}>
            <Text style={[S.petName, { color: T.text }]}>{pet.name}</Text>
            <Text style={[S.petMeta, { color: T.textMuted }]}>
              {PET_TYPE_LABELS[pet.type] ?? pet.type}{pet.breed ? ` · ${pet.breed}` : ""}
            </Text>
            {pet.bio ? <Text style={[S.petBio, { color: T.textMuted }]} numberOfLines={2}>{pet.bio}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}

function PrivateLockState() {
  const T = useTheme();
  return (
    <View style={[S.lockWrap, { backgroundColor: T.bg }]}>
      <View style={[S.lockCircle, { backgroundColor: T.purpleFaint }]}>
        <Ionicons name="lock-closed" size={32} color={T.purple} />
      </View>
      <Text style={[S.lockTitle, { color: T.text }]}>Bu hesap gizli</Text>
      <Text style={[S.lockSub, { color: T.textMuted }]}>Gönderileri görmek için takip et</Text>
    </View>
  );
}

/* ── Styles ── */
const S = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 6, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBackBtn:  { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topUsername: { fontSize: 16, fontFamily: "Inter_700Bold", maxWidth: SW - 120 },

  profileBlock: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  statsRow:  { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statCol:   { alignItems: "center", gap: 2, flex: 1 },
  statVal:   { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLbl:   { fontSize: 11, fontFamily: "Inter_400Regular" },

  displayName: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  bio:         { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  locRow:      { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt:      { fontSize: 12, fontFamily: "Inter_400Regular" },

  btnRow:  { flexDirection: "row", gap: 10, marginTop: 4 },
  btnFlex: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },

  btnFill: {
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#7B5EA7",
    ...Platform.select({
      ios:     { shadowColor: "#7B5EA7", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 10 },
      android: { elevation: 5 },
      default: {},
    }),
  },
  btnFillTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },

  btnOutline: {
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5,
  },
  btnOutlineTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  tabIndicator: {
    position: "absolute", bottom: 0, left: 0,
    width: SW / 2, height: 2.5,
    borderRadius: 99,
  },

  grid:     { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: GRID_ITEM, height: GRID_ITEM, position: "relative" },
  gridImg:  { width: "100%", height: "100%" },
  gridScrim: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: "55%",
  },
  gridOverlay: {
    position: "absolute", bottom: 5, left: 5,
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  gridLikes: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  emptyWrap: { alignItems: "center", paddingVertical: 64, gap: 12, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  notFoundCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  notFoundTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  notFoundSub:   { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  lockWrap:   { alignItems: "center", paddingVertical: 72, gap: 14, paddingHorizontal: 40 },
  lockCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  lockTitle:  { fontSize: 17, fontFamily: "Inter_700Bold" },
  lockSub:    { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  petsWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  petCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 18, padding: 14,
    borderWidth: 1,
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
  petName:   { fontSize: 15, fontFamily: "Inter_700Bold" },
  petMeta:   { fontSize: 12, fontFamily: "Inter_400Regular" },
  petBio:    { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
