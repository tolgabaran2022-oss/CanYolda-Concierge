import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { StatusBadge, STATUS_COLORS } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useAnimals } from "@/contexts/AnimalsContext";
import type { StrayAnimal } from "@/contexts/AnimalsContext";
import { useTheme } from "@/hooks/useTheme";
import { getDefaultAnimalImageUri } from "@/utils/animalDefaults";
import { formatTimeAgo } from "@/utils/formatters";

const C = {
  purple:  "#7B5EA7",
  purpleD: "#3D2080",
  text:    "#1A0A3C",
  muted:   "#8B8FA8",
  card:    "#FFFFFF",
  border:  "#EEE9F8",
  bg:      "#F8F9FC",
  divider: "#F4F0FC",
  red:     "#DC2626",
  redBg:   "#FEF2F2",
};

interface Props {
  animal: StrayAnimal;
  onLike?: (id: string) => void;
  index?: number;
}

/* ── Owner Action Bottom Sheet ───────────────────────────────────────────── */
function OwnerActionSheet({
  visible,
  onClose,
  onViewDetail,
  onDelete,
  title,
  viewDetailLabel,
  deleteLabel,
  cancelLabel,
}: {
  visible: boolean;
  onClose: () => void;
  onViewDetail: () => void;
  onDelete: () => void;
  title: string;
  viewDetailLabel: string;
  deleteLabel: string;
  cancelLabel: string;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={AS.overlay} onPress={onClose}>
        <Animated.View
          style={[AS.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable>
            <View style={AS.handle} />

            <Text style={AS.title}>{title}</Text>

            <View style={AS.sep} />

            <Pressable
              style={({ pressed }) => [AS.action, pressed && AS.actionPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onViewDetail();
              }}
            >
              <View style={[AS.iconWrap, { backgroundColor: `${C.purple}14` }]}>
                <Icon name="information-circle-outline" size={20} color={C.purple} />
              </View>
              <Text style={AS.actionLabel}>{viewDetailLabel}</Text>
              <Icon name="chevron-forward" size={16} color={C.muted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [AS.action, pressed && AS.actionPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDelete();
              }}
            >
              <View style={[AS.iconWrap, { backgroundColor: `${C.red}14` }]}>
                <Icon name="trash-outline" size={20} color={C.red} />
              </View>
              <Text style={[AS.actionLabel, { color: C.red }]}>{deleteLabel}</Text>
            </Pressable>

            <View style={AS.sep} />

            <Pressable
              style={({ pressed }) => [AS.cancelBtn, pressed && AS.actionPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Text style={AS.cancelLabel}>{cancelLabel}</Text>
            </Pressable>

            <View style={{ height: Platform.OS === "ios" ? 20 : 8 }} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const AS = StyleSheet.create({
  overlay:       {
    flex: 1,
    backgroundColor: "rgba(15, 5, 36, 0.45)",
    justifyContent: "flex-end",
  },
  sheet:         {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle:        {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#D5D0E0",
    alignSelf: "center",
    marginBottom: 16,
  },
  title:         {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  sep:           { height: 1, backgroundColor: "#F0EBF8", marginVertical: 8, marginHorizontal: -16 },
  action:        {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    minHeight: 56,
  },
  actionPressed: { backgroundColor: "#F7F3FD" },
  iconWrap:      {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  actionLabel:   {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  cancelBtn:     {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  cancelLabel:   {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.muted,
  },
});

/* ── AnimalCard ──────────────────────────────────────────────────────────── */
export function AnimalCard({ animal, onLike, index = 0 }: Props) {
  const { t }           = useTranslation();
  const T               = useTheme();
  const router          = useRouter();
  const { user }        = useAuth();
  const { deleteAnimal } = useAnimals();

  const [liked,        setLiked]        = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(16)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const isOwner = !!user?.id && animal.userId === user.id;

  useEffect(() => {
    const delay = Math.min(index * 60, 300);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 260, delay, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 280, delay, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn  = () => Animated.timing(pressScale, { toValue: 0.975, duration: 80,  useNativeDriver: true }).start();
  const handlePressOut = () => Animated.timing(pressScale, { toValue: 1,     duration: 150, useNativeDriver: true }).start();

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    onLike?.(animal.id);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1,   duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetVisible(true);
  };

  const handleViewDetail = () => {
    setSheetVisible(false);
    setTimeout(() => router.push(`/animal/${animal.id}` as Parameters<typeof router.push>[0]), 180);
  };

  const handleDeleteRequest = () => {
    setSheetVisible(false);
    setTimeout(() => {
      Alert.alert(
        t("animalCard.deleteAlertTitle"),
        t("animalCard.deleteAlertMsg"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: confirmDelete,
          },
        ]
      );
    }, 260);
  };

  const confirmDelete = async () => {
    if (!user?.id) return;
    setDeleting(true);
    try {
      await deleteAnimal(animal.id, user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("animalCard.deleteSuccess"));
    } catch {
      Alert.alert(t("errors.error"), t("animalCard.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const statusDotColor = STATUS_COLORS[animal.status];
  const rawImage = animal.image || animal.animalImage || "";
  const thumbUri = rawImage.trim().length > 0
    ? rawImage.trim()
    : getDefaultAnimalImageUri(animal.animalType);

  return (
    <>
      <OwnerActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onViewDetail={handleViewDetail}
        onDelete={handleDeleteRequest}
        title={t("animalCard.sheetTitle")}
        viewDetailLabel={t("animalCard.sheetViewDetail")}
        deleteLabel={t("animalCard.sheetDelete")}
        cancelLabel={t("common.cancel")}
      />

      <Animated.View
        style={[
          S.wrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: pressScale }],
            backgroundColor: T.card,
            borderColor: T.border,
          },
        ]}
      >
        {isOwner && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("animalCard.menuAccessibility")}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [
              S.menuBtn,
              pressed && { backgroundColor: `${C.purple}18` },
              deleting && { opacity: 0.4 },
            ]}
            onPress={openMenu}
            disabled={deleting}
          >
            <Icon name="ellipsis-horizontal" size={16} color={C.muted} />
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/animal/${animal.id}` as Parameters<typeof router.push>[0]);
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={S.card}
        >
          <View style={S.thumbWrap}>
            <Image
              source={{ uri: thumbUri }}
              style={S.thumb}
              contentFit="cover"
              transition={180}
            />
            <View style={[S.statusDot, { backgroundColor: statusDotColor }]} />
          </View>

          <View style={S.content}>
            <StatusBadge status={animal.status} size="sm" />
            <Text style={[S.notes, { color: T.text }]} numberOfLines={2}>
              {animal.notes || t("animalCard.noNotes")}
            </Text>
            <Text style={S.meta}>
              <Text style={S.metaName}>{animal.userName}</Text>
              <Text style={S.dot}> · </Text>
              {formatTimeAgo(animal.timestamp)}
            </Text>
            {animal.locationName ? (
              <View style={S.locRow}>
                <Icon name="location-outline" size={11} color={T.textMuted} />
                <Text style={[S.locText, { color: T.textMuted }]} numberOfLines={1}>{animal.locationName}</Text>
              </View>
            ) : null}
          </View>

          <View style={S.arrowWrap}>
            <View style={S.arrowCircle}>
              <Icon name="chevron-forward" size={13} color={C.purple} />
            </View>
          </View>
        </Pressable>

        <View style={[S.divider, { backgroundColor: T.divider }]} />
        <View style={S.interactRow}>

          <Pressable
            onPress={handleLike}
            style={({ pressed }) => [S.interactBtn, pressed && { opacity: 0.7 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Icon
                name={liked ? "heart" : "heart-outline"}
                size={17}
                color={liked ? "#EF4444" : C.muted}
              />
            </Animated.View>
            <Text style={[S.interactText, { color: T.textMuted }, liked && { color: "#EF4444" }]}>
              {animal.fedByUsers.length + (liked ? 1 : 0)}
            </Text>
          </Pressable>

          <View style={[S.interactSep, { backgroundColor: T.border }]} />

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/animal/${animal.id}` as Parameters<typeof router.push>[0]);
            }}
            style={({ pressed }) => [S.interactBtn, pressed && { opacity: 0.7 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="chatbubble-outline" size={16} color={T.textMuted} />
            <Text style={[S.interactText, { color: T.textMuted }]}>{animal.comments.length}</Text>
          </Pressable>

          <View style={[S.interactSep, { backgroundColor: T.border }]} />

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                t("animalCard.openLocationTitle"),
                animal.locationName
                  ? t("animalCard.openLocationPrompt", { locationName: animal.locationName })
                  : t("animalCard.noLocationInfo"),
                animal.locationName
                  ? [{ text: t("common.cancel"), style: "cancel" }, { text: t("animalCard.openBtn"), style: "default" }]
                  : [{ text: t("common.ok") }]
              );
            }}
            style={({ pressed }) => [S.interactBtn, pressed && { opacity: 0.7 }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="location-outline" size={16} color={T.textMuted} />
            <Text style={[S.interactText, { color: T.textMuted }]}>{t("animalCard.openLocationTitle")}</Text>
          </Pressable>

          <View style={{ flex: 1 }} />

        </View>
      </Animated.View>
    </>
  );
}

const S = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 22,
    backgroundColor: C.card,
    shadowColor: "#1E0B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },

  menuBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 14,
    paddingRight: 46,
  },

  thumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: "visible",
    flexShrink: 0,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#EDE9F8",
  },
  statusDot: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "transparent",
  },

  content: { flex: 1, gap: 5 },
  notes: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  meta: {
    fontSize: 11.5,
    fontFamily: "Inter_400Regular",
    color: C.muted,
  },
  metaName: {
    fontFamily: "Inter_500Medium",
    color: "#5C4A7A",
  },
  dot: { color: "#C0B8D8" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.muted,
    flex: 1,
  },

  arrowWrap: { justifyContent: "center" },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${C.purple}10`,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginHorizontal: 14,
  },
  interactRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: "center",
    gap: 0,
  },
  interactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  interactSep: {
    width: 1,
    height: 16,
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  interactText: {
    fontSize: 12.5,
    fontFamily: "Inter_500Medium",
    color: C.muted,
  },
});
