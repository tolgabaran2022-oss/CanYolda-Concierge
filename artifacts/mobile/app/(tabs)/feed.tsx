import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard, type PostData } from "@/components/PostCard";
import { StoryBar } from "@/components/StoryBar";
import { StoryViewer } from "@/components/StoryViewer";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { useAuth } from "@/contexts/AuthContext";
import { FEED_POSTS } from "@/data/feedData";
import {
  apiFetchPosts,
  apiToggleLike,
  apiToggleBookmark,
  apiAddComment,
  type ApiPost,
} from "@/lib/feedApi";
import {
  apiFetchStories,
  apiCreateStory,
  type ApiStoryGroup,
} from "@/lib/storiesApi";

const { width: SW } = Dimensions.get("window");
void SW;

const C = {
  purple:     "#7B5EA7",
  purpleDark: "#4A2D8F",
  bg:         "#F9F8FF",
  white:      "#FFFFFF",
  text:       "#111827",
  muted:      "#6B7280",
  border:     "#F0EDF8",
};

function apiPostToPostData(p: ApiPost): PostData {
  return {
    id:          p.id,
    user:        { name: p.username, avatar: p.avatarUrl },
    image:       p.imageUrl,
    caption:     p.caption,
    location:    p.location,
    likes:       p.likesCount,
    liked:       p.liked,
    bookmarked:  p.bookmarked,
    sharesCount: p.sharesCount,
    comments:    [],
    timestamp:   p.timeAgo || "Yeni",
  };
}

/* ── Create post modal ────────────────────────────────────── */
function CreatePostModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (post: { user: PostData["user"]; image: string; caption: string; location: string }) => void;
}) {
  const [image,   setImage]   = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loc,     setLoc]     = useState("");
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
  };

  const reset = () => { setImage(null); setCaption(""); setLoc(""); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!image) { Alert.alert("Fotoğraf gerekli", "Lütfen bir fotoğraf seçin."); return; }
    onSubmit({
      user: { name: user?.name ?? "Ben", avatar: "https://picsum.photos/seed/myavatar/100/100" },
      image,
      caption: caption.trim(),
      location: loc.trim(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[M.root, { paddingTop: insets.top + 8 }]}>
          <View style={M.header}>
            <Pressable onPress={handleClose} hitSlop={12}><Text style={M.cancel}>İptal</Text></Pressable>
            <Text style={M.title}>Yeni Gönderi</Text>
            <Pressable onPress={handleSubmit} hitSlop={12}><Text style={M.share}>Paylaş</Text></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={M.content}>
            <Pressable onPress={pickImage} style={M.imagePicker}>
              {image ? (
                <Image source={{ uri: image }} style={M.imagePreview} contentFit="cover" />
              ) : (
                <LinearGradient colors={["rgba(164,140,220,0.10)", "rgba(124,92,255,0.06)"]} style={M.imagePlaceholder}>
                  <View style={M.cameraCircle}><Ionicons name="camera-outline" size={30} color={C.purple} /></View>
                  <Text style={M.imageHint}>Fotoğraf seç</Text>
                </LinearGradient>
              )}
            </Pressable>

            <View style={M.field}>
              <Text style={M.label}>Açıklama</Text>
              <TextInput style={M.textArea} value={caption} onChangeText={setCaption} placeholder="Bir şeyler yaz..." placeholderTextColor="#ABABBB" multiline textAlignVertical="top" maxLength={300} />
              <Text style={M.charCount}>{caption.length}/300</Text>
            </View>

            <View style={M.field}>
              <Text style={M.label}>Konum</Text>
              <View style={M.locationRow}>
                <Ionicons name="location-outline" size={18} color={C.purple} />
                <TextInput style={M.locationInput} value={loc} onChangeText={setLoc} placeholder="Konum ekle..." placeholderTextColor="#ABABBB" />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const M = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.white },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  cancel:  { fontSize: 15, fontFamily: "Inter_400Regular", color: C.muted },
  title:   { fontSize: 16, fontFamily: "Inter_700Bold",   color: C.text  },
  share:   { fontSize: 15, fontFamily: "Inter_700Bold",   color: C.purple },
  content: { padding: 18, gap: 20 },
  imagePicker: { borderRadius: 16, overflow: "hidden" },
  imagePreview: { width: "100%", height: 320, borderRadius: 16 },
  imagePlaceholder: { height: 220, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: "rgba(124,92,255,0.18)", borderStyle: "dashed" },
  cameraCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(124,92,255,0.10)", alignItems: "center", justifyContent: "center" },
  imageHint: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.purple },
  field:   { gap: 8 },
  label:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.text, textTransform: "uppercase", letterSpacing: 0.4 },
  textArea: { borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text, minHeight: 100, backgroundColor: "#FAFAFA" },
  charCount: { fontSize: 11, color: C.muted, textAlign: "right", fontFamily: "Inter_400Regular" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: "#FAFAFA" },
  locationInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
});

/* ── Feed header ──────────────────────────────────────────── */
const CAT_AVATAR_FEED = "https://loremflickr.com/100/100/cat?lock=500";

function FeedHeader({
  onNotify,
  onNewPost,
  avatarUrl,
  onAvatarPress,
}: {
  onNotify: () => void;
  onNewPost: () => void;
  avatarUrl?: string;
  onAvatarPress: () => void;
}) {
  return (
    <View style={H.root}>
      <View style={H.left}>
        <Ionicons name="heart" size={15} color={C.purple} />
        <Text style={H.logo}>canyoldaşı</Text>
      </View>
      <View style={H.right}>
        {/* New post */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNewPost();
          }}
          hitSlop={10}
          style={H.newPostBtn}
        >
          <LinearGradient
            colors={["#9478D8", "#5B3FD6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={H.newPostGradient}
          >
            <Ionicons name="add" size={18} color="#FFF" />
          </LinearGradient>
        </Pressable>
        {/* Notifications */}
        <Pressable onPress={onNotify} style={H.bellWrap} hitSlop={10}>
          <Ionicons name="notifications-outline" size={24} color={C.purple} />
          <View style={H.badge} />
        </Pressable>
        {/* Avatar */}
        <Pressable onPress={onAvatarPress} hitSlop={6}>
          <LinearGradient
            colors={["#C278F0", "#7B5EA7"]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={H.avatarRing}
          >
            <View style={H.avatarInner}>
              <Image
                source={{ uri: avatarUrl ?? CAT_AVATAR_FEED }}
                style={H.avatar}
                contentFit="cover"
              />
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const H = StyleSheet.create({
  root:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
  left:     { flexDirection: "row", alignItems: "center", gap: 6 },
  logo:     { fontSize: 20, fontFamily: "Inter_700Bold", color: "#3D2080", letterSpacing: -0.5 },
  right:    { flexDirection: "row", alignItems: "center", gap: 12 },
  bellWrap: { position: "relative" },
  badge:    { position: "absolute", top: 1, right: 1, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B6B", borderWidth: 1.5, borderColor: C.white },
  newPostBtn:      {},
  newPostGradient: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", shadowColor: "#5B3FD6", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  avatarRing:  { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", padding: 2 },
  avatarInner: { width: 34, height: 34, borderRadius: 17, overflow: "hidden", borderWidth: 1.5, borderColor: "#FFFFFF" },
  avatar:      { width: "100%", height: "100%" },
});

/* ── Main screen ──────────────────────────────────────────── */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.email ?? "anonymous";

  const [posts,           setPosts]           = useState<PostData[]>(FEED_POSTS);
  const [stories,         setStories]         = useState<ApiStoryGroup[]>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [selectedGroup,   setSelectedGroup]    = useState<ApiStoryGroup | null>(null);
  const [createVisible,   setCreateVisible]   = useState(false);
  const [createStoryOpen, setCreateStoryOpen]  = useState(false);
  const [apiReady,        setApiReady]        = useState(false);

  /* ── Fetch posts on mount ──────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    apiFetchPosts(userId)
      .then((apiPosts) => {
        if (!cancelled) {
          setPosts(apiPosts.map(apiPostToPostData));
          setApiReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setPosts(FEED_POSTS);
      });
    return () => { cancelled = true; };
  }, [userId]);

  /* ── Fetch stories on mount ────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    apiFetchStories(userId)
      .then((data) => {
        if (!cancelled) setStories(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  /* ── Like (optimistic + API) ─────────────────────────── */
  const handleLike = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p
      )
    );
    if (!apiReady) return;
    apiToggleLike(id, userId)
      .then(({ liked, likesCount }) => {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, liked, likes: likesCount } : p)));
      })
      .catch(() => {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? 1 : -1) } : p)));
      });
  }, [userId, apiReady]);

  /* ── Bookmark (optimistic + API) ─────────────────────── */
  const handleBookmark = useCallback((id: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, bookmarked: !p.bookmarked } : p)));
    if (!apiReady) return;
    apiToggleBookmark(id, userId)
      .then(({ bookmarked }) => { setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, bookmarked } : p))); })
      .catch(() => { setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, bookmarked: !p.bookmarked } : p))); });
  }, [userId, apiReady]);

  /* ── Comment (optimistic + API) ──────────────────────── */
  const handleComment = useCallback((id: string, text: string) => {
    const localComment = { id: `c${Date.now()}`, user: user?.name ?? "Sen", text };
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: [...p.comments, localComment] } : p)));
    if (!apiReady) return;
    apiAddComment(id, user?.name ?? "Sen", text).catch(() => {});
  }, [user?.name, apiReady]);

  /* ── Create post (local) ──────────────────────────────── */
  const handleCreate = useCallback(
    (data: { user: PostData["user"]; image: string; caption: string; location: string }) => {
      const newPost: PostData = {
        id:          `p${Date.now()}`,
        ...data,
        likes:       0,
        liked:       false,
        bookmarked:  false,
        sharesCount: 0,
        comments:    [],
        timestamp:   "Az önce",
      };
      setPosts((prev) => [newPost, ...prev]);
    },
    []
  );

  /* ── Story viewer navigation ───────────────────────────── */
  const handleStoryGroupPress = (group: ApiStoryGroup) => {
    setSelectedGroup(group);
    setStoryViewerOpen(true);
  };

  const handleNextGroup = () => {
    if (!selectedGroup) return;
    const idx = stories.findIndex((g) => g.userId === selectedGroup.userId);
    const next = stories[idx + 1];
    if (next) setSelectedGroup(next);
    else { setStoryViewerOpen(false); setSelectedGroup(null); }
  };

  const handlePrevGroup = () => {
    if (!selectedGroup) return;
    const idx = stories.findIndex((g) => g.userId === selectedGroup.userId);
    const prev = stories[idx - 1];
    if (prev) setSelectedGroup(prev);
    else { setStoryViewerOpen(false); setSelectedGroup(null); }
  };

  /* ── Create story ──────────────────────────────────────── */
  const handleCreateStory = async (imageUri: string, caption: string) => {
    try {
      const group = await apiCreateStory(
        userId,
        user?.name ?? "Ben",
        "https://picsum.photos/seed/myavatar/100/100",
        imageUri,
        caption
      );
      setStories((prev) => {
        const filtered = prev.filter((g) => g.userId !== group.userId);
        return [group, ...filtered];
      });
    } catch {
      Alert.alert("Hata", "Hikaye paylaşılamadı. Lütfen tekrar deneyin.");
    }
  };


  const BOTTOM_NAV_H = 68 + insets.bottom + 10;

  const renderHeader = useCallback(
    () => (
      <>
        <FeedHeader
          onNotify={() => Alert.alert("Bildirimler", "Yakında!")}
          onNewPost={() => setCreateVisible(true)}
          onAvatarPress={() => router.push("/(tabs)/profile")}
        />
        <StoryBar
          stories={stories}
          currentUserId={userId}
          onPressGroup={handleStoryGroupPress}
          onAddStory={() => setCreateStoryOpen(true)}
        />
        <View style={F.divider} />
      </>
    ),
    [stories, userId, router]
  );

  return (
    <View style={[F.root, { paddingTop: insets.top }]}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onComment={handleComment}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[F.listContent, { paddingBottom: BOTTOM_NAV_H + 16 }]}
        showsVerticalScrollIndicator={false}
        style={F.list}
      />

      <CreatePostModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSubmit={handleCreate}
      />

      <StoryViewer
        visible={storyViewerOpen}
        group={selectedGroup}
        viewerId={userId}
        onClose={() => { setStoryViewerOpen(false); setSelectedGroup(null); }}
        onNextGroup={handleNextGroup}
        onPrevGroup={handlePrevGroup}
      />

      <CreateStoryModal
        visible={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onSubmit={handleCreateStory}
      />
    </View>
  );
}

const F = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  list:        { flex: 1, backgroundColor: C.bg },
  listContent: { paddingTop: 14 },
  divider:     { height: 12, backgroundColor: C.bg },
});
