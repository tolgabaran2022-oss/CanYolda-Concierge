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
import { Ionicons } from "@expo/vector-icons";
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

// ── Add Post Modal ─────────────────────────────────────────────────────────────
function AddPostModal({
  visible, petId, userId, onClose, onAdded,
}: { visible: boolean; petId: string; userId: string; onClose: () => void; onAdded: (post: ApiPetPost) => void }) {
  const T = useTheme();
  const [imageUri, setImageUri] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!imageUri) { Alert.alert("Hata", "Lütfen bir fotoğraf seçin."); return; }
    setLoading(true);
    try {
      const post = await apiCreatePetPost(petId, userId, { imageUrl: imageUri, caption, location });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAdded(post);
      setImageUri(""); setCaption(""); setLocation("");
      onClose();
    } catch {
      Alert.alert("Hata", "Gönderi eklenemedi.");
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={[M.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={onClose}><Text style={[M.cancel, { color: T.textMuted }]}>İptal</Text></TouchableOpacity>
          <Text style={[M.title, { color: T.text }]}>Yeni Gönderi</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={PURPLE} /> : <Text style={M.save}>Paylaş</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <TouchableOpacity onPress={pickImage} style={[M.imagePicker, { backgroundColor: T.card }]}>
            {imageUri
              ? <Image source={{ uri: imageUri }} style={M.previewImg} />
              : <View style={M.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color={T.textMuted} />
                  <Text style={{ color: T.textMuted, marginTop: 8 }}>Fotoğraf Seç</Text>
                </View>
            }
          </TouchableOpacity>
          <TextInput
            style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]}
            placeholder="Açıklama..." placeholderTextColor={T.placeholder}
            value={caption} onChangeText={setCaption} multiline maxLength={500}
          />
          <TextInput
            style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]}
            placeholder="Konum (isteğe bağlı)" placeholderTextColor={T.placeholder}
            value={location} onChangeText={setLocation}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Add Health Modal ────────────────────────────────────────────────────────────
function AddHealthModal({
  visible, petId, userId, onClose, onAdded,
}: { visible: boolean; petId: string; userId: string; onClose: () => void; onAdded: (h: ApiPetHealth) => void }) {
  const T = useTheme();
  const [vaccineName, setVaccineName] = useState("");
  const [date, setDate] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vaccineName.trim() || !date.trim()) { Alert.alert("Hata", "Aşı adı ve tarih zorunlu."); return; }
    setLoading(true);
    try {
      const row = await apiAddPetHealth(petId, userId, { vaccineName, date, nextDate, note });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAdded(row);
      setVaccineName(""); setDate(""); setNextDate(""); setNote("");
      onClose();
    } catch {
      Alert.alert("Hata", "Kayıt eklenemedi.");
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={[M.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={onClose}><Text style={[M.cancel, { color: T.textMuted }]}>İptal</Text></TouchableOpacity>
          <Text style={[M.title, { color: T.text }]}>Sağlık Kaydı</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={PURPLE} /> : <Text style={M.save}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <TextInput style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]} placeholder="Aşı / İlaç adı *" placeholderTextColor={T.placeholder} value={vaccineName} onChangeText={setVaccineName} />
          <TextInput style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]} placeholder="Tarih (gg.aa.yyyy) *" placeholderTextColor={T.placeholder} value={date} onChangeText={setDate} />
          <TextInput style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]} placeholder="Sonraki tarih (gg.aa.yyyy)" placeholderTextColor={T.placeholder} value={nextDate} onChangeText={setNextDate} />
          <TextInput style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]} placeholder="Not" placeholderTextColor={T.placeholder} value={note} onChangeText={setNote} multiline />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Edit Pet Modal ─────────────────────────────────────────────────────────────
function EditPetModal({
  visible, pet, userId, onClose, onSaved,
}: { visible: boolean; pet: ApiPetProfile; userId: string; onClose: () => void; onSaved: (p: ApiPetProfile) => void }) {
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
    if (!name.trim()) { Alert.alert("Hata", "İsim zorunlu."); return; }
    setLoading(true);
    try {
      const updated = await apiUpdatePet(pet.id, userId, { name, breed, gender, birthDate, weight, color, bio, location });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(updated);
      onClose();
    } catch {
      Alert.alert("Hata", "Kayıt güncellenemedi.");
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={[M.header, { borderBottomColor: T.border }]}>
          <TouchableOpacity onPress={onClose}><Text style={[M.cancel, { color: T.textMuted }]}>İptal</Text></TouchableOpacity>
          <Text style={[M.title, { color: T.text }]}>Profili Düzenle</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={PURPLE} /> : <Text style={M.save}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {[
            { label: "İsim *", val: name, set: setName },
            { label: "Cins", val: breed, set: setBreed },
            { label: "Cinsiyet", val: gender, set: setGender },
            { label: "Doğum tarihi (gg.aa.yyyy)", val: birthDate, set: setBirthDate },
            { label: "Kilo (kg)", val: weight, set: setWeight },
            { label: "Renk", val: color, set: setColor },
            { label: "Biyografi", val: bio, set: setBio },
            { label: "Konum", val: location, set: setLocation },
          ].map(({ label, val, set }) => (
            <TextInput key={label} style={[M.input, { backgroundColor: T.input, color: T.text, borderColor: T.border }]}
              placeholder={label} placeholderTextColor={T.placeholder} value={val} onChangeText={set} />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
type TabKey = "posts" | "health";

export default function PetProfileScreen() {
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
        const following = await apiCheckPetFollow(petId, user.id);
        setIsFollowing(following);
      }
    } catch {
      Alert.alert("Hata", "Profil yüklenemedi.");
    } finally { setLoading(false); }
  }, [petId, user?.id]);

  useEffect(() => { void load(); }, [load]);

  const handleFollow = async () => {
    if (!user?.id || !petId) return;
    try {
      const r = await apiTogglePetFollow(petId, user.id);
      setIsFollowing(r.following);
      setPet((prev) => prev ? { ...prev, followersCount: r.followersCount } : prev);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert("Hata", "İşlem başarısız.");
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert("Sil", "Bu gönderiyi silmek istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          try {
            await apiDeletePetPost(petId!, postId, user!.id);
            setPosts((ps) => ps.filter((p) => p.id !== postId));
            setPet((p) => p ? { ...p, postsCount: Math.max(0, p.postsCount - 1) } : p);
          } catch { Alert.alert("Hata", "Silinemedi."); }
        },
      },
    ]);
  };

  const handleDeleteHealth = (healthId: string) => {
    Alert.alert("Sil", "Bu kaydı silmek istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          try {
            await apiDeletePetHealth(petId!, healthId, user!.id);
            setHealth((h) => h.filter((r) => r.id !== healthId));
          } catch { Alert.alert("Hata", "Silinemedi."); }
        },
      },
    ]);
  };

  // header opacity on scroll
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
        <Text style={{ color: T.text }}>Profil bulunamadı.</Text>
      </View>
    );
  }

  const typeLabel = PET_LABEL[pet.type] ?? pet.type;
  const avatarUri = pet.avatarUrl || CAT_PLACEHOLDER;

  return (
    <View style={[S.root, { backgroundColor: T.bg }]}>
      {/* Floating nav bar */}
      <Animated.View style={[S.floatNav, { paddingTop: insets.top, opacity: 1 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerBg }]}>
          <BlurView intensity={60} style={StyleSheet.absoluteFill} tint={T.isDark ? "dark" : "light"} />
        </Animated.View>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={[S.floatTitle, { color: T.text }]}>{pet.name}</Text>
        {isOwner && (
          <TouchableOpacity onPress={() => setShowEditPet(true)} style={S.backBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={T.text} />
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Cover + Avatar */}
        <LinearGradient colors={["#2D1B69", T.isDark ? "#0a0a0f" : "#F8F5FF"]} style={S.cover}>
          <View style={{ paddingTop: insets.top + 56, alignItems: "center" }}>
            <View style={S.avatarWrap}>
              <LinearGradient colors={[PURPLE_LIGHT, PURPLE]} style={S.avatarRing}>
                <Image source={{ uri: avatarUri }} style={S.avatar} />
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>

        {/* Info */}
        <View style={[S.infoBlock, { backgroundColor: T.bg }]}>
          <Text style={[S.petName, { color: T.text }]}>{pet.name}</Text>
          <Text style={[S.petSub, { color: T.textMuted }]}>{typeLabel}{pet.breed ? ` · ${pet.breed}` : ""}</Text>
          {pet.bio ? <Text style={[S.bio, { color: T.textMuted }]}>{pet.bio}</Text> : null}
          {pet.location ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={13} color={T.textMuted} />
              <Text style={[S.infoMeta, { color: T.textMuted }]}>{pet.location}</Text>
            </View>
          ) : null}

          {/* Stats row */}
          <View style={S.statsRow}>
            {[
              { label: "Gönderi", val: posts.length },
              { label: "Takipçi", val: pet.followersCount },
            ].map(({ label, val }) => (
              <View key={label} style={S.statCell}>
                <Text style={[S.statNum, { color: T.text }]}>{val}</Text>
                <Text style={[S.statLabel, { color: T.textMuted }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Meta pills */}
          <View style={S.pills}>
            {pet.gender ? <View style={[S.pill, { backgroundColor: T.card }]}><Text style={[S.pillTxt, { color: T.textMuted }]}>{pet.gender}</Text></View> : null}
            {pet.weight ? <View style={[S.pill, { backgroundColor: T.card, flexDirection: "row", alignItems: "center", gap: 4 }]}><Ionicons name="barbell-outline" size={12} color={T.textMuted} /><Text style={[S.pillTxt, { color: T.textMuted }]}>{pet.weight} kg</Text></View> : null}
            {pet.color ? <View style={[S.pill, { backgroundColor: T.card }]}><Text style={[S.pillTxt, { color: T.textMuted }]}>{pet.color}</Text></View> : null}
            {pet.birthDate ? <View style={[S.pill, { backgroundColor: T.card, flexDirection: "row", alignItems: "center", gap: 4 }]}><Ionicons name="calendar-outline" size={12} color={T.textMuted} /><Text style={[S.pillTxt, { color: T.textMuted }]}>{pet.birthDate}</Text></View> : null}
          </View>

          {/* Action buttons */}
          {isOwner ? (
            <View style={S.actionRow}>
              <TouchableOpacity style={[S.actionBtn, { flex: 1 }]} onPress={() => setShowAddPost(true)}>
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={S.actionTxt}>Gönderi Ekle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, S.actionBtnOutline, { flex: 1, borderColor: T.border }]} onPress={() => setShowAddHealth(true)}>
                <Ionicons name="heart-outline" size={16} color={T.text} />
                <Text style={[S.actionTxt, { color: T.text }]}>Sağlık Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={S.actionRow}>
              <TouchableOpacity
                style={[S.actionBtn, { flex: 1 }, isFollowing && { ...S.actionBtnOutline, borderColor: T.border }]}
                onPress={handleFollow}
              >
                <Text style={[S.actionTxt, isFollowing && { color: T.text }]}>{isFollowing ? "Takip Ediliyor" : "Takip Et"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={[S.tabs, { borderTopColor: T.border }]}>
          {([
            { key: "posts" as TabKey, icon: "grid-outline", label: "Gönderiler" },
            { key: "health" as TabKey, icon: "medical-outline", label: "Sağlık" },
          ] as const).map(({ key, icon, label }) => (
            <TouchableOpacity key={key} style={[S.tab, activeTab === key && S.tabActive]} onPress={() => setActiveTab(key)}>
              <Ionicons name={icon} size={18} color={activeTab === key ? PURPLE : T.textMuted} />
              <Text style={[S.tabTxt, { color: T.textMuted }, activeTab === key && { color: PURPLE }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Posts grid */}
        {activeTab === "posts" && (
          posts.length === 0
            ? (
              <View style={S.empty}>
                <Ionicons name="image-outline" size={44} color={T.textFaint} />
                <Text style={[S.emptyTxt, { color: T.textMuted }]}>Henüz gönderi yok</Text>
                {isOwner && (
                  <TouchableOpacity style={[S.actionBtn, { marginTop: 16, paddingHorizontal: 24 }]} onPress={() => setShowAddPost(true)}>
                    <Text style={S.actionTxt}>İlk Gönderiyi Ekle</Text>
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

        {/* Health records */}
        {activeTab === "health" && (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {health.length === 0
              ? (
                <View style={S.empty}>
                  <Ionicons name="medical-outline" size={44} color={T.textFaint} />
                  <Text style={[S.emptyTxt, { color: T.textMuted }]}>Sağlık kaydı bulunamadı</Text>
                  {isOwner && (
                    <TouchableOpacity style={[S.actionBtn, { marginTop: 16, paddingHorizontal: 24 }]} onPress={() => setShowAddHealth(true)}>
                      <Text style={S.actionTxt}>Kayıt Ekle</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
              : health.map((h) => (
                <View key={h.id} style={[S.healthCard, { backgroundColor: T.card }]}>
                  <View style={[S.healthCardIcon, { backgroundColor: T.purpleFaint }]}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={PURPLE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.healthName, { color: T.text }]}>{h.vaccineName}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Ionicons name="calendar-outline" size={13} color={T.textMuted} />
                      <Text style={[S.healthDate, { color: T.textMuted }]}>{h.date}{h.nextDate ? ` · ${h.nextDate}` : ""}</Text>
                    </View>
                    {h.note ? <Text style={[S.healthNote, { color: T.textMuted }]}>{h.note}</Text> : null}
                  </View>
                  {isOwner && (
                    <TouchableOpacity onPress={() => handleDeleteHealth(h.id)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color={T.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            }
          </View>
        )}
      </Animated.ScrollView>

      {/* Lightbox */}
      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <Pressable style={S.lightboxBg} onPress={() => setLightboxUri(null)}>
          {lightboxUri && <Image source={{ uri: lightboxUri }} style={S.lightboxImg} resizeMode="contain" />}
        </Pressable>
      </Modal>

      {/* Sub-modals */}
      {showAddPost && user && (
        <AddPostModal
          visible={showAddPost}
          petId={petId!}
          userId={user.id}
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
          userId={user.id}
          onClose={() => setShowAddHealth(false)}
          onAdded={(h) => setHealth((prev) => [h, ...prev])}
        />
      )}
      {showEditPet && pet && user && (
        <EditPetModal
          visible={showEditPet}
          pet={pet}
          userId={user.id}
          onClose={() => setShowEditPet(false)}
          onSaved={setPet}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
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
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancel: { color: "#888", fontSize: 15 },
  save: { color: PURPLE, fontSize: 15, fontWeight: "700" },
  imagePicker: { borderRadius: 12, overflow: "hidden", marginBottom: 16, backgroundColor: "#12121c", minHeight: 200, justifyContent: "center" },
  imagePlaceholder: { height: 200, justifyContent: "center", alignItems: "center" },
  previewImg: { width: "100%", height: 260 },
  input: {
    backgroundColor: "#12121c", borderRadius: 12, padding: 14,
    color: "#fff", fontSize: 15, marginBottom: 12, borderWidth: 0.5, borderColor: "#333",
  },
});
