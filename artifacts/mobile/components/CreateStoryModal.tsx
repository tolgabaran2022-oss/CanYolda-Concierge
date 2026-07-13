import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
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

const C = {
  purple:     "#7B5EA7",
  purpleDark: "#4A2D8F",
  bg:         "#F9F8FF",
  white:      "#FFFFFF",
  text:       "#111827",
  muted:      "#6B7280",
  border:     "#F0EDF8",
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (imageUri: string, caption: string) => void;
}

export function CreateStoryModal({ visible, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
  };

  const reset = () => { setImage(null); setCaption(""); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!image) { Alert.alert("Fotoğraf gerekli", "Lütfen bir fotoğraf seçin veya çekin."); return; }
    onSubmit(image, caption.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[S.root, { paddingTop: insets.top + 8 }]}>
          <View style={S.header}>
            <Pressable onPress={handleClose} hitSlop={12}><Text style={S.cancel}>İptal</Text></Pressable>
            <Text style={S.title}>Hikaye Ekle</Text>
            <Pressable onPress={handleSubmit} hitSlop={12}><Text style={S.share}>Paylaş</Text></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.content}>
            {image ? (
              <Image source={{ uri: image }} style={S.preview} contentFit="cover" />
            ) : (
              <View style={S.actions}>
                <Pressable onPress={pickImage} style={S.actionBtn}>
                  <LinearGradient colors={["rgba(164,140,220,0.10)", "rgba(124,92,255,0.06)"]} style={S.actionGrad}>
                    <View style={S.actionCircle}><Icon name="images-outline" size={28} color={C.purple} /></View>
                    <Text style={S.actionLabel}>Galeriden Seç</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={takePhoto} style={S.actionBtn}>
                  <LinearGradient colors={["rgba(164,140,220,0.10)", "rgba(124,92,255,0.06)"]} style={S.actionGrad}>
                    <View style={S.actionCircle}><Icon name="camera-outline" size={28} color={C.purple} /></View>
                    <Text style={S.actionLabel}>Fotoğraf Çek</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {image && (
              <Pressable onPress={() => setImage(null)} style={S.retake}>
                <Icon name="refresh" size={16} color={C.purple} />
                <Text style={S.retakeText}>Farklı fotoğraf seç</Text>
              </Pressable>
            )}

            <View style={S.field}>
              <Text style={S.label}>Açıklama / Emoji</Text>
              <TextInput
                style={S.textArea}
                value={caption}
                onChangeText={setCaption}
                placeholder="Bir şeyler yaz..."
                placeholderTextColor="#ABABBB"
                multiline
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={S.charCount}>{caption.length}/200</Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.white },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  cancel:  { fontSize: 15, fontFamily: "Inter_400Regular", color: C.muted },
  title:   { fontSize: 16, fontFamily: "Inter_700Bold",   color: C.text  },
  share:   { fontSize: 15, fontFamily: "Inter_700Bold",   color: C.purple },
  content: { padding: 18, gap: 16 },

  actions:    { flexDirection: "row", gap: 12 },
  actionBtn:  { flex: 1 },
  actionGrad: { borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 30, borderWidth: 1.5, borderColor: "rgba(124,92,255,0.18)", borderStyle: "dashed" },
  actionCircle:{ width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(124,92,255,0.10)", alignItems: "center", justifyContent: "center" },
  actionLabel:{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.purple },

  preview:    { width: "100%", height: 420, borderRadius: 16 },
  retake:     { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center" },
  retakeText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.purple },

  field:      { gap: 8 },
  label:      { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.text, textTransform: "uppercase", letterSpacing: 0.4 },
  textArea:   { borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: C.text, minHeight: 80, backgroundColor: "#FAFAFA" },
  charCount:  { fontSize: 11, color: C.muted, textAlign: "right", fontFamily: "Inter_400Regular" },
});
