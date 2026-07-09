import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE      = "#7B5EA7";
const PURPLE_DARK = "#3D2070";

interface Props {
  visible:      boolean;
  initialCaption: string;
  initialLocation: string;
  onClose:      () => void;
  onSave:       (data: { caption: string; location: string }) => Promise<void>;
}

export function EditPostModal({ visible, initialCaption, initialLocation, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [caption,  setCaption]  = useState(initialCaption);
  const [location, setLocation] = useState(initialLocation);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (visible) {
      setCaption(initialCaption);
      setLocation(initialLocation);
    }
  }, [visible, initialCaption, initialLocation]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ caption: caption.trim(), location: location.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={S.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[S.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={S.handle} />
          <View style={S.headerRow}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={S.cancel}>İptal</Text>
            </Pressable>
            <Text style={S.title}>Gönderiyi Düzenle</Text>
            <Pressable onPress={handleSave} disabled={loading} hitSlop={12}>
              {loading
                ? <ActivityIndicator size="small" color={PURPLE} />
                : <Text style={S.save}>Kaydet</Text>}
            </Pressable>
          </View>

          <Text style={S.label}>Açıklama</Text>
          <TextInput
            style={[S.input, S.captionInput]}
            value={caption}
            onChangeText={setCaption}
            placeholder="Açıklama ekle..."
            placeholderTextColor="#ABABCC"
            multiline
            maxLength={500}
          />
          <Text style={S.charCount}>{caption.length}/500</Text>

          <Text style={S.label}>Konum</Text>
          <View style={S.inputWrap}>
            <Ionicons name="location-outline" size={18} color={PURPLE} />
            <TextInput
              style={S.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Konum ekle..."
              placeholderTextColor="#ABABCC"
              maxLength={100}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(30,20,60,0.4)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#DDD", alignSelf: "center", marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20,
  },
  title:  { fontSize: 16, fontFamily: "Inter_700Bold", color: PURPLE_DARK },
  cancel: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#888" },
  save:   { fontSize: 14, fontFamily: "Inter_700Bold", color: PURPLE },

  label: {
    fontSize: 12, fontFamily: "Inter_700Bold", color: "#8888AA",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(123,94,167,0.07)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: PURPLE_DARK,
  },
  captionInput: {
    backgroundColor: "rgba(123,94,167,0.07)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 100, textAlignVertical: "top",
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: "#AAAACC",
    textAlign: "right", marginBottom: 16,
  },
});
