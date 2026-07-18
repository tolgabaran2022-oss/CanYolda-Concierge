import { Icon } from "@/components/Icon";
import { STATUS_COLORS } from "@/components/StatusBadge";
import type { AnimalStatus } from "@/contexts/AnimalsContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { ANIMAL_TYPES, type AnimalType } from "@/utils/animalDefaults";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ── Icon mappings for animal types ──────────────────────────── */
const ANIMAL_TYPE_ICONS: Record<AnimalType, string> = {
  kedi:  "cat",
  kopek: "dog",
  kus:   "bird",
  diger: "paw",
};

/* ── Status definitions ───────────────────────────────────────── */
const STATUSES: {
  key: AnimalStatus;
  label: string;
  icon: string;
  tintBg: string;
  tintBorder: string;
  iconColor: string;
}[] = [
  {
    key: "hungry",
    label: "Aç",
    icon: "restaurant-outline",
    tintBg: "#FEF3C7",
    tintBorder: "#F59E0B",
    iconColor: "#92400E",
  },
  {
    key: "injured",
    label: "Yaralı",
    icon: "pulse-outline",
    tintBg: "#FEE2E2",
    tintBorder: "#EF4444",
    iconColor: "#991B1B",
  },
  {
    key: "healthy",
    label: "Sağlıklı",
    icon: "checkmark-circle-outline",
    tintBg: "#D1FAE5",
    tintBorder: "#10B981",
    iconColor: "#065F46",
  },
  {
    key: "unknown",
    label: "Bilinmiyor",
    icon: "help-circle-outline",
    tintBg: "#F3F4F6",
    tintBorder: "#9CA3AF",
    iconColor: "#374151",
  },
];

const DEFAULT_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

/* ── Duplicate detection ──────────────────────────────────────── */
interface NearbyAnimal { id: string; notes: string; locationName?: string; reportCode?: string; }

async function checkNearbyAnimals(lat: number, lng: number): Promise<NearbyAnimal[]> {
  try {
    const res = await fetch(
      `${API_BASE}/animals/nearby?lat=${lat}&lng=${lng}&radiusM=100&sinceMinutes=60`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json() as { nearby: NearbyAnimal[] };
    return data.nearby ?? [];
  } catch {
    return [];
  }
}

async function uploadImage(localUri: string, token: string | null): Promise<string> {
  const filename = localUri.split("/").pop() ?? "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase().replace("jpg", "jpeg")}` : "image/jpeg";

  const formData = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(localUri);
    const blob = await response.blob();
    formData.append("image", blob, filename);
  } else {
    formData.append("image", { uri: localUri, name: filename, type } as unknown as Blob);
  }

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, headers });
  if (!res.ok) throw new Error("Fotoğraf yüklenemedi");
  const data = await res.json() as { url: string };
  return data.url;
}

type PhotoStatus = "idle" | "uploading" | "ready" | "upload_failed";

export default function AddAnimalScreen() {
  const C      = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addAnimal } = useAnimals();
  const { user, token } = useAuth();
  const params = useLocalSearchParams<{ initialLat?: string; initialLng?: string }>();

  const [image, setImage]                   = useState<string | undefined>(); // confirmed local URI
  const [pendingImage, setPendingImage]     = useState<string | undefined>(); // captured, awaiting confirm
  const [confirmedImageUrl, setConfirmedImageUrl] = useState<string | undefined>(); // uploaded remote URL
  const [photoStatus, setPhotoStatus]       = useState<PhotoStatus>("idle");
  const [photoStatusReason, setPhotoStatusReason] = useState<string | undefined>();

  const [animalType, setAnimalType]         = useState<AnimalType>("diger");
  const [status, setStatus]               = useState<AnimalStatus>("unknown");
  const [notes, setNotes]                 = useState("");
  const [notesFocused, setNotesFocused]   = useState(false);
  const [location, setLocation]           = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName]   = useState<string | undefined>();
  const [isLocating, setIsLocating]       = useState(false);

  /* ── Pre-fill location from route params (e.g. from map screen) ── */
  useEffect(() => {
    const lat = params.initialLat ? parseFloat(params.initialLat) : NaN;
    const lng = params.initialLng ? parseFloat(params.initialLng) : NaN;
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      setLocation({ latitude: lat, longitude: lng });
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isSaving, setIsSaving]           = useState(false);
  const [locPermission, requestLocPermission] = Location.useForegroundPermissions();

  /* ── Actions ─────────────────────────────────────────────────── */
  const openCamera = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Kamera Desteklenmiyor",
        "Sokak hayvanı bildirimi oluşturmak için iOS veya Android uygulamasını kullanın.",
        [{ text: "Tamam" }]
      );
      return;
    }

    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Kamera İzni Gerekli",
        "Fotoğraf çekebilmek için kamera izni vermeniz gerekiyor.",
        [
          canAskAgain
            ? { text: "Kamera İzni Ver", onPress: openCamera }
            : { text: "Ayarları Aç", onPress: () => void Linking.openSettings() },
          { text: "Vazgeç", style: "cancel" },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingImage(result.assets[0].uri);
    }
  };

  const confirmImage = async () => {
    if (!pendingImage) return;

    const localUri = pendingImage;
    setImage(localUri);
    setPendingImage(undefined);
    setConfirmedImageUrl(undefined);
    setPhotoStatusReason(undefined);
    setPhotoStatus("uploading");

    try {
      const uploadedUrl = await uploadImage(localUri, token ?? null);
      setConfirmedImageUrl(uploadedUrl);
      setPhotoStatus("ready");
    } catch {
      setPhotoStatus("upload_failed");
      setPhotoStatusReason("Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
    }
  };

  const retakePhoto = () => {
    setPendingImage(undefined);
    setImage(undefined);
    setConfirmedImageUrl(undefined);
    setPhotoStatus("idle");
    setPhotoStatusReason(undefined);
    void openCamera();
  };

  const removeImage = () => {
    setImage(undefined);
    setPendingImage(undefined);
    setConfirmedImageUrl(undefined);
    setPhotoStatus("idle");
    setPhotoStatusReason(undefined);
  };

  const showDuplicateAlert = (nearby: NearbyAnimal[], onContinue: () => void) => {
    const first = nearby[0];
    const desc = first?.reportCode
      ? `${first.reportCode} numaralı bildirim zaten var`
      : "Bu konuma yakın son 1 saat içinde bir bildirim yapılmış";
    Alert.alert(
      "Benzer Bildirim Var",
      `${desc}.\n\nYine de yeni bildirim yapmak ister misiniz?`,
      [
        { text: "Mevcut Bildirimi Gör", onPress: () => router.push(`/animal/${first?.id}`), style: "cancel" },
        { text: "Yeni Bildirim Yap", onPress: onContinue },
      ]
    );
  };

  const getLocation = async () => {
    setIsLocating(true);
    try {
      if (Platform.OS !== "web" && !locPermission?.granted) {
        await requestLocPermission();
      }
      if (Platform.OS === "web") {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            try {
              const [geo] = await Location.reverseGeocodeAsync(coords);
              const parts = [geo?.district ?? geo?.subregion, geo?.city ?? geo?.region].filter(Boolean);
              const name = parts.length > 0 ? parts.join(", ") : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
              const nearby = await checkNearbyAnimals(coords.latitude, coords.longitude);
              if (nearby.length > 0) {
                setIsLocating(false);
                showDuplicateAlert(nearby, () => { setLocation(coords); setLocationName(name); });
              } else {
                setLocation(coords);
                setLocationName(name);
                setIsLocating(false);
              }
            } catch {
              setLocation(coords);
              setLocationName(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
              setIsLocating(false);
            }
          },
          () => {
            setLocation(DEFAULT_REGION);
            setLocationName(undefined);
            setIsLocating(false);
          }
        );
      } else {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        try {
          const [geo] = await Location.reverseGeocodeAsync(coords);
          const parts = [geo?.district ?? geo?.subregion, geo?.city ?? geo?.region].filter(Boolean);
          const name = parts.length > 0 ? parts.join(", ") : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
          const nearby = await checkNearbyAnimals(coords.latitude, coords.longitude);
          if (nearby.length > 0) {
            setIsLocating(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showDuplicateAlert(nearby, () => { setLocation(coords); setLocationName(name); });
          } else {
            setLocation(coords);
            setLocationName(name);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsLocating(false);
          }
        } catch {
          setLocation(coords);
          setLocationName(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsLocating(false);
        }
      }
    } catch {
      setLocation(DEFAULT_REGION);
      setLocationName(undefined);
      setIsLocating(false);
    }
  };

  const handleSave = async () => {
    if (!location) {
      Alert.alert("Konum Gerekli", "Lütfen hayvanın konumunu belirleyin.");
      return;
    }
    if (!user) return;

    if (!confirmedImageUrl || photoStatus !== "ready") {
      Alert.alert(
        "Fotoğraf Gerekli",
        photoStatus === "uploading"
          ? "Fotoğraf yükleniyor, lütfen bekleyin."
          : photoStatus === "upload_failed"
            ? (photoStatusReason ?? "Fotoğraf yüklenemedi. Lütfen tekrar deneyin.")
            : "Lütfen önce hayvanın fotoğrafını çekin.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await addAnimal({
        image: confirmedImageUrl,
        animalType,
        latitude: location.latitude,
        longitude: location.longitude,
        locationName,
        status,
        notes: notes.trim(),
        userId: user.id,
        userName: user.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Hata", "Kaydedilemedi, lütfen tekrar deneyin.");
    } finally {
      setIsSaving(false);
    }
  };

  const mapRegion = location
    ? { ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : DEFAULT_REGION;

  return (
    <View style={[S.root, { backgroundColor: C.bg }]}>
      {/* ── Custom Header ────────────────────────────────────────── */}
      <View style={[S.header, { paddingTop: insets.top + 6, borderBottomColor: C.border }]}>
        <Pressable
          style={[S.backBtn, { backgroundColor: C.purpleFaint }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Icon name="chevron-back" size={20} color={C.purple} />
        </Pressable>
        <View style={S.headerTitles}>
          <Text style={[S.headerTitle, { color: C.text }]}>Sokak Hayvanı Ekle</Text>
          <Text style={[S.headerSubtitle, { color: C.textMuted }]}>
            Yakındaki bir dost için yardım bildir
          </Text>
        </View>
        <View style={S.headerSpacer} />
      </View>

      {/* ── Scrollable form body ─────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. Photo card ───────────────────────────────────────── */}
        <View style={S.section}>
          <SectionLabel
            label="Fotoğraf"
            note="Zorunlu — Yalnızca kamera ile çekilebilir"
          />
          <Text style={[S.photoRequiredSub, { color: C.textMuted }]}>
            Hayvanın olay yerindeki güncel ve net fotoğrafını çekin.
          </Text>

          {/* Pending preview — captured but not yet confirmed */}
          {pendingImage ? (
            <View style={[S.photoCard, { backgroundColor: C.bgSecondary, borderColor: C.borderStrong }]}>
              <Image source={{ uri: pendingImage }} style={S.photoImage} contentFit="cover" />
              <View style={S.photoPreviewActions}>
                <Pressable style={[S.photoPreviewBtn, { backgroundColor: "rgba(0,0,0,0.55)" }]} onPress={retakePhoto}>
                  <Icon name="camera-reverse-outline" size={16} color="#FFFFFF" />
                  <Text style={S.photoPreviewBtnText}>Tekrar Çek</Text>
                </Pressable>
                <Pressable style={[S.photoPreviewBtn, { backgroundColor: C.purple }]} onPress={() => { void confirmImage(); }}>
                  <Icon name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={S.photoPreviewBtnText}>Fotoğrafı Kullan</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={photoStatus === "uploading" ? undefined : openCamera}
              style={[S.photoCard, { backgroundColor: C.bgSecondary, borderColor: C.borderStrong }]}
            >
              {image ? (
                <>
                  <Image source={{ uri: image }} style={S.photoImage} contentFit="cover" />
                  {/* Top-right remove button — only when not uploading */}
                  {photoStatus !== "uploading" && (
                    <Pressable style={S.photoRemoveBtn} onPress={removeImage} hitSlop={8}>
                      <Icon name="close-circle" size={26} color="#FFFFFF" />
                    </Pressable>
                  )}
                  {/* Status overlay */}
                  {photoStatus === "uploading" ? (
                    <View style={[S.photoStatusOverlay, { backgroundColor: "rgba(0,0,0,0.60)" }]}>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={S.photoStatusOverlayText}>Fotoğraf yükleniyor…</Text>
                    </View>
                  ) : photoStatus === "ready" ? (
                    <View style={[S.photoStatusOverlay, { backgroundColor: "rgba(34,197,94,0.75)" }]}>
                      <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={S.photoStatusOverlayText}>Fotoğraf hazır.</Text>
                    </View>
                  ) : photoStatus === "upload_failed" ? (
                    <View style={[S.photoStatusOverlay, { backgroundColor: "rgba(239,68,68,0.80)" }]}>
                      <Icon name="cloud-offline-outline" size={20} color="#FFFFFF" />
                      <Text style={S.photoStatusOverlayText}>Yükleme başarısız — tekrar çek</Text>
                    </View>
                  ) : (
                    <View style={S.photoOverlay}>
                      <Icon name="camera-reverse-outline" size={16} color="#FFFFFF" />
                      <Text style={S.photoOverlayText}>Fotoğrafı Değiştir</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={S.photoPlaceholderInner}>
                  <View style={[S.photoCameraCircle, { backgroundColor: C.purpleFaint }]}>
                    <Icon name="camera-outline" size={28} color={C.purple} />
                  </View>
                  <Text style={[S.photoAddTitle, { color: C.text }]}>Fotoğraf Çek</Text>
                  <Text style={[S.photoAddSub, { color: C.textMuted }]}>
                    {Platform.OS === "web"
                      ? "iOS veya Android uygulamasını kullanın"
                      : "Kamera ile olay yerinde fotoğraf çekin"}
                  </Text>
                  <View style={[S.requiredPill, { backgroundColor: "#FEE2E2" }]}>
                    <Text style={[S.requiredPillText, { color: "#DC2626" }]}>Zorunlu</Text>
                  </View>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* ── 2. Animal type ──────────────────────────────────────── */}
        <View style={S.section}>
          <SectionLabel label="Hayvan Türü" />
          <View style={S.typeRow}>
            {ANIMAL_TYPES.map((t) => {
              const isActive = animalType === t.key;
              const iconName = ANIMAL_TYPE_ICONS[t.key];
              return (
                <Pressable
                  key={t.key}
                  style={[
                    S.typeChip,
                    {
                      backgroundColor: isActive ? C.purple : C.card,
                      borderColor: isActive ? C.purple : C.borderStrong,
                      shadowColor: isActive ? C.purple : "transparent",
                    },
                  ]}
                  onPress={() => setAnimalType(t.key)}
                >
                  <Icon
                    name={iconName}
                    size={18}
                    color={isActive ? "#FFFFFF" : C.purple}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  <Text style={[S.typeChipText, { color: isActive ? "#FFFFFF" : C.text }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── 3. Status ───────────────────────────────────────────── */}
        <View style={S.section}>
          <SectionLabel label="Durum" />
          <View style={S.statusGrid}>
            {STATUSES.map((s) => {
              const isActive = status === s.key;
              return (
                <Pressable
                  key={s.key}
                  style={[
                    S.statusCard,
                    {
                      backgroundColor: isActive ? s.tintBg : C.card,
                      borderColor: isActive ? s.tintBorder : C.borderStrong,
                      shadowColor: isActive ? s.tintBorder : "transparent",
                    },
                  ]}
                  onPress={() => setStatus(s.key)}
                >
                  <View style={[S.statusIconWrap, { backgroundColor: isActive ? s.tintBg : C.purpleFaint }]}>
                    <Icon
                      name={s.icon}
                      size={18}
                      color={isActive ? s.iconColor : C.purple}
                      strokeWidth={2}
                    />
                  </View>
                  <Text style={[S.statusCardLabel, { color: isActive ? s.iconColor : C.text }]}>
                    {s.label}
                  </Text>
                  {isActive && (
                    <View style={[S.statusCheck, { backgroundColor: s.tintBorder }]}>
                      <Icon name="checkmark" size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── 4. Notes ────────────────────────────────────────────── */}
        <View style={S.section}>
          <SectionLabel label="Notlar" sub="Durumu kısaca anlat" />
          <TextInput
            style={[
              S.notesInput,
              {
                backgroundColor: C.card,
                color: C.text,
                borderColor: notesFocused ? C.purple : C.inputBorder,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
            placeholder="Örn. Ön bacağında yara var, veteriner yardımı gerekiyor..."
            placeholderTextColor={C.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── 5. Location ─────────────────────────────────────────── */}
        <View style={S.section}>
          <SectionLabel label="Konum" sub="Hayvanın görüldüğü konumu ekle" />

          {location ? (
            <View style={[S.locationSuccess, { backgroundColor: "#D1FAE5", borderColor: "#10B981" }]}>
              <Icon name="checkmark-circle" size={20} color="#065F46" />
              <View style={{ flex: 1 }}>
                <Text style={[S.locationSuccessTitle, { color: "#065F46" }]}>Konum Eklendi</Text>
                <Text style={[S.locationSuccessCoords, { color: "#34724F" }]}>
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </Text>
              </View>
              <Pressable
                onPress={getLocation}
                disabled={isLocating}
                style={[S.locationChangeBtn, { borderColor: "#10B981" }]}
              >
                {isLocating
                  ? <ActivityIndicator size="small" color="#065F46" />
                  : <Text style={[S.locationChangeBtnText, { color: "#065F46" }]}>Güncelle</Text>
                }
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[
                S.locBtn,
                { backgroundColor: C.purple, opacity: isLocating ? 0.8 : 1 },
              ]}
              onPress={getLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={S.locBtnText}>Konum alınıyor...</Text>
                </>
              ) : (
                <>
                  <Icon name="location-outline" size={20} color="white" strokeWidth={2} />
                  <Text style={S.locBtnText}>Mevcut Konumumu Kullan</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Map card */}
          <View style={[S.mapCard, { borderColor: C.border }]}>
            <MapView
              style={S.map}
              provider={PROVIDER_DEFAULT}
              region={mapRegion}
              onPress={(e) => setLocation(e.nativeEvent.coordinate)}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              {location && (
                <Marker coordinate={location}>
                  <View style={[S.mapMarker, { backgroundColor: STATUS_COLORS[status] }]}>
                    <Icon name="paw" size={13} color="white" strokeWidth={2} />
                  </View>
                </Marker>
              )}
            </MapView>

            {!location && (
              <View style={S.mapNoLocOverlay}>
                <View style={[S.mapNoLocCard, { backgroundColor: C.card }]}>
                  <Icon name="location-outline" size={20} color={C.purple} />
                  <Text style={[S.mapNoLocTitle, { color: C.text }]}>Henüz konum seçilmedi</Text>
                  <Text style={[S.mapNoLocSub, { color: C.textMuted }]}>
                    Yukarıdaki butonu kullanarak mevcut konumunu ekle
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Submit ──────────────────────────────────────────────── */}
        {(() => {
          const uploading  = photoStatus === "uploading";
          const canSubmit  = !isSaving && !uploading && photoStatus === "ready";
          return (
            <Pressable
              style={({ pressed }) => [
                S.submitBtn,
                {
                  backgroundColor: C.purple,
                  opacity: pressed || isSaving || uploading || !canSubmit ? 0.55 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={isSaving || uploading}
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : uploading ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={S.submitBtnText}>Fotoğraf yükleniyor…</Text>
                </>
              ) : (
                <>
                  <Icon name="send" size={20} color="white" strokeWidth={2.2} />
                  <Text style={S.submitBtnText}>Durumu Bildir</Text>
                </>
              )}
            </Pressable>
          );
        })()}

      </ScrollView>
    </View>
  );
}

/* ── Helper ───────────────────────────────────────────────────── */
function SectionLabel({ label, sub, note }: { label: string; sub?: string; note?: string }) {
  const C = useColors();
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[S.sectionLabel, { color: C.text }]}>{label}</Text>
        {note && (
          <Text style={[S.sectionNote, { color: "#DC2626" }]}>{note}</Text>
        )}
      </View>
      {sub && <Text style={[S.sectionSub, { color: C.textMuted }]}>{sub}</Text>}
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────── */
const S = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitles:   { flex: 1, gap: 2 },
  headerTitle:    { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  headerSpacer:   { width: 40 },

  /* Scroll */
  scroll: { padding: 20, gap: 24 },

  /* Section */
  section:      { gap: 10 },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionSub:   { fontSize: 13, fontFamily: "Inter_400Regular" },

  /* Photo card */
  photoCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: "hidden",
    minHeight: 196,
    alignItems: "stretch",
  },
  photoImage:       { width: "100%", height: 210 },
  photoRemoveBtn:   { position: "absolute", top: 12, right: 12 },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.48)",
    paddingVertical: 12,
  },
  photoOverlayText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  photoPreviewActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  photoPreviewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  photoPreviewBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  photoPlaceholderInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  photoCameraCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAddTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  photoAddSub:   { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  optionalPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 2,
  },
  optionalPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  requiredPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 2,
  },
  requiredPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  photoRequiredSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
    marginTop: -4,
  },
  photoStatusOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  photoStatusOverlayText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  sectionNote: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },

  /* Animal type chips */
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  typeChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  /* Status grid */
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minWidth: "47%",
    flex: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  statusIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCardLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statusCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Notes input */
  notesInput: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 112,
    lineHeight: 22,
  },

  /* Location */
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    height: 54,
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  locBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "white" },

  locationSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  locationSuccessTitle:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  locationSuccessCoords: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  locationChangeBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  locationChangeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  /* Map */
  mapCard: {
    borderRadius: 22,
    overflow: "hidden",
    height: 210,
    borderWidth: 1,
  },
  map: { width: "100%", height: "100%" },
  mapMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  mapNoLocOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  mapNoLocCard: {
    width: "100%",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  mapNoLocTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  mapNoLocSub:   { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  /* Submit CTA */
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 18,
    shadowColor: "#7B5EA7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "white" },
});
