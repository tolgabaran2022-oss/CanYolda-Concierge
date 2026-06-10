import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdoption } from "@/contexts/AdoptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const PET_TYPES = ["Kedi", "Köpek", "Kuş", "Tavşan", "Diğer"];

export default function AddAdoptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addListing } = useAdoption();
  const { user } = useAuth();

  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("Kedi");
  const [petAge, setPetAge] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!petName.trim() || !location.trim() || !description.trim() || !contactInfo.trim()) {
      Alert.alert("Eksik Bilgi", "Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (!user) return;
    setIsSaving(true);
    try {
      await addListing({
        petName: petName.trim(),
        petType,
        petAge: petAge.trim() || undefined,
        photo,
        location: location.trim(),
        description: description.trim(),
        userId: user.id,
        userName: user.name,
        contactInfo: contactInfo.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Hata", "İlan oluşturulamadı.");
    } finally {
      setIsSaving(false);
    }
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Photo */}
      <Pressable onPress={pickPhoto}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="camera-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>
              Fotoğraf Ekle
            </Text>
          </View>
        )}
      </Pressable>

      {/* Pet name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Hayvanın Adı *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={petName}
          onChangeText={setPetName}
          placeholder="Adı"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      {/* Pet type */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Tür</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PET_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[
                styles.typeChip,
                {
                  backgroundColor: petType === t ? colors.secondary : colors.muted,
                  borderColor: petType === t ? colors.secondary : "transparent",
                },
              ]}
              onPress={() => setPetType(t)}
            >
              <Text style={[styles.typeChipText, { color: petType === t ? "white" : colors.mutedForeground }]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Age + Location */}
      <View style={styles.row2}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Yaş</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={petAge}
            onChangeText={setPetAge}
            placeholder="Örn: 1 yaş"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
        <View style={[styles.field, { flex: 2 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Konum *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={location}
            onChangeText={setLocation}
            placeholder="İlçe, Şehir"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Açıklama *</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Hayvanın karakteri, sağlık durumu, sahip olma koşulları..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Contact info */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>İletişim Bilgisi *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={contactInfo}
          onChangeText={setContactInfo}
          placeholder="Telefon veya e-posta"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address"
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: colors.secondary, opacity: pressed || isSaving ? 0.85 : 1 },
        ]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="heart-outline" size={20} color="white" />
            <Text style={styles.saveBtnText}>İlanı Yayınla</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
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
  field: { gap: 6 },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
  },
  row2: { flexDirection: "row", gap: 12 },
  typeChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  typeChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: "#6FA870",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "white" },
});
