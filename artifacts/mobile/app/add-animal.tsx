import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { STATUS_COLORS } from "@/components/StatusBadge";
import type { AnimalStatus } from "@/contexts/AnimalsContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const STATUSES: { key: AnimalStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "hungry", label: "Aç", icon: "restaurant-outline" },
  { key: "injured", label: "Yaralı", icon: "bandage-outline" },
  { key: "healthy", label: "Sağlıklı", icon: "checkmark-circle-outline" },
  { key: "unknown", label: "Bilinmiyor", icon: "help-circle-outline" },
];

const DEFAULT_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function AddAnimalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addAnimal } = useAnimals();
  const { user } = useAuth();

  const [image, setImage] = useState<string | undefined>();
  const [status, setStatus] = useState<AnimalStatus>("unknown");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locPermission, requestLocPermission] = Location.useForegroundPermissions();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    setIsLocating(true);
    try {
      if (Platform.OS !== "web" && !locPermission?.granted) {
        await requestLocPermission();
      }
      if (Platform.OS === "web") {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setIsLocating(false);
          },
          () => {
            setLocation(DEFAULT_REGION);
            setIsLocating(false);
          }
        );
      } else {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsLocating(false);
      }
    } catch {
      setLocation(DEFAULT_REGION);
      setIsLocating(false);
    }
  };

  const handleSave = async () => {
    if (!location) {
      Alert.alert("Konum Gerekli", "Lütfen hayvanın konumunu belirleyin.");
      return;
    }
    if (!user) return;
    setIsSaving(true);
    try {
      await addAnimal({
        image,
        latitude: location.latitude,
        longitude: location.longitude,
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
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Photo */}
      <Pressable style={styles.photoSection} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="camera-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>
              Fotoğraf Ekle (İsteğe Bağlı)
            </Text>
          </View>
        )}
      </Pressable>

      {/* Status selector */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Durum</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => {
            const isActive = status === s.key;
            return (
              <Pressable
                key={s.key}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: isActive ? STATUS_COLORS[s.key] : colors.muted,
                    borderColor: isActive ? STATUS_COLORS[s.key] : "transparent",
                  },
                ]}
                onPress={() => setStatus(s.key)}
              >
                <Ionicons
                  name={s.icon}
                  size={16}
                  color={isActive ? "white" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    { color: isActive ? "white" : colors.mutedForeground },
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Notlar</Text>
        <TextInput
          style={[
            styles.notesInput,
            { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Hayvan hakkında bilgi ekle (isteğe bağlı)..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Konum</Text>
        <Pressable
          style={({ pressed }) => [
            styles.locBtn,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={getLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="location-outline" size={18} color="white" />
          )}
          <Text style={styles.locBtnText}>
            {location ? "Konumu Güncelle" : "Mevcut Konumumu Kullan"}
          </Text>
        </Pressable>

        {location && (
          <Text style={[styles.coordText, { color: colors.mutedForeground }]}>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
        )}

        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            region={mapRegion}
            onPress={(e) => setLocation(e.nativeEvent.coordinate)}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {location && (
              <Marker coordinate={location}>
                <View style={[styles.mapMarker, { backgroundColor: STATUS_COLORS[status] }]}>
                  <Ionicons name="paw" size={14} color="white" />
                </View>
              </Marker>
            )}
          </MapView>
          {!location && (
            <View style={styles.mapOverlay}>
              <Text style={[styles.mapOverlayText, { color: colors.mutedForeground }]}>
                Konum seçmek için yukarıdaki butonu kullan
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Save button */}
      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.primary, opacity: pressed || isSaving ? 0.85 : 1 },
        ]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="white" />
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  photoSection: {},
  photo: { width: "100%", height: 200, borderRadius: 16 },
  photoPlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoHint: { fontSize: 14, fontFamily: "Inter_400Regular" },
  section: { gap: 8 },
  sectionLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
  },
  statusChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 90,
  },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  locBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "white" },
  coordText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  mapWrap: { borderRadius: 16, overflow: "hidden", height: 180 },
  map: { width: "100%", height: "100%" },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapOverlayText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", paddingHorizontal: 20 },
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: "#E07A35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "white" },
});
