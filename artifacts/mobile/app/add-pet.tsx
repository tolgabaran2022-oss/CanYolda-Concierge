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
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetsContext";
import { useColors } from "@/hooks/useColors";

const PET_TYPES = ["Kedi", "Köpek", "Kuş", "Tavşan", "Balık", "Diğer"];

export default function AddPetScreen() {
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

  const pickImage = async () => {
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Hata", "Hayvanın adını giriniz.");
      return;
    }
    if (!user) return;
    setIsSaving(true);
    try {
      await addPet({
        name: name.trim(),
        type,
        breed: breed.trim() || undefined,
        age: age.trim() || undefined,
        image,
        vaccinationInfo: vaccinationInfo.trim(),
        feedingNotes: feedingNotes.trim(),
        userId: user.id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Hata", "Kaydedilemedi.");
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
            <Ionicons name="camera-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>
              Fotoğraf Ekle
            </Text>
          </View>
        )}
      </Pressable>

      {/* Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Ad *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="Hayvanın adı"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      {/* Type */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Tür</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
          {PET_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[
                styles.typeChip,
                {
                  backgroundColor: type === t ? colors.primary : colors.muted,
                  borderColor: type === t ? colors.primary : "transparent",
                },
              ]}
              onPress={() => setType(t)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  { color: type === t ? "white" : colors.mutedForeground },
                ]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Breed + Age */}
      <View style={styles.row2}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Cins</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={breed}
            onChangeText={setBreed}
            placeholder="İsteğe bağlı"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Yaş</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={age}
            onChangeText={setAge}
            placeholder="Örn: 2 yaş"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      </View>

      {/* Vaccination */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Aşı Bilgisi</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={vaccinationInfo}
          onChangeText={setVaccinationInfo}
          placeholder="Aşı durumu ve tarihleri..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Feeding notes */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Beslenme Notları</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={feedingNotes}
          onChangeText={setFeedingNotes}
          placeholder="Mama türü, porsiyon bilgisi..."
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
            <Ionicons name="checkmark-circle-outline" size={20} color="white" />
            <Text style={styles.saveBtnText}>Profil Oluştur</Text>
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
