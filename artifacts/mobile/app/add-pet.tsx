import AsyncStorage from "@react-native-async-storage/async-storage";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetsContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

const TOKEN_KEY = "@canyoldasi:jwt";

async function uploadImage(localUri: string): Promise<string> {
  const filename = localUri.split("/").pop() ?? "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1].toLowerCase().replace("jpg", "jpeg")}` : "image/jpeg";
  const formData = new FormData();
  if (Platform.OS === "web") {
    const response = await fetch(localUri);
    const blob = await response.blob();
    formData.append("image", blob, filename);
  } else {
    formData.append("image", { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  }
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData, headers });
  if (!res.ok) {
    console.error("[uploadImage] HTTP", res.status, await res.text().catch(() => ""));
    throw new Error("Fotoğraf yüklenemedi");
  }
  const data = await res.json() as { url: string };
  return data.url;
}

const PET_TYPES = ["Kedi", "Köpek", "Kuş", "Tavşan", "Balık", "Diğer"];

export default function AddPetScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addPet } = usePets();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [type, setType] = useState("Kedi");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [vaccinationInfo, setVaccinationInfo] = useState("");
  const [feedingNotes, setFeedingNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("pets.add.cameraPermTitle"), t("pets.form.cameraPermMsg"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("pets.add.galleryPermTitle"), t("pets.form.galleryPermMsg"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const pickImage = () => {
    Alert.alert(
      t("pets.add.photo"),
      t("pets.form.photoSheetMsg"),
      [
        { text: t("common.camera"), onPress: openCamera },
        { text: t("common.gallery"), onPress: openGallery },
        { text: t("common.cancel"), style: "cancel" },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error"), t("pets.form.nameRequiredMsg"));
      return;
    }
    if (!user) return;
    setIsSaving(true);
    try {
      let remoteImageUrl: string | undefined;
      if (image) {
        try {
          remoteImageUrl = await uploadImage(image);
        } catch {
          Alert.alert(
            t("pets.add.uploadFailed"),
            t("pets.form.uploadFailedMsg"),
          );
        }
      }
      await addPet({
        name: name.trim(),
        type,
        breed: breed.trim() || undefined,
        age: age.trim() || undefined,
        image: remoteImageUrl,
        vaccinationInfo: vaccinationInfo.trim(),
        feedingNotes: feedingNotes.trim(),
        userId: user.id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert(t("common.error"), t("pets.detail.saveError"));
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
      <Pressable style={styles.photoSection} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Icon name="camera-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>
              {t("pets.add.photo")}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>{t("pets.form.nameLabel")}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder={t("pets.form.namePlaceholder")}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      {/* Type */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>{t("pets.form.typeLabel")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
          {PET_TYPES.map((pt) => (
            <Pressable
              key={pt}
              style={[
                styles.typeChip,
                {
                  backgroundColor: type === pt ? colors.primary : colors.muted,
                  borderColor: type === pt ? colors.primary : "transparent",
                },
              ]}
              onPress={() => setType(pt)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  { color: type === pt ? "white" : colors.mutedForeground },
                ]}
              >
                {t(`pets.add.types.${pt}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Breed + Age */}
      <View style={styles.row2}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>{t("pets.form.breedLabel")}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={breed}
            onChangeText={setBreed}
            placeholder={t("pets.form.breedPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>{t("pets.form.ageLabel")}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={age}
            onChangeText={setAge}
            placeholder={t("pets.form.agePlaceholder")}
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      </View>

      {/* Vaccination */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>{t("pets.form.vaccinationLabel")}</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={vaccinationInfo}
          onChangeText={setVaccinationInfo}
          placeholder={t("pets.form.vaccinationPlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Feeding notes */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>{t("pets.form.feedingLabel")}</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={feedingNotes}
          onChangeText={setFeedingNotes}
          placeholder={t("pets.form.feedingPlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
        />
      </View>

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
            <Icon name="checkmark-circle-outline" size={20} color="white" />
            <Text style={styles.saveBtnText}>{t("pets.form.createProfile")}</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  photoSection: { alignItems: "center" },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
    minHeight: 80,
  },
  row2: { flexDirection: "row", gap: 12 },
  typeRow: { gap: 8, paddingVertical: 4 },
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
    shadowColor: "#E07A35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "white" },
});
