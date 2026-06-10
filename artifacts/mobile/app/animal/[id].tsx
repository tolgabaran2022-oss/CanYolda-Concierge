import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import { useAnimals } from "@/contexts/AnimalsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { formatTimeAgo } from "@/utils/formatters";

export default function AnimalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getAnimal, toggleFed, toggleNeedsHelp, addComment } = useAnimals();
  const { user } = useAuth();

  const [commentText, setCommentText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  const animal = getAnimal(id ?? "");

  if (!animal) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Hayvan bulunamadı.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const isFedByMe = user ? animal.fedByUsers.includes(user.id) : false;
  const needsHelpByMe = user ? animal.needsHelpByUsers.includes(user.id) : false;

  const handleFed = async () => {
    if (!user) return;
    await toggleFed(animal.id, user.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleNeedsHelp = async () => {
    if (!user) return;
    await toggleNeedsHelp(animal.id, user.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAddComment = async () => {
    if (!user || !commentText.trim()) return;
    setIsSendingComment(true);
    try {
      await addComment(animal.id, {
        userId: user.id,
        userName: user.name,
        text: commentText.trim(),
      });
      setCommentText("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } finally {
      setIsSendingComment(false);
    }
  };

  const mapRegion = {
    latitude: animal.latitude,
    longitude: animal.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero image */}
      <View style={styles.heroWrap}>
        {animal.image ? (
          <Image
            source={{ uri: animal.image }}
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.heroPlaceholder,
              { backgroundColor: STATUS_COLORS[animal.status] + "40" },
            ]}
          >
            <View
              style={[
                styles.heroPawCircle,
                { backgroundColor: STATUS_COLORS[animal.status] },
              ]}
            >
              <Ionicons name="paw" size={48} color="white" />
            </View>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {/* Status + time */}
        <View style={styles.topRow}>
          <StatusBadge status={animal.status} />
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {formatTimeAgo(animal.timestamp)}
          </Text>
        </View>

        {/* Reporter */}
        <View style={styles.reporterRow}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarSmallText}>
              {animal.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.reporterName, { color: colors.mutedForeground }]}>
            {animal.userName} tarafından bildirildi
          </Text>
        </View>

        {/* Notes */}
        {animal.notes ? (
          <View style={[styles.notesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.notesText, { color: colors.foreground }]}>
              {animal.notes}
            </Text>
          </View>
        ) : null}

        {/* Interaction buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isFedByMe ? colors.secondary : colors.muted,
                opacity: pressed ? 0.85 : 1,
                flex: 1,
              },
            ]}
            onPress={handleFed}
          >
            <Ionicons
              name="restaurant-outline"
              size={20}
              color={isFedByMe ? "white" : colors.secondary}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: isFedByMe ? "white" : colors.secondary },
              ]}
            >
              {isFedByMe ? "Besledim" : "Besledim"}
            </Text>
            {animal.fedByUsers.length > 0 && (
              <Text
                style={[
                  styles.actionCount,
                  { color: isFedByMe ? "rgba(255,255,255,0.8)" : colors.mutedForeground },
                ]}
              >
                {animal.fedByUsers.length}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: needsHelpByMe ? "#EF4444" : colors.muted,
                opacity: pressed ? 0.85 : 1,
                flex: 1,
              },
            ]}
            onPress={handleNeedsHelp}
          >
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={needsHelpByMe ? "white" : "#EF4444"}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: needsHelpByMe ? "white" : "#EF4444" },
              ]}
            >
              Yardım Gerek
            </Text>
            {animal.needsHelpByUsers.length > 0 && (
              <Text
                style={[
                  styles.actionCount,
                  { color: needsHelpByMe ? "rgba(255,255,255,0.8)" : colors.mutedForeground },
                ]}
              >
                {animal.needsHelpByUsers.length}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Map */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Konum
        </Text>
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            region={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker coordinate={{ latitude: animal.latitude, longitude: animal.longitude }}>
              <View
                style={[
                  styles.marker,
                  { backgroundColor: STATUS_COLORS[animal.status] },
                ]}
              >
                <Ionicons name="paw" size={14} color="white" />
              </View>
            </Marker>
          </MapView>
        </View>

        {/* Comments */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Yorumlar ({animal.comments.length})
        </Text>

        {animal.comments.length === 0 ? (
          <Text style={[styles.noComments, { color: colors.mutedForeground }]}>
            Henüz yorum yok. İlk yorumu sen yaz!
          </Text>
        ) : (
          animal.comments.map((c) => (
            <View
              key={c.id}
              style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.commentHeader}>
                <Text style={[styles.commentUser, { color: colors.primary }]}>
                  {c.userName}
                </Text>
                <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
                  {formatTimeAgo(c.timestamp)}
                </Text>
              </View>
              <Text style={[styles.commentText, { color: colors.foreground }]}>
                {c.text}
              </Text>
            </View>
          ))
        )}

        {/* Add comment */}
        <View style={[styles.commentInputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.commentInput, { color: colors.foreground }]}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Yorum yaz..."
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: commentText.trim() ? colors.primary : colors.muted,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleAddComment}
            disabled={isSendingComment || !commentText.trim()}
          >
            <Ionicons
              name="send"
              size={16}
              color={commentText.trim() ? "white" : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backLink: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  heroWrap: { width: "100%", height: 280 },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPawCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 16, gap: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 13, fontFamily: "Inter_400Regular" },
  reporterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "white" },
  reporterName: { fontSize: 13, fontFamily: "Inter_400Regular" },
  notesBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  notesText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  mapWrap: { borderRadius: 16, overflow: "hidden", height: 160 },
  map: { width: "100%", height: "100%" },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  noComments: { fontSize: 14, fontFamily: "Inter_400Regular" },
  commentCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  commentHeader: { flexDirection: "row", justifyContent: "space-between" },
  commentUser: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  commentInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 80 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
