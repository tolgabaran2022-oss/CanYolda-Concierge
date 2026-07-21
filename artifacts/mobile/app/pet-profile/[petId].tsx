import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/lib/apiClient";
import { Icon } from "@/components/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import {
  apiGetPet,
  apiGetPetPosts,
  apiGetPetHealth,
  apiCreatePetPost,
  apiDeletePetPost,
  apiAddPetHealth,
  apiDeletePetHealth,
  apiTogglePetFollow,
  apiCheckPetFollow,
  apiUpdatePet,
  type ApiPetProfile,
  type ApiPetPost,
  type ApiPetHealth,
} from "@/lib/petsApi";

const _RAW_PET_W = Dimensions.get("window").width;
const SW         = Math.min(_RAW_PET_W, 430);
const GRID_COLS  = 3;
const CELL       = (SW - 2) / GRID_COLS;
const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#A480D8";
const CAT_PLACEHOLDER = "https://loremflickr.com/300/300/cat?lock=501";

const PET_LABEL: Record<string, string> = {
  cat: "Kedi", dog: "Köpek", bird: "Kuş", rabbit: "Tavşan", other: "Diğer",
};

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function uploadPostImage(localUri: string, token: string | null): Promise<string> {
  const filename = localUri.split("/").pop() ?? "photo.jpg";
  const match = filename.match(/\.(\w+)$/);
  const mimeType = match ? `image/${match[1].toLowerCase().replace("jpg", "jpeg")}` : "image/jpeg";
  const formData = new FormData();
  if (typeof document !== "undefined") {
    const response = await fetch(localUri);
    const blob = await response.blob();
    formData.append("image", blob, filename);
  } else {
    formData.append("image", { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  }
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, headers });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json() as { url: string };
  return data.url;
}

// ── Add Post Modal ──────────────────────────────────────────────────────────
function AddPostModal({
  visible, petId, onClose, onAdded,
}: { visible: boolean; petId: string; onClose: () => void; onAdded: (post: ApiPetPost) => void }) {
  const { t } = useTranslation();
  const T = useTheme();
  const { token } = useAuth();
  const [imageUri, setImageUri] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!imageUri) { Alert.alert(t("errors.error"), t("petProfile.errorPhotoRequired")); return; }
    setLoading(true);
    try {
      const remoteUrl = await uploadPostImage(imageUri, token ?? null);
      const post = await apiCreatePetPost(petId, { imageUrl: remoteUrl, caption, location });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAdded(post);
      setImageUri(""); setCaption(""); setLocation("");
      onClose();
    } catch {
      Alert.alert(t("errors.error"), t("petProfile.errorAddPost"));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={[M.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={onClose}><Text style={[M.cancel, { color: T.textMuted }]}>{t("common.cancel")}</Text></TouchableOpacity>
          <Text style={[M.title, { color: T.text }]}>{t("petProfile.addPostModalTitle")}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={PURPLE} /> : <Text style={M.save}>{t("petProfile.share")}</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <TouchableOpacity onPress={pickImage} style={[M.imagePicker, { backgroundColor: T.card }]}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={M.previewImg} />
              : <View style={M.imagePlaceholder}>
                  <Icon name="image-outline" size={40} color={T.textMuted} />
                  <Text style={{ color: T.textMuted, marginTop: 8 }}>{t("petProfile.pickPhoto")}</Text>
                </View>
            }
          </TouchableOpacity>
          <TextInput
            style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]}
            placeholder={t("petProfile.captionPlaceholder")} placeholderTextColor={T.placeholder}
            value={caption} onChangeText={setCaption} multiline maxLength={500}
          />
          <TextInput
            style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]}
            placeholder={t("petProfile.locationOptionalPlaceholder")} placeholderTextColor={T.placeholder}
            value={location} onChangeText={setLocation}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Add Health Modal ─────────────────────────────────────────────────────────
function AddHealthModal({
  visible, petId, onClose, onAdded,
}: { visible: boolean; petId: string; onClose: () => void; onAdded: (h: ApiPetHealth) => void }) {
  const { t } = useTranslation();
  const T = useTheme();
  const [vaccineName, setVaccineName] = useState("");
  const [date, setDate] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vaccineName.trim() || !date.trim()) { Alert.alert(t("errors.error"), t("petProfile.errorVaccineRequired")); return; }
    setLoading(true);
    try {
      const row = await apiAddPetHealth(petId, { vaccineName, date, nextDate, note });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAdded(row);
      setVaccineName(""); setDate(""); setNextDate(""); setNote("");
      onClose();
    } catch {
      Alert.alert(t("errors.error"), t("petProfile.errorAddHealth"));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={[M.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={onClose}><Text style={[M.cancel, { color: T.textMuted }]}>{t("common.cancel")}</Text></TouchableOpacity>
          <Text style={[M.title, { color: T.text }]}>{t("petProfile.healthModalTitle")}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={PURPLE} /> : <Text style={M.save}>{t("common.save")}</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <TextInput style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]} placeholder={t("petProfile.vaccineName")} placeholderTextColor={T.placeholder} value={vaccineName} onChangeText={setVaccineName} />
          <TextInput style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]} placeholder={t("petProfile.vaccineDatePlaceholder")} placeholderTextColor={T.placeholder} value={date} onChangeText={setDate} />
          <TextInput style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]} placeholder={t("petProfile.vaccineNextDatePlaceholder")} placeholderTextColor={T.placeholder} value={nextDate} onChangeText={setNextDate} />
          <TextInput style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]} placeholder={t("petProfile.vaccineNotePlaceholder")} placeholderTextColor={T.placeholder} value={note} onChangeText={setNote} multiline />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Edit Pet Modal ───────────────────────────────────────────────────────────
function EditPetModal({
  visible, pet, onClose, onSaved,
}: { visible: boolean; pet: ApiPetProfile; onClose: () => void; onSaved: (p: ApiPetProfile) => void }) {
  const { t } = useTranslation();
  const T = useTheme();
  const [name, setName] = useState(pet.name);
  const [breed, setBreed] = useState(pet.breed);
  const [gender, setGender] = useState(pet.gender);
  const [birthDate, setBirthDate] = useState(pet.birthDate);
  const [weight, setWeight] = useState(pet.weight);
  const [color, setColor] = useState(pet.color);
  const [bio, setBio] = useState(pet.bio);
  const [location, setLocation] = useState(pet.location);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(pet.name); setBreed(pet.breed); setGender(pet.gender);
    setBirthDate(pet.birthDate); setWeight(pet.weight); setColor(pet.color);
    setBio(pet.bio); setLocation(pet.location);
  }, [pet]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t("errors.error"), t("petProfile.errorNameRequired")); return; }
    setLoading(true);
    try {
      const updated = await apiUpdatePet(pet.id, { name, breed, gender, birthDate, weight, color, bio, location });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(updated);
      onClose();
    } catch {
      Alert.alert(t("errors.error"), t("petProfile.errorUpdateProfile"));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={[M.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={onClose}><Text style={[M.cancel, { color: T.textMuted }]}>{t("common.cancel")}</Text></TouchableOpacity>
          <Text style={[M.title, { color: T.text }]}>{t("petProfile.editModalTitle")}</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={PURPLE} /> : <Text style={M.save}>{t("common.save")}</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {[
            { labelKey: "petProfile.fieldName",      val: name,      set: setName      },
            { labelKey: "petProfile.fieldBreed",     val: breed,     set: setBreed     },
            { labelKey: "petProfile.fieldGender",    val: gender,    set: setGender    },
            { labelKey: "petProfile.fieldBirthDate", val: birthDate, set: setBirthDate },
            { labelKey: "petProfile.fieldWeight",    val: weight,    set: setWeight    },
            { labelKey: "petProfile.fieldColor",     val: color,     set: setColor     },
            { labelKey: "petProfile.fieldBio",       val: bio,       set: setBio       },
            { labelKey: "petProfile.fieldLocation",  val: location,  set: setLocation  },
          ].map(({ labelKey, val, set }) => (
            <TextInput key={labelKey} style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]}
              placeholder={t(labelKey)} placeholderTextColor={T.placeholder} value={val} onChangeText={set} />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
type TabKey = "posts" | "health";

export default function PetProfileScreen() {
  const { t } = useTranslation();
  const T = useTheme();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [pet, setPet] = useState<ApiPetProfile | null>(null);
  const [posts, setPosts] = useState<ApiPetPost[]>([]);
  const [health, setHealth] = useState<ApiPetHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAddPost, setShowAddPost] = useState(false);
  const [showAddHealth, setShowAddHealth] = useState(false);
  const [showEditPet, setShowEditPet] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const isOwner = !!user && pet?.ownerId === user.id;

  const load = useCallback(async () => {
    if (!petId) return;
    setLoading(true);
    try {
      const [p, ps, h] = await Promise.all([
        apiGetPet(petId),
        apiGetPetPosts(petId),
        apiGetPetHealth(petId),
      ]);
      setPet(p); setPosts(ps); setHealth(h);
      if (user?.id && p.ownerId !== user.id) {
        const following = await apiCheckPetFollow(petId);
        setIsFollowing(following);
      }
    } catch {
      Alert.alert(t("errors.error"), t("petProfile.errorLoadProfile"));
    } finally { setLoading(false); }
  }, [petId, user?.id, t]);

  useEffect(() => { void load(); }, [load]);

  const handleFollow = async () => {
    if (!user?.id || !petId) return;
    try {
      const r = await apiTogglePetFollow(petId);
      setIsFollowing(r.following);
      setPet((prev) => prev ? { ...prev, followersCount: r.followersCount } : prev);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert(t("errors.error"), t("petProfile.errorFollow"));
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(t("petProfile.deletePostTitle"), t("petProfile.deletePostMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try {
            await apiDeletePetPost(petId!, postId);
            setPosts((ps) => ps.filter((p) => p.id !== postId));
            setPet((p) => p ? { ...p, postsCount: Math.max(0, p.postsCount - 1) } : p);
          } catch { Alert.alert(t("errors.error"), t("petProfile.errorDeleteFailed")); }
        },
      },
    ]);
  };

  const handleDeleteHealth = (healthId: string) => {
    Alert.alert(t("petProfile.deleteHealthTitle"), t("petProfile.deleteHealthMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try {
            await apiDeletePetHealth(petId!, healthId);
            setHealth((h) => h.filter((r) => r.id !== healthId));
          } catch { Alert.alert(t("errors.error"), t("petProfile.errorDeleteFailed")); }
        },
      },
    ]);
  };

  const headerBg = scrollY.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: "clamp" });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={PURPLE} size="large" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: T.text }}>{t("petProfile.notFound")}</Text>
      </View>
    );
  }

  const typeLabel = PET_LABEL[pet.type] ?? pet.type;
  const avatarUri = pet.avatarUrl || CAT_PLACEHOLDER;

  const tabs: { key: TabKey; icon: "grid-outline" | "medical-outline"; labelKey: string }[] = [
    { key: "posts",  icon: "grid-outline",    labelKey: "petProfile.posts"  },
    { key: "health", icon: "medical-outline", labelKey: "petProfile.health" },
  ];

  return (
    <View style={[S.root, { backgroundColor: T.bg }]}>
      <Animated.View style={[S.floatNav, { paddingTop: insets.top, opacity: 1 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerBg }]}>
          <BlurView intensity={60} style={StyleSheet.absoluteFill} tint={T.isDark ? "dark" : "light"} />
        </Animated.View>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Icon name="chevron-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={[S.floatTitle, { color: T.text }]}>{pet.name}</Text>
        {isOwner && (
          <TouchableOpacity onPress={() => setShowEditPet(true)} style={S.backBtn}>
            <Icon name="ellipsis-horizontal" size={22} color={T.text} />
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <LinearGradient colors={["#2D1B69", T.isDark ? "#0a0a0f" : "#F8F5FF"]} style={S.cover}>
          <View style={{ paddingTop: insets.top + 56, alignItems: "center" }}>
            <View style={S.avatarWrap}>
              <LinearGradient colors={[PURPLE_LIGHT, PURPLE]} style={S.avatarRing}>
                <Image source={{ uri: avatarUri }} style={S.avatar} />
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>

        <View style={[S.infoBlock, { backgroundColor: T.bg }]}>
          <Text style={[S.petName, { color: T.text }]}>{pet.name}</Text>
          <Text style={[S.petSub, { color: T.textMuted }]}>{typeLabel}{pet.breed ? ` · ${pet.breed}` : ""}</Text>
          {pet.bio ? <Text style={[S.bio, { color: T.textMuted }]}>{pet.bio}</Text> : null}
          {pet.location ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Icon name="location-outline" size={13} color={T.textMuted} />
              <Text style={[S.infoMeta, { color: T.textMuted }]}>{pet.location}</Text>
            </View>
          ) : null}

          <View style={S.statsRow}>
            {[
              { labelKey: "petProfile.statPosts",     val: posts.length        },
              { labelKey: "petProfile.statFollowers", val: pet.followersCount  },
            ].map(({ labelKey, val }) => (
              <View key={labelKey} style={S.statCell}>
                <Text style={[S.statNum, { color: T.text }]}>{val}</Text>
                <Text style={[S.statLabel, { color: T.textMuted }]}>{t(labelKey)}</Text>
              </View>
            ))}
          </View>

          <View style={S.pills}>
            {pet.gender    ? <View style={[S.pill, { backgroundColor: T.card }]}><Text style={[S.pillTxt, { color: T.textMuted }]}>{pet.gender}</Text></View> : null}
            {pet.weight    ? <View style={[S.pill, { backgroundColor: T.card, flexDirection: "row", alignItems: "center", gap: 4 }]}><Icon name="barbell-outline" size={12} color={T.textMuted} /><Text style={[S.pillTxt, { color: T.textMuted }]}>{pet.weight} kg</Text></View> : null}
            {pet.color     ? <View style={[S.pill, { backgroundColor: T.card }]}><Text style={[S.pillTxt, { color: T.textMuted }]}>{pet.color}</Text></View> : null}
            {pet.birthDate ? <View style={[S.pill, { backgroundColor: T.card, flexDirection: "row", alignItems: "center", gap: 4 }]}><Icon name="calendar-outline" size={12} color={T.textMuted} /><Text style={[S.pillTxt, { color: T.textMuted }]}>{pet.birthDate}</Text></View> : null}
          </View>

          {isOwner ? (
            <View style={S.actionRow}>
              <TouchableOpacity style={[S.actionBtn, { flex: 1 }]} onPress={() => setShowAddPost(true)}>
                <Icon name="add-circle-outline" size={16} color="#fff" />
                <Text style={S.actionTxt}>{t("petProfile.addPost")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, S.actionBtnOutline, { flex: 1, borderColor: T.border }]} onPress={() => setShowAddHealth(true)}>
                <Icon name="heart-outline" size={16} color={T.text} />
                <Text style={[S.actionTxt, { color: T.text }]}>{t("petProfile.addHealth")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={S.actionRow}>
              <TouchableOpacity
                style={[S.actionBtn, { flex: 1 }, isFollowing && { ...S.actionBtnOutline, borderColor: T.border }]}
                onPress={handleFollow}
              >
                <Text style={[S.actionTxt, isFollowing && { color: T.text }]}>
                  {isFollowing ? t("petProfile.following") : t("petProfile.follow")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[S.tabs, { borderTopColor: T.border }]}>
          {tabs.map(({ key, icon, labelKey }) => (
            <TouchableOpacity key={key} style={[S.tab, activeTab === key && S.tabActive]} onPress={() => setActiveTab(key)}>
              <Icon name={icon} size={18} color={activeTab === key ? PURPLE : T.textMuted} />
              <Text style={[S.tabTxt, { color: T.textMuted }, activeTab === key && { color: PURPLE }]}>{t(labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "posts" && (
          posts.length === 0
            ? (
              <View style={S.empty}>
                <Icon name="image-outline" size={44} color={T.textFaint} />
                <Text style={[S.emptyTxt, { color: T.textMuted }]}>{t("petProfile.noPostsYet")}</Text>
                {isOwner && (
                  <TouchableOpacity style={[S.actionBtn, { marginTop: 16, paddingHorizontal: 24 }]} onPress={() => setShowAddPost(true)}>
                    <Text style={S.actionTxt}>{t("petProfile.addFirstPost")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
            : (
              <View style={S.grid}>
                {posts.map((post, i) => (
                  <TouchableOpacity
                    key={post.id}
                    style={[S.cell, i % GRID_COLS !== GRID_COLS - 1 && { marginRight: 1 }, { marginBottom: 1 }]}
                    onPress={() => setLightboxUri(post.imageUrl)}
                    onLongPress={() => isOwner && handleDeletePost(post.id)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: post.imageUrl }} style={S.cellImg} />
                  </TouchableOpacity>
                ))}
              </View>
            )
        )}

        {activeTab === "health" && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {health.length === 0
              ? (
                <View style={S.empty}>
                  <Icon name="medical-outline" size={44} color={T.textFaint} />
                  <Text style={[S.emptyTxt, { color: T.textMuted }]}>{t("petProfile.noHealthYet")}</Text>
                  {isOwner && (
                    <TouchableOpacity style={[S.actionBtn, { marginTop: 16, paddingHorizontal: 24 }]} onPress={() => setShowAddHealth(true)}>
                      <Text style={S.actionTxt}>{t("petProfile.addFirstHealth")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
              : health.map((h) => (
                <View key={h.id} style={[S.healthCard, { backgroundColor: T.card }]}>
                  <View style={[S.healthCardIcon, { backgroundColor: T.purpleFaint }]}>
                    <Icon name="shield-checkmark-outline" size={22} color={PURPLE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.healthName, { color: T.text }]}>{h.vaccineName}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Icon name="calendar-outline" size={13} color={T.textMuted} />
                      <Text style={[S.healthDate, { color: T.textMuted }]}>{h.date}{h.nextDate ? ` · ${h.nextDate}` : ""}</Text>
                    </View>
                    {h.note ? <Text style={[S.healthNote, { color: T.textMuted }]}>{h.note}</Text> : null}
                  </View>
                  {isOwner && (
                    <TouchableOpacity onPress={() => handleDeleteHealth(h.id)} style={{ padding: 4 }}>
                      <Icon name="trash-outline" size={18} color={T.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            }
          </View>
        )}
      </Animated.ScrollView>

      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <Pressable style={S.lightboxBg} onPress={() => setLightboxUri(null)}>
          {lightboxUri && <Image source={{ uri: lightboxUri }} style={S.lightboxImg} resizeMode="contain" />}
        </Pressable>
      </Modal>

      {showAddPost && user && (
        <AddPostModal
          visible={showAddPost}
          petId={petId!}
          onClose={() => setShowAddPost(false)}
          onAdded={(post) => {
            setPosts((ps) => [post, ...ps]);
            setPet((p) => p ? { ...p, postsCount: p.postsCount + 1 } : p);
          }}
        />
      )}
      {showAddHealth && user && (
        <AddHealthModal
          visible={showAddHealth}
          petId={petId!}
          onClose={() => setShowAddHealth(false)}
          onAdded={(h) => setHealth((prev) => [h, ...prev])}
        />
      )}
      {showEditPet && pet && user && (
        <EditPetModal
          visible={showEditPet}
          pet={pet}
          onClose={() => setShowEditPet(false)}
          onSaved={setPet}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  floatNav: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  floatTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cover: { height: 200, width: "100%" },
  avatarWrap: { marginTop: -20 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    padding: 3, justifyContent: "center", alignItems: "center",
  },
  avatar: { width: 94, height: 94, borderRadius: 47 },
  infoBlock: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, alignItems: "center" },
  petName: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  petSub: { color: "#aaa", fontSize: 14, marginTop: 2, textAlign: "center" },
  bio: { color: "#ccc", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  infoMeta: { color: "#888", fontSize: 12 },
  statsRow: { flexDirection: "row", marginTop: 16, gap: 32 },
  statCell: { alignItems: "center" },
  statNum: { color: "#fff", fontSize: 20, fontWeight: "700" },
  statLabel: { color: "#888", fontSize: 12, marginTop: 2 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, justifyContent: "center" },
  pill: { backgroundColor: "#1e1e2e", borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  pillTxt: { color: "#ccc", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16, width: "100%" },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 10,
  },
  actionBtnOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#444" },
  actionTxt: { color: "#fff", fontWeight: "600", fontSize: 14 },
  tabs: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#222", marginTop: 12 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  tabActive: { borderTopWidth: 2, borderTopColor: PURPLE },
  tabTxt: { color: "#666", fontSize: 13, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL, height: CELL },
  cellImg: { width: "100%", height: "100%" },
  empty: { paddingVertical: 60, alignItems: "center", gap: 8 },
  emptyTxt: { color: "#555", fontSize: 15 },
  healthCard: {
    backgroundColor: "#12121c", borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "flex-start", gap: 12,
  },
  healthCardIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#1e1e3a",
    justifyContent: "center", alignItems: "center",
  },
  healthName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  healthDate: { color: "#888", fontSize: 12, marginTop: 3 },
  healthNote: { color: "#777", fontSize: 12, marginTop: 4 },
  lightboxBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  lightboxImg: { width: SW, height: SW },
});

const M = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: "#333",
  },
  title:  { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancel: { color: "#888", fontSize: 15 },
  save:   { color: PURPLE, fontSize: 15, fontWeight: "700" },
  imagePicker: { borderRadius: 12, overflow: "hidden", marginBottom: 16, backgroundColor: "#12121c", minHeight: 200, justifyContent: "center" },
  imagePlaceholder: { height: 200, justifyContent: "center", alignItems: "center" },
  previewImg: { width: "100%", height: 260 },
  input: {
    backgroundColor: "#12121c", borderRadius: 12, padding: 14,
    color: "#fff", fontSize: 15, marginBottom: 12, borderWidth: 0.5, borderColor: "#333",
  },
});
